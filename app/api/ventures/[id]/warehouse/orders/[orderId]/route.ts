import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { FulfillmentOrderStatus } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import { canTransitionOrderStatus, orderStatusTimestampsPatch } from '@/lib/warehouse/transitions';

function parseStatus(value: unknown): FulfillmentOrderStatus | undefined {
  if (!value || typeof value !== 'string') return undefined;
  return Object.values(FulfillmentOrderStatus).includes(value as FulfillmentOrderStatus)
    ? (value as FulfillmentOrderStatus)
    : undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, orderId } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const nextStatus = parseStatus(body?.status);
    let nextCustomerId: string | null | undefined = undefined;

    if (body?.customerId !== undefined) {
      if (!body.customerId) {
        nextCustomerId = null;
      } else {
        const customerId = String(body.customerId).trim();
        const customer = await prisma.customerAccount.findFirst({
          where: {
            id: customerId,
            ventureId: id,
          },
          select: { id: true },
        });
        if (!customer) {
          return NextResponse.json({ error: 'customerId ist ungueltig' }, { status: 400 });
        }
        nextCustomerId = customer.id;
      }
    }

    const current = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, ventureId: id },
      select: { id: true, status: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Order nicht gefunden' }, { status: 404 });
    }

    if (nextStatus && !canTransitionOrderStatus(current.status, nextStatus)) {
      return NextResponse.json(
        { error: `Ungueltiger Statuswechsel: ${current.status} -> ${nextStatus}` },
        { status: 409 }
      );
    }

    const statusPatch = nextStatus
      ? orderStatusTimestampsPatch(current.status, nextStatus)
      : {};

    const updated = await prisma.fulfillmentOrder.update({
      where: { id: current.id },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...statusPatch,
        ...(body?.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
        ...(nextCustomerId !== undefined ? { customerId: nextCustomerId } : {}),
      },
      include: {
        customer: true,
        lines: true,
        shipments: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update fulfillment order:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, orderId } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const order = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, ventureId: id },
      include: {
        shipments: { select: { id: true } },
        pickLists: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          select: { id: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order nicht gefunden' }, { status: 404 });
    }

    if (order.shipments.length > 0) {
      return NextResponse.json(
        { error: 'Order kann nicht geloescht werden, da bereits Sendungen existieren' },
        { status: 409 }
      );
    }
    if (order.pickLists.length > 0) {
      return NextResponse.json(
        { error: 'Order kann nicht geloescht werden, da aktive Picklisten existieren' },
        { status: 409 }
      );
    }
    if (!['IMPORTED', 'READY_TO_PICK', 'CANCELLED'].includes(order.status)) {
      return NextResponse.json(
        { error: `Order im Status ${order.status} darf nicht geloescht werden` },
        { status: 409 }
      );
    }

    await prisma.fulfillmentOrder.delete({
      where: { id: order.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete fulfillment order:', error);
    return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 });
  }
}
