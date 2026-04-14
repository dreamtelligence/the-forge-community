import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import {
  FulfillmentOrderSource,
  FulfillmentOrderStatus,
  IntegrationProvider,
  Prisma as PrismaNs,
} from '@prisma/client';
import { deserializeAndDecrypt } from '@/lib/integrations/crypto';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import {
  recordWarehouseImportError,
  upsertImportedOrder,
  WarehouseImportValidationError,
} from '@/lib/warehouse/import';

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

function toOrderStatus(order: ShopifyOrder): FulfillmentOrderStatus {
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

function mapShopifyOrder(order: ShopifyOrder) {
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
    status: toOrderStatus(order),
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

async function resolveShopifyCredentials(ventureId: string, userId: string, body: any) {
  const bodyToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : null;
  const bodyShopDomain = typeof body?.shopDomain === 'string' ? body.shopDomain.trim() : null;

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
    let incomingOrders: ShopifyOrder[] = [];

    if (Array.isArray(body?.orders) && body.orders.length > 0) {
      incomingOrders = body.orders;
    } else {
      const credentials = await resolveShopifyCredentials(id, access.userId, body);
      if (!credentials) {
        return NextResponse.json(
          {
            error:
              'Keine Shopify-Credentials gefunden. Entweder orders[] mitsenden oder Integration verbinden.',
          },
          { status: 400 }
        );
      }

      const status = typeof body?.shopifyStatus === 'string' ? body.shopifyStatus : 'open';
      const limitRaw = Number.isFinite(body?.limit) ? Number(body.limit) : 50;
      const limit = Math.max(1, Math.min(250, limitRaw));

      incomingOrders = await fetchShopifyOrders({
        ...credentials,
        status,
        limit,
      });
    }

    const summary = {
      total: incomingOrders.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ orderId?: string; error: string }>,
    };

    for (const sourceOrder of incomingOrders) {
      try {
        const mapped = mapShopifyOrder(sourceOrder);
        const result = await prisma.$transaction(async (tx) =>
          upsertImportedOrder(tx, id, access.userId, mapped)
        );
        if (result.created) summary.created += 1;
        else summary.updated += 1;
      } catch (error: any) {
        summary.failed += 1;
        const message =
          error instanceof WarehouseImportValidationError
            ? error.message
            : error?.message || 'Unbekannter Shopify-Importfehler';
        const sourceEntityId = sourceOrder?.id ? String(sourceOrder.id) : undefined;
        summary.errors.push({ orderId: sourceEntityId, error: message });

        await prisma.$transaction(async (tx) => {
          await recordWarehouseImportError(tx, {
            ventureId: id,
            provider: FulfillmentOrderSource.SHOPIFY,
            sourceEntity: 'order',
            sourceEntityId,
            payload: sourceOrder as PrismaNs.InputJsonValue,
            errorMessage: message,
          });
        });
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to import Shopify orders:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
