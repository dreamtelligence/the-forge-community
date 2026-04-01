import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  FulfillmentLineStatus,
  FulfillmentOrderStatus,
  PickListItemStatus,
  PickListStatus,
} from '@prisma/client';
import { getWarehouseAccess, isAssignableWarehouseOperator } from '@/lib/warehouse/access';
import {
  canTransitionOrderStatus,
  canTransitionPickListStatus,
  orderStatusTimestampsPatch,
  pickListStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';

type PickListItemPatch = {
  id: string;
  pickedQty?: number;
  status?: PickListItemStatus;
};

function parsePickListStatus(value: unknown): PickListStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(PickListStatus).includes(value as PickListStatus)
    ? (value as PickListStatus)
    : undefined;
}

function parsePickListItemStatus(value: unknown): PickListItemStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(PickListItemStatus).includes(value as PickListItemStatus)
    ? (value as PickListItemStatus)
    : undefined;
}

function derivePickListItemStatus(pickedQty: number, targetQty: number): PickListItemStatus {
  if (pickedQty <= 0) return PickListItemStatus.PENDING;
  if (pickedQty >= targetQty) return PickListItemStatus.PICKED;
  return PickListItemStatus.SHORT;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pickListId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, pickListId } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const requestedStatus = parsePickListStatus(body?.status);
    const itemPatchesRaw: any[] = Array.isArray(body?.items) ? body.items : [];
    const itemPatches: PickListItemPatch[] = itemPatchesRaw
      .map((entry: any): PickListItemPatch => ({
        id: String(entry?.id ?? '').trim(),
        pickedQty:
          entry?.pickedQty !== undefined && Number.isFinite(entry.pickedQty)
            ? Number(entry.pickedQty)
            : undefined,
        status: parsePickListItemStatus(entry?.status),
      }))
      .filter((entry: PickListItemPatch) => Boolean(entry.id));

    let assignedToId: string | null | undefined = undefined;
    if (body?.assignedToId !== undefined) {
      if (!body?.assignedToId) {
        assignedToId = null;
      } else {
        const candidate = String(body.assignedToId);
        const assignable = await isAssignableWarehouseOperator(id, candidate);
        if (!assignable) {
          return NextResponse.json(
            { error: 'assignedToId ist nicht Teil dieses Ventures/Squads' },
            { status: 400 }
          );
        }
        assignedToId = candidate;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.pickList.findFirst({
        where: { id: pickListId, ventureId: id },
        include: {
          items: {
            include: {
              orderLine: {
                select: {
                  id: true,
                  quantity: true,
                  pickedQuantity: true,
                  status: true,
                },
              },
            },
          },
          order: {
            select: { id: true, status: true },
          },
        },
      });

      if (!current) {
        throw new Error('PICKLIST_NOT_FOUND');
      }

      const itemById = new Map(current.items.map((item) => [item.id, item]));
      const touchedOrderLineIds = new Set<string>();

      for (const patch of itemPatches) {
        const currentItem = itemById.get(patch.id);
        if (!currentItem) {
          throw new Error(`INVALID_ITEM:${patch.id}`);
        }

        const pickedQty =
          patch.pickedQty !== undefined ? Math.trunc(patch.pickedQty) : currentItem.pickedQty;
        if (pickedQty < 0) {
          throw new Error(`INVALID_PICK_QTY:${patch.id}`);
        }
        if (pickedQty > currentItem.targetQty) {
          throw new Error(`OVER_PICK:${patch.id}`);
        }

        const nextItemStatus =
          patch.status ?? derivePickListItemStatus(pickedQty, currentItem.targetQty);

        await tx.pickListItem.update({
          where: { id: currentItem.id },
          data: {
            pickedQty,
            status: nextItemStatus,
          },
        });
        touchedOrderLineIds.add(currentItem.orderLineId);
      }

      for (const orderLineId of touchedOrderLineIds) {
        const line = await tx.fulfillmentOrderLine.findUnique({
          where: { id: orderLineId },
          select: {
            id: true,
            quantity: true,
            status: true,
          },
        });
        if (!line) continue;

        const agg = await tx.pickListItem.aggregate({
          where: {
            orderLineId,
            pickList: {
              status: { not: PickListStatus.CANCELLED },
            },
          },
          _sum: { pickedQty: true },
        });

        const effectivePicked = Math.min(line.quantity, Math.max(0, agg._sum.pickedQty ?? 0));
        const nextLineStatus =
          line.status === FulfillmentLineStatus.PACKED || line.status === FulfillmentLineStatus.SHIPPED
            ? line.status
            : effectivePicked >= line.quantity
              ? FulfillmentLineStatus.PICKED
              : FulfillmentLineStatus.OPEN;

        await tx.fulfillmentOrderLine.update({
          where: { id: orderLineId },
          data: {
            pickedQuantity: effectivePicked,
            status: nextLineStatus,
          },
        });
      }

      const refreshedItems = await tx.pickListItem.findMany({
        where: { pickListId: current.id },
        select: { targetQty: true, pickedQty: true },
      });
      const anyPicked = refreshedItems.some((item) => item.pickedQty > 0);
      const allPicked =
        refreshedItems.length > 0 &&
        refreshedItems.every((item) => item.pickedQty >= item.targetQty);

      let nextStatus = requestedStatus ?? current.status;
      if (!requestedStatus) {
        if (allPicked) nextStatus = PickListStatus.COMPLETED;
        else if (anyPicked && current.status === PickListStatus.OPEN) {
          nextStatus = PickListStatus.IN_PROGRESS;
        }
      }

      if (!canTransitionPickListStatus(current.status, nextStatus)) {
        throw new Error(`INVALID_PICKLIST_TRANSITION:${current.status}:${nextStatus}`);
      }

      const pickListPatch =
        nextStatus !== current.status
          ? pickListStatusTimestampsPatch(current.status, nextStatus)
          : {};

      const updatedPickList = await tx.pickList.update({
        where: { id: current.id },
        data: {
          ...(nextStatus !== current.status ? { status: nextStatus } : {}),
          ...pickListPatch,
          ...(body?.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
          ...(assignedToId !== undefined ? { assignedToId } : {}),
        },
        include: {
          order: {
            select: { id: true, orderNumber: true, status: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              orderLine: {
                select: {
                  id: true,
                  sku: true,
                  title: true,
                  quantity: true,
                  pickedQuantity: true,
                  packedQuantity: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const orderPickingStatuses: PickListStatus[] = [
        PickListStatus.IN_PROGRESS,
        PickListStatus.COMPLETED,
      ];
      if (updatedPickList.order && orderPickingStatuses.includes(updatedPickList.status)) {
        const fromStatus = current.order?.status;
        if (
          fromStatus &&
          canTransitionOrderStatus(fromStatus, FulfillmentOrderStatus.PICKING)
        ) {
          await tx.fulfillmentOrder.update({
            where: { id: updatedPickList.order.id },
            data: {
              status: FulfillmentOrderStatus.PICKING,
              ...orderStatusTimestampsPatch(fromStatus, FulfillmentOrderStatus.PICKING),
            },
          });
        }
      }

      return updatedPickList;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'PICKLIST_NOT_FOUND') {
        return NextResponse.json({ error: 'Pickliste nicht gefunden' }, { status: 404 });
      }
      if (error.message.startsWith('INVALID_ITEM:')) {
        return NextResponse.json({ error: 'Mindestens ein Picklist-Item ist ungueltig' }, { status: 400 });
      }
      if (error.message.startsWith('INVALID_PICK_QTY:')) {
        return NextResponse.json({ error: 'pickedQty muss >= 0 sein' }, { status: 400 });
      }
      if (error.message.startsWith('OVER_PICK:')) {
        return NextResponse.json({ error: 'pickedQty darf targetQty nicht ueberschreiten' }, { status: 400 });
      }
      if (error.message.startsWith('INVALID_PICKLIST_TRANSITION:')) {
        return NextResponse.json({ error: 'Ungueltiger Picklist-Statuswechsel' }, { status: 409 });
      }
    }

    console.error('Failed to update pick list:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
