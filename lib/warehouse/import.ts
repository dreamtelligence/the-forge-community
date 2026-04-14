import type { Prisma, PrismaClient } from '@prisma/client';
import {
  FulfillmentOrderSource,
  FulfillmentOrderStatus,
  IntegrationProvider,
  Prisma as PrismaNs,
} from '@prisma/client';
import { deserializeAndDecrypt } from '@/lib/integrations/crypto';
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

type WarehouseImportSummaryEntry = {
  orderId?: string;
  orderNumber?: string;
  error: string;
};

export type WarehouseImportSummary = {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: WarehouseImportSummaryEntry[];
};

async function getPrismaClient() {
  const { prisma } = await import('../database/prisma');
  return prisma;
}

type ShopifyOrder = {
  id: number | string;
  name?: string;
  order_number?: number;
  currency?: string;
  total_price?: string;
  subtotal_price?: string;
  total_shipping_price_set?: { shop_money?: { amount?: string } };
  total_shipping_price?: string;
  note?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  customer?: {
    id?: number | string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null;
  line_items?: Array<{
    id?: number | string;
    sku?: string;
    title?: string;
    quantity?: number;
  }>;
};

type WooOrder = {
  id: number | string;
  number?: string | number;
  status?: string;
  currency?: string;
  total?: string;
  shipping_total?: string;
  subtotal?: string;
  customer_id?: number | string | null;
  billing?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    email?: string;
    phone?: string;
  } | null;
  line_items?: Array<{
    id?: number | string;
    sku?: string;
    name?: string;
    quantity?: number;
    product_id?: number | string;
  }>;
};

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

