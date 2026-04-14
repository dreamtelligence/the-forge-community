import {
  FulfillmentOrderSource,
  FulfillmentOrderStatus,
  Prisma as PrismaNs,
} from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import {
  parseFulfillmentOrderSourceParam,
  parseFulfillmentOrderStatusParam,
  WarehouseOrderValidationError,
} from '@/lib/warehouse/contracts';
import {
  type WarehouseImportLineInput,
  upsertImportedOrder,
  WarehouseImportValidationError,
} from '@/lib/warehouse/import';
import {
  canTransitionOrderStatus,
  orderStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';

export {
  WarehouseImportValidationError,
  WarehouseOrderValidationError,
  parseFulfillmentOrderSourceParam,
  parseFulfillmentOrderStatusParam,
};

export type FulfillmentOrderFilters = {
  status?: FulfillmentOrderStatus;
  source?: FulfillmentOrderSource;
  query?: string | null;
};

export async function listFulfillmentOrders(
  ventureId: string,
  filters: FulfillmentOrderFilters = {}
) {
  const query = filters.query?.trim();

  return prisma.fulfillmentOrder.findMany({
    where: {
      ventureId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(query
        ? {
            OR: [
              { orderNumber: { contains: query, mode: 'insensitive' } },
              { sourceOrderId: { contains: query, mode: 'insensitive' } },
              { customer: { name: { contains: query, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true, companyName: true },
      },
      lines: {
        orderBy: { createdAt: 'asc' },
      },
      shipments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          carrier: true,
          trackingNumber: true,
          status: true,
          shippedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ importedAt: 'desc' }],
  });
}

export async function createFulfillmentOrder(
  ventureId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const source =
    parseFulfillmentOrderSourceParam(
      typeof body.source === 'string' ? body.source : null
    ) ?? FulfillmentOrderSource.MANUAL;
  const status =
    parseFulfillmentOrderStatusParam(
      typeof body.status === 'string' ? body.status : null
    ) ?? FulfillmentOrderStatus.IMPORTED;

  const linesRaw: WarehouseImportLineInput[] = Array.isArray(body.lines)
    ? body.lines.map((line) => {
        const candidate = (line ?? {}) as Record<string, unknown>;
        return {
          sku: String(candidate.sku ?? '').trim(),
          title: candidate.title ? String(candidate.title) : undefined,
          quantity: Number(candidate.quantity),
          itemId: candidate.itemId ? String(candidate.itemId) : null,
        };
      })
    : [];
  if (!linesRaw.length) {
    throw new WarehouseImportValidationError('Mindestens eine Order-Position ist erforderlich');
  }

  return prisma.$transaction(async (tx) => {
    const result = await upsertImportedOrder(tx, ventureId, userId, {
      orderNumber: String(body.orderNumber ?? '').trim(),
      sourceOrderId: body.sourceOrderId ? String(body.sourceOrderId) : null,
      source,
      status,
      currency: body.currency ? String(body.currency) : 'EUR',
      subtotal: Number.isFinite(body.subtotal) ? Number(body.subtotal) : null,
      shippingCost: Number.isFinite(body.shippingCost) ? Number(body.shippingCost) : null,
      totalAmount: Number.isFinite(body.totalAmount) ? Number(body.totalAmount) : null,
      notes: body.notes ? String(body.notes) : null,
      importPayload: body.importPayload ?? (body as PrismaNs.InputJsonValue),
      customer: (body.customer as Record<string, unknown> | null | undefined) ?? null,
      lines: linesRaw,
    });

    return tx.fulfillmentOrder.findUnique({
      where: { id: result.orderId },
      include: {
        customer: true,
        lines: true,
      },
    });
  });
}

export async function updateFulfillmentOrder(
  ventureId: string,
  orderId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const nextStatus =
    parseFulfillmentOrderStatusParam(typeof body.status === 'string' ? body.status : null);
  let nextCustomerId: string | null | undefined = undefined;

  if (body.customerId !== undefined) {
    if (!body.customerId) {
      nextCustomerId = null;
    } else {
      const customerId = String(body.customerId).trim();
      const customer = await prisma.customerAccount.findFirst({
        where: {
          id: customerId,
          ventureId,
        },
        select: { id: true },
      });
      if (!customer) {
        throw new WarehouseOrderValidationError(
          'INVALID_CUSTOMER_ID',
          'customerId ist ungueltig'
        );
      }
      nextCustomerId = customer.id;
    }
  }

  const current = await prisma.fulfillmentOrder.findFirst({
    where: { id: orderId, ventureId },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new WarehouseOrderValidationError('ORDER_NOT_FOUND', 'Order nicht gefunden');
  }

  if (nextStatus && !canTransitionOrderStatus(current.status, nextStatus)) {
    throw new WarehouseOrderValidationError(
      'INVALID_STATUS_TRANSITION',
      `Ungueltiger Statuswechsel: ${current.status} -> ${nextStatus}`
    );
  }

  const statusPatch = nextStatus ? orderStatusTimestampsPatch(current.status, nextStatus) : {};

  return prisma.fulfillmentOrder.update({
    where: { id: current.id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...statusPatch,
      ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
      ...(nextCustomerId !== undefined ? { customerId: nextCustomerId } : {}),
    },
    include: {
      customer: true,
      lines: true,
      shipments: true,
    },
  });
}

export async function deleteFulfillmentOrder(ventureId: string, orderId: string) {
  const order = await prisma.fulfillmentOrder.findFirst({
    where: { id: orderId, ventureId },
    include: {
      shipments: { select: { id: true } },
      pickLists: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        select: { id: true },
      },
    },
  });

  if (!order) {
    throw new WarehouseOrderValidationError('ORDER_NOT_FOUND', 'Order nicht gefunden');
  }

  if (order.shipments.length > 0) {
    throw new WarehouseOrderValidationError(
      'ORDER_HAS_SHIPMENTS',
      'Order kann nicht geloescht werden, da bereits Sendungen existieren'
    );
  }
  if (order.pickLists.length > 0) {
    throw new WarehouseOrderValidationError(
      'ORDER_HAS_ACTIVE_PICKLISTS',
      'Order kann nicht geloescht werden, da aktive Picklisten existieren'
    );
  }
  if (!['IMPORTED', 'READY_TO_PICK', 'CANCELLED'].includes(order.status)) {
    throw new WarehouseOrderValidationError(
      'ORDER_STATUS_LOCKED',
      `Order im Status ${order.status} darf nicht geloescht werden`
    );
  }

  await prisma.fulfillmentOrder.delete({
    where: { id: order.id },
  });
}
