import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  CarrierType,
  FulfillmentOrderStatus,
  FulfillmentLineStatus,
  ShipmentStatus,
} from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import { canTransitionOrderStatus, orderStatusTimestampsPatch } from '@/lib/warehouse/transitions';

function parseCarrier(value: unknown): CarrierType {
  if (typeof value !== 'string') return CarrierType.OTHER;
  return Object.values(CarrierType).includes(value as CarrierType)
    ? (value as CarrierType)
    : CarrierType.OTHER;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    const carrier = parseCarrier(body?.carrier);
    const trackingNumber =
      typeof body?.trackingNumber === 'string' ? body.trackingNumber.trim() : null;
    const labelUrl = typeof body?.labelUrl === 'string' ? body.labelUrl.trim() : null;
    const markOrderShipped = body?.markOrderShipped !== false;
    const allowNegativeStock = Boolean(body?.allowNegativeStock);

    if (!orderId) {
      return NextResponse.json({ error: 'orderId ist erforderlich' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.fulfillmentOrder.findFirst({
        where: { id: orderId, ventureId: id },
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
        throw new Error('ORDER_NOT_FOUND');
      }
      if (order.status === FulfillmentOrderStatus.CANCELLED) {
        throw new Error('ORDER_CANCELLED');
      }

      if (trackingNumber) {
        const existingByTracking = order.shipments.find((s) => s.trackingNumber === trackingNumber);
        if (existingByTracking) {
          return { shipment: existingByTracking, reused: true };
        }
      }

      if (markOrderShipped && order.status === FulfillmentOrderStatus.COMPLETED) {
        throw new Error('ORDER_COMPLETED');
      }
      if (markOrderShipped && order.status === FulfillmentOrderStatus.SHIPPED) {
        throw new Error('ORDER_ALREADY_SHIPPED');
      }
      const shippableStatuses: FulfillmentOrderStatus[] = [
        FulfillmentOrderStatus.PACKED,
        FulfillmentOrderStatus.PICKING,
        FulfillmentOrderStatus.READY_TO_PICK,
      ];

      if (markOrderShipped && !shippableStatuses.includes(order.status)) {
        throw new Error('ORDER_NOT_READY_TO_SHIP');
      }

      if (markOrderShipped && body?.allowUnpickedShip !== true) {
        const incomplete = order.lines.filter((line) => line.pickedQuantity < line.quantity);
        if (incomplete.length > 0) {
          const skus = incomplete.map((line) => line.sku).slice(0, 3).join(', ');
          throw new Error(`ORDER_NOT_FULLY_PICKED:${skus}`);
        }
      }

      const shipment = await tx.shipment.create({
        data: {
          ventureId: id,
          orderId: order.id,
          carrier,
          trackingNumber,
          labelUrl,
          status: markOrderShipped ? ShipmentStatus.HANDED_OVER : ShipmentStatus.CREATED,
          shippedAt: markOrderShipped ? new Date() : null,
          metadata: body?.metadata ?? undefined,
          createdById: access.userId,
        },
      });

      if (markOrderShipped) {
        for (const line of order.lines) {
          if (!line.itemId) continue;

          const previousQty = line.item?.quantityOnHand ?? 0;
          const newQty = previousQty - line.quantity;
          if (!allowNegativeStock && newQty < 0) {
            throw new Error(`INSUFFICIENT_STOCK:${line.sku}`);
          }

          await tx.warehouseItem.update({
            where: { id: line.itemId },
            data: { quantityOnHand: newQty },
          });

          await tx.inventoryTransaction.create({
            data: {
              ventureId: id,
              itemId: line.itemId,
              type: 'OUT',
              quantity: line.quantity,
              previousQty,
              newQty,
              referenceType: 'ORDER_SHIPMENT',
              referenceId: `shipment:${shipment.id}:line:${line.id}`,
              createdById: access.userId,
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

      if (markOrderShipped && canTransitionOrderStatus(order.status, FulfillmentOrderStatus.SHIPPED)) {
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

    return NextResponse.json(result, { status: result.reused ? 200 : 201 });
  } catch (error: any) {
      if (error instanceof Error) {
        if (error.message === 'ORDER_NOT_FOUND') {
          return NextResponse.json({ error: 'Order nicht gefunden' }, { status: 404 });
        }
        if (error.message === 'ORDER_CANCELLED') {
          return NextResponse.json({ error: 'Stornierte Orders können nicht versendet werden' }, { status: 409 });
        }
        if (error.message === 'ORDER_COMPLETED') {
          return NextResponse.json({ error: 'Abgeschlossene Orders können nicht erneut versendet werden' }, { status: 409 });
        }
        if (error.message === 'ORDER_ALREADY_SHIPPED') {
          return NextResponse.json({ error: 'Order wurde bereits als versendet markiert' }, { status: 409 });
        }
        if (error.message === 'ORDER_NOT_READY_TO_SHIP') {
          return NextResponse.json({ error: 'Order ist noch nicht versandbereit (mindestens READY_TO_PICK erforderlich)' }, { status: 409 });
        }
        if (error.message.startsWith('ORDER_NOT_FULLY_PICKED:')) {
          const skuHint = error.message.split(':')[1] || '';
          return NextResponse.json(
            { error: `Order ist noch nicht vollstaendig gepickt${skuHint ? ` (${skuHint})` : ''}` },
            { status: 409 }
          );
        }
        if (error.message.startsWith('INSUFFICIENT_STOCK:')) {
          const sku = error.message.split(':')[1];
          return NextResponse.json({ error: `Nicht genug Bestand fuer SKU ${sku}` }, { status: 409 });
        }
      }

    console.error('Failed to create shipment:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
