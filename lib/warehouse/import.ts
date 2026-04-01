import type { Prisma, PrismaClient } from '@prisma/client';
import { FulfillmentOrderSource, FulfillmentOrderStatus, Prisma as PrismaNs } from '@prisma/client';
import { mergeImportedOrderStatus, orderStatusTimestampsPatch } from '@/lib/warehouse/transitions';

type TxClient = Prisma.TransactionClient | PrismaClient;

export type WarehouseImportLineInput = {
  sku: string;
  title?: string;
  quantity: number;
  itemId?: string | null;
};

export type WarehouseImportCustomerInput = {
  externalRef?: string | null;
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type WarehouseImportOrderInput = {
  orderNumber: string;
  sourceOrderId?: string | null;
  source: FulfillmentOrderSource;
  status?: FulfillmentOrderStatus;
  currency?: string | null;
  subtotal?: number | null;
  shippingCost?: number | null;
  totalAmount?: number | null;
  notes?: string | null;
  importPayload?: PrismaNs.InputJsonValue | null;
  customer?: WarehouseImportCustomerInput | null;
  lines: WarehouseImportLineInput[];
};

export class WarehouseImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WarehouseImportValidationError';
  }
}

function sanitizeOrder(input: WarehouseImportOrderInput): WarehouseImportOrderInput {
  const orderNumber = String(input.orderNumber ?? '').trim();
  if (!orderNumber) {
    throw new WarehouseImportValidationError('orderNumber fehlt');
  }

  const lines = (input.lines ?? []).map((line) => ({
    sku: String(line.sku ?? '').trim(),
    title: line.title ? String(line.title).trim() : undefined,
    quantity: Number(line.quantity),
    itemId: line.itemId ?? null,
  }));

  if (!lines.length) {
    throw new WarehouseImportValidationError(`Order ${orderNumber}: keine Positionen`);
  }

  lines.forEach((line, idx) => {
    if (!line.sku) {
      throw new WarehouseImportValidationError(`Order ${orderNumber}: SKU fehlt in Zeile ${idx + 1}`);
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new WarehouseImportValidationError(
        `Order ${orderNumber}: ungueltige Menge in Zeile ${idx + 1}`
      );
    }
  });

  return {
    ...input,
    orderNumber,
    sourceOrderId: input.sourceOrderId ? String(input.sourceOrderId).trim() : null,
    source: input.source,
    status: input.status ?? FulfillmentOrderStatus.IMPORTED,
    currency: input.currency ? String(input.currency).trim() : 'EUR',
    subtotal: input.subtotal ?? null,
    shippingCost: input.shippingCost ?? null,
    totalAmount: input.totalAmount ?? null,
    notes: input.notes ? String(input.notes).trim() : null,
    lines,
    customer: input.customer
      ? {
          externalRef: input.customer.externalRef ? String(input.customer.externalRef).trim() : null,
          name: input.customer.name ? String(input.customer.name).trim() : null,
          companyName: input.customer.companyName
            ? String(input.customer.companyName).trim()
            : null,
          email: input.customer.email ? String(input.customer.email).trim().toLowerCase() : null,
          phone: input.customer.phone ? String(input.customer.phone).trim() : null,
        }
      : null,
  };
}

async function resolveCustomerId(
  tx: TxClient,
  ventureId: string,
  customer?: WarehouseImportCustomerInput | null
): Promise<string | null> {
  if (!customer) return null;
  const hasAnyData =
    customer.externalRef || customer.email || customer.name || customer.companyName || customer.phone;
  if (!hasAnyData) return null;

  const whereCandidates: Prisma.CustomerAccountWhereInput[] = [];
  if (customer.externalRef) {
    whereCandidates.push({ externalRef: customer.externalRef });
  }
  if (customer.email) {
    whereCandidates.push({ email: customer.email });
  }

  const existing =
    whereCandidates.length > 0
      ? await tx.customerAccount.findFirst({
          where: {
            ventureId,
            OR: whereCandidates,
          },
          select: { id: true },
        })
      : null;

  if (existing) {
    await tx.customerAccount.update({
      where: { id: existing.id },
      data: {
        name: customer.name ?? undefined,
        companyName: customer.companyName ?? undefined,
        email: customer.email ?? undefined,
        phone: customer.phone ?? undefined,
        externalRef: customer.externalRef ?? undefined,
      },
    });
    return existing.id;
  }

  const created = await tx.customerAccount.create({
    data: {
      ventureId,
      name: customer.name || customer.companyName || 'Unbekannter Kunde',
      companyName: customer.companyName ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      externalRef: customer.externalRef ?? null,
      type: customer.companyName ? 'BUSINESS' : 'PRIVATE',
    },
    select: { id: true },
  });

  return created.id;
}

