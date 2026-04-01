import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  FulfillmentOrderSource,
  FulfillmentOrderStatus,
  Prisma as PrismaNs,
} from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import { upsertImportedOrder, WarehouseImportValidationError } from '@/lib/warehouse/import';

function parseStatus(value: string | null): FulfillmentOrderStatus | undefined {
  if (!value) return undefined;
  return Object.values(FulfillmentOrderStatus).includes(value as FulfillmentOrderStatus)
    ? (value as FulfillmentOrderStatus)
    : undefined;
}

function parseSource(value: string | null): FulfillmentOrderSource | undefined {
  if (!value) return undefined;
  return Object.values(FulfillmentOrderSource).includes(value as FulfillmentOrderSource)
    ? (value as FulfillmentOrderSource)
    : undefined;
}

export async function GET(
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

  const { searchParams } = new URL(req.url);
  const status = parseStatus(searchParams.get('status'));
  const source = parseSource(searchParams.get('source'));
  const query = searchParams.get('q')?.trim();

  const orders = await prisma.fulfillmentOrder.findMany({
    where: {
      ventureId: id,
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
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

  return NextResponse.json(orders);
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
    const source = parseSource(body?.source ?? null) ?? FulfillmentOrderSource.MANUAL;
    const status = parseStatus(body?.status ?? null) ?? FulfillmentOrderStatus.IMPORTED;

    const linesRaw = Array.isArray(body?.lines) ? body.lines : [];
    if (!linesRaw.length) {
      return NextResponse.json({ error: 'Mindestens eine Order-Position ist erforderlich' }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const result = await upsertImportedOrder(tx, id, access.userId, {
        orderNumber: String(body?.orderNumber ?? '').trim(),
        sourceOrderId: body?.sourceOrderId ? String(body.sourceOrderId) : null,
        source,
        status,
        currency: body?.currency ? String(body.currency) : 'EUR',
        subtotal: Number.isFinite(body?.subtotal) ? Number(body.subtotal) : null,
        shippingCost: Number.isFinite(body?.shippingCost) ? Number(body.shippingCost) : null,
        totalAmount: Number.isFinite(body?.totalAmount) ? Number(body.totalAmount) : null,
        notes: body?.notes ? String(body.notes) : null,
        importPayload: body?.importPayload ?? (body as PrismaNs.InputJsonValue),
        customer: body?.customer ?? null,
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

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    if (error instanceof WarehouseImportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Order existiert bereits oder Konflikt bei Idempotenz' }, { status: 409 });
    }
    console.error('Failed to create fulfillment order:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
