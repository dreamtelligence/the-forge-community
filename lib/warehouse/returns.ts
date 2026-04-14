import { ReturnStatus } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import {
  parseReturnStatusParam,
  parseWarehouseQuantity,
  WarehouseReturnValidationError,
} from '@/lib/warehouse/contracts';
import {
  canTransitionReturnStatus,
  returnStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';

export { parseReturnStatusParam, WarehouseReturnValidationError };

export type ReturnItemFilters = {
  status?: unknown;
  orderId?: string | null;
  take: number;
};

export async function listReturnItems(ventureId: string, filters: ReturnItemFilters) {
  const status = parseReturnStatusParam(filters.status);
  const orderId = filters.orderId?.trim();

  return prisma.returnItem.findMany({
    where: {
      ventureId,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
    },
    include: {
      order: {
        select: { id: true, orderNumber: true, status: true },
      },
      orderLine: {
        select: { id: true, sku: true, title: true },
      },
      handledBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: filters.take,
  });
}

export async function createReturnItem(
  ventureId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) {
    throw new WarehouseReturnValidationError('MISSING_ORDER_ID', 'orderId ist erforderlich');
  }

  const order = await prisma.fulfillmentOrder.findFirst({
    where: { id: orderId, ventureId },
    include: { lines: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order) {
    throw new WarehouseReturnValidationError('ORDER_NOT_FOUND', 'Order nicht gefunden');
  }

  let orderLineId: string | null = null;
  if (typeof body.orderLineId === 'string' && body.orderLineId.trim()) {
    const requestedOrderLineId = body.orderLineId.trim();
    const line = order.lines.find((entry) => entry.id === requestedOrderLineId);
    if (!line) {
      throw new WarehouseReturnValidationError(
        'INVALID_ORDER_LINE',
        'orderLineId ist ungueltig'
      );
    }
    orderLineId = line.id;
  } else if (order.lines.length > 0) {
    orderLineId = order.lines[0].id;
  }

  const status = parseReturnStatusParam(body.status) ?? ReturnStatus.RECEIVED;
  if (!canTransitionReturnStatus(ReturnStatus.ANNOUNCED, status)) {
    throw new WarehouseReturnValidationError(
      'INVALID_STATUS',
      'Ungueltiger initialer Return-Status'
    );
  }

  const quantity = parseWarehouseQuantity(body.quantity, { fallback: 1, min: 1 });

  return prisma.returnItem.create({
    data: {
      ventureId,
      orderId: order.id,
      orderLineId,
      status,
      quantity,
      reason: typeof body.reason === 'string' ? body.reason : null,
      conditionNote: typeof body.conditionNote === 'string' ? body.conditionNote : null,
      handledById: userId,
      ...returnStatusTimestampsPatch(ReturnStatus.ANNOUNCED, status),
    },
    include: {
      order: { select: { id: true, orderNumber: true, status: true } },
      orderLine: { select: { id: true, sku: true, title: true } },
    },
  });
}

export async function updateReturnItem(
  ventureId: string,
  returnId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const nextStatus = parseReturnStatusParam(body.status);

  const existing = await prisma.returnItem.findFirst({
    where: { id: returnId, ventureId },
    select: { id: true, status: true },
  });
  if (!existing) {
    throw new WarehouseReturnValidationError('RETURN_NOT_FOUND', 'Return nicht gefunden');
  }

  if (nextStatus && !canTransitionReturnStatus(existing.status, nextStatus)) {
    throw new WarehouseReturnValidationError(
      'INVALID_STATUS_TRANSITION',
      'Ungueltiger Return-Statuswechsel'
    );
  }

  return prisma.returnItem.update({
    where: { id: existing.id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextStatus ? returnStatusTimestampsPatch(existing.status, nextStatus) : {}),
      ...(body.reason !== undefined ? { reason: body.reason ? String(body.reason) : null } : {}),
      ...(body.conditionNote !== undefined
        ? { conditionNote: body.conditionNote ? String(body.conditionNote) : null }
        : {}),
      ...(body.quantity !== undefined && Number.isFinite(body.quantity)
        ? { quantity: Math.max(1, Math.trunc(Number(body.quantity))) }
        : {}),
      handledById: userId,
    },
    include: {
      order: { select: { id: true, orderNumber: true, status: true } },
      orderLine: { select: { id: true, sku: true, title: true } },
    },
  });
}
