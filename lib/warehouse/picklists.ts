import {
  FulfillmentLineStatus,
  FulfillmentOrderStatus,
  PickListItemStatus,
  PickListStatus,
} from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import { isAssignableWarehouseOperator } from '@/lib/warehouse/access';
import {
  parsePickListItemStatusParam,
  parsePickListStatusParam,
  WarehousePickListValidationError,
} from '@/lib/warehouse/contracts';
import {
  canTransitionOrderStatus,
  canTransitionPickListStatus,
  orderStatusTimestampsPatch,
  pickListStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';

export { parsePickListStatusParam, WarehousePickListValidationError };

export type PickListFilters = {
  orderId?: string | null;
  status?: unknown;
};

type PickListItemPatch = {
  id: string;
  pickedQty?: number;
  status?: PickListItemStatus;
};

const PICK_LIST_DETAIL_INCLUDE = {
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
    orderBy: { createdAt: 'asc' as const },
  },
};

function derivePickListItemStatus(
  pickedQty: number,
  targetQty: number
): PickListItemStatus {
  if (pickedQty <= 0) return PickListItemStatus.PENDING;
  if (pickedQty >= targetQty) return PickListItemStatus.PICKED;
  return PickListItemStatus.SHORT;
}

function normalizePickListItemPatch(input: unknown): PickListItemPatch | null {
  const body = (input ?? {}) as Record<string, unknown>;
  const id = String(body.id ?? '').trim();
  if (!id) return null;

  return {
    id,
    pickedQty:
      body.pickedQty !== undefined && Number.isFinite(body.pickedQty)
        ? Number(body.pickedQty)
        : undefined,
    status: parsePickListItemStatusParam(body.status),
  };
}

export async function listPickLists(
  ventureId: string,
  filters: PickListFilters = {}
) {
  const orderId = filters.orderId?.trim();
  const status = parsePickListStatusParam(filters.status);

  return prisma.pickList.findMany({
    where: {
      ventureId,
      ...(orderId ? { orderId } : {}),
      ...(status ? { status } : {}),
    },
    include: PICK_LIST_DETAIL_INCLUDE,
    orderBy: [{ generatedAt: 'desc' }],
  });
}

export async function generatePickList(ventureId: string, input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const assignedToId =
    typeof body.assignedToId === 'string' && body.assignedToId.trim()
      ? body.assignedToId.trim()
      : null;
  const regenerate = Boolean(body.regenerate);

  if (!orderId) {
    throw new WarehousePickListValidationError(
      'MISSING_ORDER_ID',
      'orderId ist erforderlich'
    );
  }

  if (assignedToId) {
    const isValid = await isAssignableWarehouseOperator(ventureId, assignedToId);
    if (!isValid) {
      throw new WarehousePickListValidationError(
        'INVALID_ASSIGNED_TO',
        'assignedToId ist nicht Teil dieses Ventures/Squads'
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.fulfillmentOrder.findFirst({
      where: { id: orderId, ventureId },
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
      throw new WarehousePickListValidationError('ORDER_NOT_FOUND', 'Order nicht gefunden');
    }
    if (order.status === FulfillmentOrderStatus.CANCELLED) {
      throw new WarehousePickListValidationError(
        'ORDER_CANCELLED',
        'Fuer stornierte Orders kann keine Pickliste erstellt werden'
      );
    }
    if (order.status === FulfillmentOrderStatus.COMPLETED) {
      throw new WarehousePickListValidationError(
        'ORDER_COMPLETED',
        'Fuer abgeschlossene Orders kann keine Pickliste erstellt werden'
      );
    }

    const openPickList = await tx.pickList.findFirst({
      where: {
        ventureId,
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
      throw new WarehousePickListValidationError(
        'NO_OUTSTANDING_ITEMS',
        'Keine offenen Positionen mehr zum Picken'
      );
    }

    const pickList = await tx.pickList.create({
      data: {
        ventureId,
        orderId: order.id,
        status: PickListStatus.OPEN,
        assignedToId: assignedToId || null,
        items: {
          create: outstanding.map((line) => ({
            orderLineId: line.lineId,
            targetQty: line.targetQty,
            pickedQty: 0,
            status: PickListItemStatus.PENDING,
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
          ...orderStatusTimestampsPatch(
            order.status,
            FulfillmentOrderStatus.READY_TO_PICK
          ),
        },
      });
    }

    return { pickList, reused: false };
  });
}

export async function updatePickList(
  ventureId: string,
  pickListId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const requestedStatus = parsePickListStatusParam(body.status);
  const itemPatchesRaw = Array.isArray(body.items) ? body.items : [];
  const itemPatches = itemPatchesRaw
    .map((entry) => normalizePickListItemPatch(entry))
    .filter((entry): entry is PickListItemPatch => Boolean(entry));

  let assignedToId: string | null | undefined = undefined;
  if (body.assignedToId !== undefined) {
    if (!body.assignedToId) {
      assignedToId = null;
    } else {
      const candidate = String(body.assignedToId).trim();
      const assignable = await isAssignableWarehouseOperator(ventureId, candidate);
      if (!assignable) {
        throw new WarehousePickListValidationError(
          'INVALID_ASSIGNED_TO',
          'assignedToId ist nicht Teil dieses Ventures/Squads'
        );
      }
      assignedToId = candidate;
    }
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.pickList.findFirst({
      where: { id: pickListId, ventureId },
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
      throw new WarehousePickListValidationError(
        'PICKLIST_NOT_FOUND',
        'Pickliste nicht gefunden'
      );
    }

    const itemById = new Map(current.items.map((item) => [item.id, item]));
    const touchedOrderLineIds = new Set<string>();

    for (const patch of itemPatches) {
      const currentItem = itemById.get(patch.id);
      if (!currentItem) {
        throw new WarehousePickListValidationError(
          'INVALID_ITEM',
          'Mindestens ein Picklist-Item ist ungueltig'
        );
      }

      const pickedQty =
        patch.pickedQty !== undefined ? Math.trunc(patch.pickedQty) : currentItem.pickedQty;
      if (pickedQty < 0) {
        throw new WarehousePickListValidationError(
          'INVALID_PICK_QTY',
          'pickedQty muss >= 0 sein'
        );
      }
      if (pickedQty > currentItem.targetQty) {
        throw new WarehousePickListValidationError(
          'OVER_PICK',
          'pickedQty darf targetQty nicht ueberschreiten'
        );
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
        line.status === FulfillmentLineStatus.PACKED ||
        line.status === FulfillmentLineStatus.SHIPPED
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
      throw new WarehousePickListValidationError(
        'INVALID_PICKLIST_TRANSITION',
        'Ungueltiger Picklist-Statuswechsel'
      );
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
        ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
      include: PICK_LIST_DETAIL_INCLUDE,
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
}
