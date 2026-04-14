import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { FulfillmentOrderSource, FulfillmentOrderStatus, Prisma as PrismaNs } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import {
  recordWarehouseImportError,
  upsertImportedOrder,
  WarehouseImportValidationError,
} from '@/lib/warehouse/import';

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

function toOrderStatus(order: WooOrder): FulfillmentOrderStatus {
  const status = String(order.status || '').toLowerCase();
  if (['cancelled', 'refunded', 'failed', 'trash'].includes(status)) {
    return FulfillmentOrderStatus.CANCELLED;
  }
  if (['completed'].includes(status)) {
    return FulfillmentOrderStatus.SHIPPED;
  }
  return FulfillmentOrderStatus.IMPORTED;
}

function mapWooOrder(order: WooOrder) {
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
      (order.number !== undefined && order.number !== null && String(order.number).trim()
        ? `WC-${String(order.number).trim()}`
        : `WC-${order.id}`),
    sourceOrderId: String(order.id),
    source: FulfillmentOrderSource.WOOCOMMERCE,
    status: toOrderStatus(order),
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

  const basicAuth = Buffer.from(`${params.consumerKey}:${params.consumerSecret}`).toString('base64');
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
    const body = await req.json().catch(() => ({}));
    let incomingOrders: WooOrder[] = [];

    if (Array.isArray(body?.orders) && body.orders.length > 0) {
      incomingOrders = body.orders as WooOrder[];
    } else {
      const storeUrl = typeof body?.storeUrl === 'string' ? body.storeUrl.trim() : '';
      const consumerKey = typeof body?.consumerKey === 'string' ? body.consumerKey.trim() : '';
      const consumerSecret =
        typeof body?.consumerSecret === 'string' ? body.consumerSecret.trim() : '';
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return NextResponse.json(
          {
            error:
              'WooCommerce-Zugang fehlt. Entweder orders[] senden oder storeUrl + consumerKey + consumerSecret setzen.',
          },
          { status: 400 }
        );
      }

      const status = typeof body?.wooStatus === 'string' ? body.wooStatus : 'processing';
      const limitRaw = Number.isFinite(body?.limit) ? Number(body.limit) : 50;
      const limit = Math.max(1, Math.min(100, Math.trunc(limitRaw)));
      incomingOrders = await fetchWooOrders({
        storeUrl,
        consumerKey,
        consumerSecret,
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
        const mapped = mapWooOrder(sourceOrder);
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
            : error?.message || 'Unbekannter WooCommerce-Importfehler';
        const sourceEntityId = sourceOrder?.id ? String(sourceOrder.id) : undefined;
        summary.errors.push({ orderId: sourceEntityId, error: message });

        await prisma.$transaction(async (tx) => {
          await recordWarehouseImportError(tx, {
            ventureId: id,
            provider: FulfillmentOrderSource.WOOCOMMERCE,
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
    console.error('Failed to import WooCommerce orders:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

