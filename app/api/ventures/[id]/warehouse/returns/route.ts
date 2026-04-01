import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ReturnStatus } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import { canTransitionReturnStatus, returnStatusTimestampsPatch } from '@/lib/warehouse/transitions';

function parseStatus(value: unknown): ReturnStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(ReturnStatus).includes(value as ReturnStatus)
    ? (value as ReturnStatus)
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
    return NextResponse.json(
      { error: 'Venture nicht gefunden oder Zugriff verweigert' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = parseStatus(searchParams.get('status'));
  const orderId = searchParams.get('orderId')?.trim();
  const takeParam = Number(searchParams.get('take'));
  const take = Number.isFinite(takeParam) ? Math.max(1, Math.min(100, takeParam)) : 50;

  const entries = await prisma.returnItem.findMany({
    where: {
      ventureId: id,
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
    take,
  });

  return NextResponse.json(entries);
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
    return NextResponse.json(
      { error: 'Venture nicht gefunden oder Zugriff verweigert' },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) {
      return NextResponse.json({ error: 'orderId ist erforderlich' }, { status: 400 });
    }

    const order = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, ventureId: id },
      include: { lines: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order nicht gefunden' }, { status: 404 });
    }

    let orderLineId: string | null = null;
    if (typeof body?.orderLineId === 'string' && body.orderLineId.trim()) {
      const line = order.lines.find((entry) => entry.id === body.orderLineId.trim());
      if (!line) {
        return NextResponse.json({ error: 'orderLineId ist ungueltig' }, { status: 400 });
      }
      orderLineId = line.id;
    } else if (order.lines.length > 0) {
      orderLineId = order.lines[0].id;
    }

    const status = parseStatus(body?.status) ?? ReturnStatus.RECEIVED;
    if (!canTransitionReturnStatus(ReturnStatus.ANNOUNCED, status)) {
      return NextResponse.json({ error: 'Ungueltiger initialer Return-Status' }, { status: 400 });
    }

    const quantityInput = Number(body?.quantity);
    const quantity = Number.isFinite(quantityInput) ? Math.max(1, Math.trunc(quantityInput)) : 1;

    const created = await prisma.returnItem.create({
      data: {
        ventureId: id,
        orderId: order.id,
        orderLineId,
        status,
        quantity,
        reason: typeof body?.reason === 'string' ? body.reason : null,
        conditionNote: typeof body?.conditionNote === 'string' ? body.conditionNote : null,
        handledById: access.userId,
        ...returnStatusTimestampsPatch(ReturnStatus.ANNOUNCED, status),
      },
      include: {
        order: { select: { id: true, orderNumber: true, status: true } },
        orderLine: { select: { id: true, sku: true, title: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create return item:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
