import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { FulfillmentOrderStatus, PickListStatus } from '@prisma/client';
import { getWarehouseAccess, isAssignableWarehouseOperator } from '@/lib/warehouse/access';
import { canTransitionOrderStatus, orderStatusTimestampsPatch } from '@/lib/warehouse/transitions';

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
    const assignedToId = typeof body?.assignedToId === 'string' ? body.assignedToId.trim() : null;
    const regenerate = Boolean(body?.regenerate);

    if (!orderId) {
      return NextResponse.json({ error: 'orderId ist erforderlich' }, { status: 400 });
    }

    if (assignedToId) {
      const isValid = await isAssignableWarehouseOperator(id, assignedToId);
      if (!isValid) {
        return NextResponse.json(
          { error: 'assignedToId ist nicht Teil dieses Ventures/Squads' },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.fulfillmentOrder.findFirst({
        where: { id: orderId, ventureId: id },
        include: {
          lines: {
            include: {
              item: {
                include: {
                  defaultBin: {
                    select: { code: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }
      if (order.status === FulfillmentOrderStatus.CANCELLED) {
        throw new Error('ORDER_CANCELLED');
      }
      if (order.status === FulfillmentOrderStatus.COMPLETED) {
        throw new Error('ORDER_COMPLETED');
      }

      const openPickList = await tx.pickList.findFirst({
        where: {
          ventureId: id,
          orderId: order.id,
          status: { in: [PickListStatus.OPEN, PickListStatus.IN_PROGRESS] },
        },
        include: {
          items: true,
        },
      });

      if (openPickList && !regenerate) {
        return { pickList: openPickList, reused: true };
      }

      if (openPickList && regenerate) {
        await tx.pickListItem.deleteMany({ where: { pickListId: openPickList.id } });
        await tx.pickList.delete({ where: { id: openPickList.id } });
      }

      const outstanding = order.lines
        .map((line) => ({
          lineId: line.id,
          targetQty: Math.max(line.quantity - line.pickedQuantity, 0),
          binCodeSnapshot: line.item?.defaultBin?.code ?? null,
        }))
        .filter((line) => line.targetQty > 0);

      if (!outstanding.length) {
        throw new Error('NO_OUTSTANDING_ITEMS');
      }

      const pickList = await tx.pickList.create({
        data: {
          ventureId: id,
          orderId: order.id,
          status: PickListStatus.OPEN,
          assignedToId: assignedToId || null,
          items: {
            create: outstanding.map((line) => ({
              orderLineId: line.lineId,
              targetQty: line.targetQty,
              pickedQty: 0,
              status: 'PENDING',
              binCodeSnapshot: line.binCodeSnapshot,
            })),
          },
        },
        include: {
          items: {
            include: {
              orderLine: true,
            },
          },
        },
      });

      if (
        order.status === FulfillmentOrderStatus.IMPORTED &&
        canTransitionOrderStatus(order.status, FulfillmentOrderStatus.READY_TO_PICK)
      ) {
        await tx.fulfillmentOrder.update({
          where: { id: order.id },
          data: {
            status: FulfillmentOrderStatus.READY_TO_PICK,
            ...orderStatusTimestampsPatch(order.status, FulfillmentOrderStatus.READY_TO_PICK),
          },
        });
      }

      return { pickList, reused: false };
    });

    return NextResponse.json(result, { status: result.reused ? 200 : 201 });
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'ORDER_NOT_FOUND') {
        return NextResponse.json({ error: 'Order nicht gefunden' }, { status: 404 });
      }
      if (error.message === 'ORDER_CANCELLED') {
        return NextResponse.json({ error: 'Fuer stornierte Orders kann keine Pickliste erstellt werden' }, { status: 409 });
      }
      if (error.message === 'ORDER_COMPLETED') {
        return NextResponse.json({ error: 'Fuer abgeschlossene Orders kann keine Pickliste erstellt werden' }, { status: 409 });
      }
      if (error.message === 'NO_OUTSTANDING_ITEMS') {
        return NextResponse.json({ error: 'Keine offenen Positionen mehr zum Picken' }, { status: 409 });
      }
    }

    console.error('Failed to generate pick list:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
