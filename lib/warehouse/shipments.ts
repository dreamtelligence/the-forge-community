import {
  CarrierType,
  FulfillmentLineStatus,
  FulfillmentOrderStatus,
  ShipmentStatus,
} from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import {
  parseCarrierTypeParam,
  parseShipmentStatusParam,
  WarehouseShipmentValidationError,
} from '@/lib/warehouse/contracts';
import {
  canTransitionOrderStatus,
  orderStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';

export {
  parseShipmentStatusParam,
  WarehouseShipmentValidationError,
};

export type ShipmentFilters = {
  status?: string | null;
  orderId?: string | null;
};

export async function listShipments(ventureId: string, filters: ShipmentFilters) {
  const status = parseShipmentStatusParam(filters.status ?? null);
  const orderId = filters.orderId?.trim();

  return prisma.shipment.findMany({
    where: {
      ventureId,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
    },
    include: {
      order: {
        select: { id: true, orderNumber: true, status: true, source: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function createShipment(
  ventureId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const carrier = parseCarrierTypeParam(body.carrier) ?? CarrierType.OTHER;
  const trackingNumber =
    typeof body.trackingNumber === 'string' ? body.trackingNumber.trim() : null;
  const labelUrl = typeof body.labelUrl === 'string' ? body.labelUrl.trim() : null;
  const markOrderShipped = body.markOrderShipped !== false;
  const allowNegativeStock = Boolean(body.allowNegativeStock);
  const allowUnpickedShip = body.allowUnpickedShip === true;

  if (!orderId) {
    throw new WarehouseShipmentValidationError('MISSING_ORDER_ID', 'orderId ist erforderlich');
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.fulfillmentOrder.findFirst({
      where: { id: orderId, ventureId },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
        shipments: true,
      },
    });

    if (!order) {
      throw new WarehouseShipmentValidationError('ORDER_NOT_FOUND', 'Order nicht gefunden');
    }
    if (order.status === FulfillmentOrderStatus.CANCELLED) {
      throw new WarehouseShipmentValidationError(
        'ORDER_CANCELLED',
        'Stornierte Orders können nicht versendet werden'
      );
    }

    if (trackingNumber) {
      const existingByTracking = order.shipments.find(
        (shipment) => shipment.trackingNumber === trackingNumber
      );
      if (existingByTracking) {
        return { shipment: existingByTracking, reused: true };
      }
    }

    if (markOrderShipped && order.status === FulfillmentOrderStatus.COMPLETED) {
      throw new WarehouseShipmentValidationError(
        'ORDER_COMPLETED',
        'Abgeschlossene Orders können nicht erneut versendet werden'
      );
    }
    if (markOrderShipped && order.status === FulfillmentOrderStatus.SHIPPED) {
      throw new WarehouseShipmentValidationError(
        'ORDER_ALREADY_SHIPPED',
        'Order wurde bereits als versendet markiert'
      );
    }

    const shippableStatuses: FulfillmentOrderStatus[] = [
      FulfillmentOrderStatus.PACKED,
      FulfillmentOrderStatus.PICKING,
      FulfillmentOrderStatus.READY_TO_PICK,
    ];
    if (markOrderShipped && !shippableStatuses.includes(order.status)) {
      throw new WarehouseShipmentValidationError(
        'ORDER_NOT_READY_TO_SHIP',
        'Order ist noch nicht versandbereit (mindestens READY_TO_PICK erforderlich)'
      );
    }

    if (markOrderShipped && !allowUnpickedShip) {
      const incomplete = order.lines.filter((line) => line.pickedQuantity < line.quantity);
      if (incomplete.length > 0) {
        const skuHint = incomplete
          .map((line) => line.sku)
          .slice(0, 3)
          .join(', ');
        throw new WarehouseShipmentValidationError(
          'ORDER_NOT_FULLY_PICKED',
          `Order ist noch nicht vollstaendig gepickt${skuHint ? ` (${skuHint})` : ''}`
        );
      }
    }

    const shipment = await tx.shipment.create({
      data: {
        ventureId,
        orderId: order.id,
        carrier,
        trackingNumber,
        labelUrl,
        status: markOrderShipped ? ShipmentStatus.HANDED_OVER : ShipmentStatus.CREATED,
        shippedAt: markOrderShipped ? new Date() : null,
        metadata: body.metadata ?? undefined,
        createdById: userId,
      },
    });

    if (markOrderShipped) {
      for (const line of order.lines) {
        if (!line.itemId) continue;

        const previousQty = line.item?.quantityOnHand ?? 0;
        const newQty = previousQty - line.quantity;
        if (!allowNegativeStock && newQty < 0) {
          throw new WarehouseShipmentValidationError(
            'INSUFFICIENT_STOCK',
            `Nicht genug Bestand fuer SKU ${line.sku}`
          );
        }

        await tx.warehouseItem.update({
          where: { id: line.itemId },
          data: { quantityOnHand: newQty },
        });

        await tx.inventoryTransaction.create({
          data: {
            ventureId,
            itemId: line.itemId,
            type: 'OUT',
            quantity: line.quantity,
            previousQty,
            newQty,
            referenceType: 'ORDER_SHIPMENT',
            referenceId: `shipment:${shipment.id}:line:${line.id}`,
            createdById: userId,
          },
        });
      }

      for (const line of order.lines) {
        await tx.fulfillmentOrderLine.update({
          where: { id: line.id },
          data: {
            pickedQuantity: Math.max(line.pickedQuantity, line.quantity),
            packedQuantity: Math.max(line.packedQuantity, line.quantity),
            status: FulfillmentLineStatus.SHIPPED,
          },
        });
      }
    } else {
      for (const line of order.lines) {
        await tx.fulfillmentOrderLine.update({
          where: { id: line.id },
          data: {
            packedQuantity: Math.max(line.packedQuantity, line.quantity),
            status: FulfillmentLineStatus.PACKED,
          },
        });
      }
    }

    if (
      markOrderShipped &&
      canTransitionOrderStatus(order.status, FulfillmentOrderStatus.SHIPPED)
    ) {
      await tx.fulfillmentOrder.update({
        where: { id: order.id },
        data: {
          status: FulfillmentOrderStatus.SHIPPED,
          ...orderStatusTimestampsPatch(order.status, FulfillmentOrderStatus.SHIPPED),
          packedAt: order.packedAt ?? new Date(),
        },
      });
    }

    return { shipment, reused: false };
  });
}