async function resolveLineItemBindings(
  tx: TxClient,
  ventureId: string,
  lines: WarehouseImportLineInput[]
): Promise<Array<WarehouseImportLineInput & { itemId: string | null }>> {
  const skus = Array.from(new Set(lines.map((l) => l.sku)));
  const items = await tx.warehouseItem.findMany({
    where: { ventureId, sku: { in: skus } },
    select: { id: true, sku: true },
  });
  const skuToItemId = new Map(items.map((i) => [i.sku, i.id]));

  return lines.map((line) => ({
    ...line,
    itemId: line.itemId ?? skuToItemId.get(line.sku) ?? null,
  }));
}

export async function recordWarehouseImportError(
  tx: TxClient,
  params: {
    ventureId: string;
    provider: FulfillmentOrderSource;
    sourceEntity: string;
    sourceEntityId?: string | null;
    payload?: PrismaNs.InputJsonValue | null;
    errorMessage: string;
  }
): Promise<void> {
  await tx.warehouseImportError.create({
    data: {
      ventureId: params.ventureId,
      provider: params.provider,
      sourceEntity: params.sourceEntity,
      sourceEntityId: params.sourceEntityId ?? null,
      payload: params.payload ?? undefined,
      errorMessage: params.errorMessage,
    },
  });
}

export async function upsertImportedOrder(
  tx: TxClient,
  ventureId: string,
  userId: string,
  rawInput: WarehouseImportOrderInput
): Promise<{ orderId: string; created: boolean; status: FulfillmentOrderStatus }> {
  const input = sanitizeOrder(rawInput);
  const customerId = await resolveCustomerId(tx, ventureId, input.customer);
  const lines = await resolveLineItemBindings(tx, ventureId, input.lines);

  const existing = input.sourceOrderId
    ? await tx.fulfillmentOrder.findFirst({
        where: {
          ventureId,
          source: input.source,
          sourceOrderId: input.sourceOrderId,
        },
        select: { id: true, status: true },
      })
    : await tx.fulfillmentOrder.findFirst({
        where: {
          ventureId,
          orderNumber: input.orderNumber,
        },
        select: { id: true, status: true },
      });

  if (!existing) {
    const created = await tx.fulfillmentOrder.create({
      data: {
        ventureId,
        orderNumber: input.orderNumber,
        source: input.source,
        sourceOrderId: input.sourceOrderId ?? null,
        status: input.status ?? FulfillmentOrderStatus.IMPORTED,
        currency: input.currency ?? 'EUR',
        subtotal: input.subtotal ?? null,
        shippingCost: input.shippingCost ?? null,
        totalAmount: input.totalAmount ?? null,
        notes: input.notes ?? null,
        importPayload: input.importPayload ?? undefined,
        customerId,
        createdById: userId,
        lines: {
          create: lines.map((line) => ({
            itemId: line.itemId,
            sku: line.sku,
            title: line.title || line.sku,
            quantity: line.quantity,
          })),
        },
      },
      select: { id: true, status: true },
    });

    return { orderId: created.id, created: true, status: created.status };
  }

  const mergedStatus = mergeImportedOrderStatus(existing.status, input.status ?? FulfillmentOrderStatus.IMPORTED);
  const statusPatch = orderStatusTimestampsPatch(existing.status, mergedStatus);

  const updated = await tx.fulfillmentOrder.update({
    where: { id: existing.id },
    data: {
      source: input.source,
      sourceOrderId: input.sourceOrderId ?? null,
      status: mergedStatus,
      ...statusPatch,
      currency: input.currency ?? 'EUR',
      subtotal: input.subtotal ?? null,
      shippingCost: input.shippingCost ?? null,
      totalAmount: input.totalAmount ?? null,
      notes: input.notes ?? null,
      importPayload: input.importPayload ?? undefined,
      customerId,
    },
    select: { id: true, status: true },
  });

  await tx.fulfillmentOrderLine.deleteMany({ where: { orderId: existing.id } });
  await tx.fulfillmentOrderLine.createMany({
    data: lines.map((line) => ({
      orderId: existing.id,
      itemId: line.itemId,
      sku: line.sku,
      title: line.title || line.sku,
      quantity: line.quantity,
      status: 'OPEN',
    })),
  });

  return { orderId: updated.id, created: false, status: updated.status };
}