function defaultImportSummary(total: number): WarehouseImportSummary {
  return {
    total,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
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

function parseImportedOrderStatus(value: unknown): FulfillmentOrderStatus {
  if (typeof value !== 'string') return FulfillmentOrderStatus.IMPORTED;
  return Object.values(FulfillmentOrderStatus).includes(value as FulfillmentOrderStatus)
    ? (value as FulfillmentOrderStatus)
    : FulfillmentOrderStatus.IMPORTED;
}

async function importMappedOrders(
  ventureId: string,
  userId: string,
  provider: FulfillmentOrderSource,
  orders: Array<{
    sourceOrder: unknown;
    mappedOrder: WarehouseImportOrderInput;
    orderId?: string;
    orderNumber?: string;
  }>
): Promise<WarehouseImportSummary> {
  const prisma = await getPrismaClient();
  const summary = defaultImportSummary(orders.length);

  for (const entry of orders) {
    try {
      const result = await prisma.$transaction(async (tx) =>
        upsertImportedOrder(tx, ventureId, userId, entry.mappedOrder)
      );

      if (result.created) summary.created += 1;
      else summary.updated += 1;
    } catch (error: any) {
      summary.failed += 1;
      const message =
        error instanceof WarehouseImportValidationError
          ? error.message
          : error?.message || 'Unbekannter Importfehler';

      summary.errors.push({
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
        error: message,
      });

      await prisma.$transaction(async (tx) => {
        await recordWarehouseImportError(tx, {
          ventureId,
          provider,
          sourceEntity: 'order',
          sourceEntityId: entry.orderId ?? null,
          payload: entry.sourceOrder as PrismaNs.InputJsonValue,
          errorMessage: message,
        });
      });
    }
  }

  return summary;
}

export async function importManualOrders(
  ventureId: string,
  userId: string,
  input: unknown
): Promise<WarehouseImportSummary> {
  const body = (input ?? {}) as Record<string, unknown>;
  const rawOrders = Array.isArray(body.orders) ? body.orders : [];
  if (!rawOrders.length) {
    throw new WarehouseImportValidationError('orders[] ist erforderlich');
  }

  return importMappedOrders(
    ventureId,
    userId,
    FulfillmentOrderSource.MANUAL,
    rawOrders.map((raw) => {
      const order = (raw ?? {}) as Record<string, unknown>;
      const sourceOrderId =
        typeof order.sourceOrderId === 'string' ? String(order.sourceOrderId) : null;
      const orderNumber =
        (typeof order.orderNumber === 'string' && order.orderNumber.trim()) ||
        (typeof order.sourceOrderId === 'string' && order.sourceOrderId.trim()) ||
        undefined;

      return {
        sourceOrder: order,
        orderId: sourceOrderId ?? undefined,
        orderNumber,
        mappedOrder: {
          orderNumber: String(order.orderNumber ?? order.sourceOrderId ?? '').trim(),
          sourceOrderId,
          source:
            typeof order.source === 'string' &&
            Object.values(FulfillmentOrderSource).includes(
              order.source as FulfillmentOrderSource
            )
              ? (order.source as FulfillmentOrderSource)
              : FulfillmentOrderSource.MANUAL,
          status: parseImportedOrderStatus(order.status),
          currency: order.currency ? String(order.currency) : 'EUR',
          subtotal: Number.isFinite(order.subtotal) ? Number(order.subtotal) : null,
          shippingCost: Number.isFinite(order.shippingCost)
            ? Number(order.shippingCost)
            : null,
          totalAmount: Number.isFinite(order.totalAmount) ? Number(order.totalAmount) : null,
          notes: order.notes ? String(order.notes) : null,
          importPayload: order as PrismaNs.InputJsonValue,
          customer: (order.customer as WarehouseImportCustomerInput | null | undefined) ?? null,
          lines: Array.isArray(order.lines)
            ? (order.lines as WarehouseImportLineInput[])
            : [],
        },
      };
    })
  );
}

function toShopifyOrderStatus(order: ShopifyOrder): FulfillmentOrderStatus {
  const financial = (order.financial_status || '').toLowerCase();
  const fulfillment = (order.fulfillment_status || '').toLowerCase();

  if (financial === 'voided' || financial === 'refunded' || financial === 'cancelled') {
    return FulfillmentOrderStatus.CANCELLED;
  }
  if (fulfillment === 'fulfilled') {
    return FulfillmentOrderStatus.SHIPPED;
  }
  return FulfillmentOrderStatus.IMPORTED;
}

function mapShopifyOrder(order: ShopifyOrder): WarehouseImportOrderInput {
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const lines = lineItems
    .map((line) => ({
      sku: String(line?.sku ?? '').trim(),
      title: line?.title ? String(line.title) : undefined,
      quantity: Number(line?.quantity ?? 0),
    }))
    .filter((line) => line.sku && Number.isFinite(line.quantity) && line.quantity > 0);

  const customerName = [
    order.customer?.first_name ? String(order.customer.first_name) : '',
    order.customer?.last_name ? String(order.customer.last_name) : '',
  ]
    .join(' ')
    .trim();

  return {
    orderNumber:
      (order.name && String(order.name).trim()) ||
      (order.order_number ? `#${order.order_number}` : `SHOPIFY-${order.id}`),
    sourceOrderId: String(order.id),
    source: FulfillmentOrderSource.SHOPIFY,
    status: toShopifyOrderStatus(order),
    currency: order.currency || 'EUR',
    subtotal: order.subtotal_price ? Number(order.subtotal_price) : null,
    shippingCost:
      order.total_shipping_price_set?.shop_money?.amount
        ? Number(order.total_shipping_price_set.shop_money.amount)
        : order.total_shipping_price
          ? Number(order.total_shipping_price)
          : null,
    totalAmount: order.total_price ? Number(order.total_price) : null,
    notes: order.note ?? null,
    importPayload: order as PrismaNs.InputJsonValue,
    customer: order.customer
      ? {
          externalRef: order.customer.id ? String(order.customer.id) : null,
          name: customerName || null,
          email: order.customer.email ? String(order.customer.email).toLowerCase() : null,
          phone: order.customer.phone ? String(order.customer.phone) : null,
        }
      : null,
    lines,
  };
}

async function resolveShopifyCredentials(
  ventureId: string,
  userId: string,
  body: Record<string, unknown>
) {
  const prisma = await getPrismaClient();
  const bodyToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : null;
  const bodyShopDomain = typeof body.shopDomain === 'string' ? body.shopDomain.trim() : null;

  if (bodyToken && bodyShopDomain) {
    return { accessToken: bodyToken, shopDomain: bodyShopDomain };
  }

  const connection = await prisma.integrationConnection.findFirst({
    where: {
      userId,
      ventureId,
      provider: IntegrationProvider.SHOPIFY,
      status: 'CONNECTED',
    },
    select: {
      accessToken: true,
      metadata: true,
      workspaceName: true,
    },
  });

  if (!connection?.accessToken) {
    return null;
  }

  const accessToken = deserializeAndDecrypt(connection.accessToken);
  const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
  const shopDomain =
    (typeof metadata.shopDomain === 'string' && metadata.shopDomain) ||
    (typeof metadata.storeDomain === 'string' && metadata.storeDomain) ||
    (typeof connection.workspaceName === 'string' && connection.workspaceName) ||
    null;

  if (!shopDomain) return null;
  return { accessToken, shopDomain };
}

async function fetchShopifyOrders(params: {
  shopDomain: string;
  accessToken: string;
  status: string;
  limit: number;
}): Promise<ShopifyOrder[]> {
  const domain = params.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = new URL(`https://${domain}/admin/api/2024-10/orders.json`);
  url.searchParams.set('status', params.status);
  url.searchParams.set('limit', String(params.limit));
  url.searchParams.set(
    'fields',
    [
      'id',
      'name',
      'order_number',
      'currency',
      'total_price',
      'subtotal_price',
      'total_shipping_price_set',
      'total_shipping_price',
      'note',
      'financial_status',
      'fulfillment_status',
      'customer',
      'line_items',
    ].join(',')
  );

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': params.accessToken,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as { orders?: ShopifyOrder[] };
  return Array.isArray(data.orders) ? data.orders : [];
}

export async function importShopifyOrders(
  ventureId: string,
  userId: string,
  input: unknown
): Promise<WarehouseImportSummary> {
  const body = (input ?? {}) as Record<string, unknown>;
  let incomingOrders: ShopifyOrder[] = [];

  if (Array.isArray(body.orders) && body.orders.length > 0) {
    incomingOrders = body.orders as ShopifyOrder[];
  } else {
    const credentials = await resolveShopifyCredentials(ventureId, userId, body);
    if (!credentials) {
      throw new WarehouseImportValidationError(
        'Keine Shopify-Credentials gefunden. Entweder orders[] mitsenden oder Integration verbinden.'
      );
    }

    const status = typeof body.shopifyStatus === 'string' ? body.shopifyStatus : 'open';
    const limitRaw = Number.isFinite(body.limit) ? Number(body.limit) : 50;
    const limit = Math.max(1, Math.min(250, limitRaw));

    incomingOrders = await fetchShopifyOrders({
      ...credentials,
      status,
      limit,
    });
  }

  return importMappedOrders(
    ventureId,
    userId,
    FulfillmentOrderSource.SHOPIFY,
    incomingOrders.map((sourceOrder) => ({
      sourceOrder,
      orderId: sourceOrder?.id ? String(sourceOrder.id) : undefined,
      mappedOrder: mapShopifyOrder(sourceOrder),
    }))
  );
}

function toWooOrderStatus(order: WooOrder): FulfillmentOrderStatus {
  const status = String(order.status || '').toLowerCase();
  if (['cancelled', 'refunded', 'failed', 'trash'].includes(status)) {
    return FulfillmentOrderStatus.CANCELLED;
  }
  if (['completed'].includes(status)) {
    return FulfillmentOrderStatus.SHIPPED;
  }
  return FulfillmentOrderStatus.IMPORTED;
}

function mapWooOrder(order: WooOrder): WarehouseImportOrderInput {
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const lines = lineItems
    .map((line) => {
      const fallbackSku = line.product_id ? `WC-PROD-${line.product_id}` : '';
      return {
        sku: String(line?.sku ?? fallbackSku).trim(),
        title: line?.name ? String(line.name).trim() : undefined,
        quantity: Number(line?.quantity ?? 0),
      };
    })
    .filter((line) => line.sku && Number.isFinite(line.quantity) && line.quantity > 0);

  const customerName = [
    order.billing?.first_name ? String(order.billing.first_name) : '',
    order.billing?.last_name ? String(order.billing.last_name) : '',
  ]
    .join(' ')
    .trim();

  return {
    orderNumber:
      order.number !== undefined && order.number !== null && String(order.number).trim()
        ? `WC-${String(order.number).trim()}`
        : `WC-${order.id}`,
    sourceOrderId: String(order.id),
    source: FulfillmentOrderSource.WOOCOMMERCE,
    status: toWooOrderStatus(order),
    currency: order.currency || 'EUR',
    subtotal: order.subtotal ? Number(order.subtotal) : null,
    shippingCost: order.shipping_total ? Number(order.shipping_total) : null,
    totalAmount: order.total ? Number(order.total) : null,
    notes: `WooCommerce import status=${String(order.status || 'unknown')}`,
    importPayload: order as PrismaNs.InputJsonValue,
    customer:
      order.billing || order.customer_id
        ? {
            externalRef:
              order.customer_id !== undefined && order.customer_id !== null
                ? String(order.customer_id)
                : null,
            name: customerName || null,
            companyName: order.billing?.company ? String(order.billing.company).trim() : null,
            email: order.billing?.email ? String(order.billing.email).toLowerCase() : null,
            phone: order.billing?.phone ? String(order.billing.phone) : null,
          }
        : null,
    lines,
  };
}

async function fetchWooOrders(params: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  status: string;
  limit: number;
}): Promise<WooOrder[]> {
  const base = params.storeUrl.trim().replace(/\/$/, '');
  const url = new URL(`${base}/wp-json/wc/v3/orders`);
  url.searchParams.set('status', params.status);
  url.searchParams.set('per_page', String(params.limit));
  url.searchParams.set('page', '1');

  const basicAuth = Buffer.from(
    `${params.consumerKey}:${params.consumerSecret}`
  ).toString('base64');
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WooCommerce API error (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as WooOrder[]) : [];
}

export async function importWooOrders(
  ventureId: string,
  userId: string,
  input: unknown
): Promise<WarehouseImportSummary> {
  const body = (input ?? {}) as Record<string, unknown>;
  let incomingOrders: WooOrder[] = [];

  if (Array.isArray(body.orders) && body.orders.length > 0) {
    incomingOrders = body.orders as WooOrder[];
  } else {
    const storeUrl = typeof body.storeUrl === 'string' ? body.storeUrl.trim() : '';
    const consumerKey =
      typeof body.consumerKey === 'string' ? body.consumerKey.trim() : '';
    const consumerSecret =
      typeof body.consumerSecret === 'string' ? body.consumerSecret.trim() : '';
    if (!storeUrl || !consumerKey || !consumerSecret) {
      throw new WarehouseImportValidationError(
        'WooCommerce-Zugang fehlt. Entweder orders[] senden oder storeUrl + consumerKey + consumerSecret setzen.'
      );
    }

    const status = typeof body.wooStatus === 'string' ? body.wooStatus : 'processing';
    const limitRaw = Number.isFinite(body.limit) ? Number(body.limit) : 50;
    const limit = Math.max(1, Math.min(100, Math.trunc(limitRaw)));
    incomingOrders = await fetchWooOrders({
      storeUrl,
      consumerKey,
      consumerSecret,
      status,
      limit,
    });
  }

  return importMappedOrders(
    ventureId,
    userId,
    FulfillmentOrderSource.WOOCOMMERCE,
    incomingOrders.map((sourceOrder) => ({
      sourceOrder,
      orderId: sourceOrder?.id ? String(sourceOrder.id) : undefined,
      mappedOrder: mapWooOrder(sourceOrder),
    }))
  );
}
