import {
  FulfillmentOrderStatus,
  InboundPackageStatus,
  PickListStatus,
  ReturnStatus,
} from '@prisma/client';

const ORDER_TRANSITIONS: Record<FulfillmentOrderStatus, FulfillmentOrderStatus[]> = {
  IMPORTED: ['READY_TO_PICK', 'PICKING', 'CANCELLED'],
  READY_TO_PICK: ['PICKING', 'PACKED', 'CANCELLED'],
  PICKING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const INBOUND_TRANSITIONS: Record<InboundPackageStatus, InboundPackageStatus[]> = {
  RECEIVED: ['STORED', 'LINKED_TO_ORDER', 'PICKED_UP', 'CLOSED'],
  STORED: ['LINKED_TO_ORDER', 'PICKED_UP', 'CLOSED'],
  LINKED_TO_ORDER: ['PICKED_UP', 'CLOSED'],
  PICKED_UP: ['CLOSED'],
  CLOSED: [],
};

const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  ANNOUNCED: ['RECEIVED', 'INSPECTED', 'DISPOSED', 'RETURNED_TO_SENDER'],
  RECEIVED: ['INSPECTED', 'DISPOSED', 'RETURNED_TO_SENDER'],
  INSPECTED: ['RESTOCKED', 'DISPOSED', 'RETURNED_TO_SENDER'],
  RESTOCKED: [],
  DISPOSED: [],
  RETURNED_TO_SENDER: [],
};

const PICKLIST_TRANSITIONS: Record<PickListStatus, PickListStatus[]> = {
  OPEN: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const ORDER_RANK: Record<FulfillmentOrderStatus, number> = {
  IMPORTED: 10,
  READY_TO_PICK: 20,
  PICKING: 30,
  PACKED: 40,
  SHIPPED: 50,
  COMPLETED: 60,
  CANCELLED: 70,
};

export function canTransitionOrderStatus(
  from: FulfillmentOrderStatus,
  to: FulfillmentOrderStatus
): boolean {
  if (from === to) return true;
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionInboundStatus(
  from: InboundPackageStatus,
  to: InboundPackageStatus
): boolean {
  if (from === to) return true;
  return INBOUND_TRANSITIONS[from].includes(to);
}

export function canTransitionReturnStatus(from: ReturnStatus, to: ReturnStatus): boolean {
  if (from === to) return true;
  return RETURN_TRANSITIONS[from].includes(to);
}

export function canTransitionPickListStatus(
  from: PickListStatus,
  to: PickListStatus
): boolean {
  if (from === to) return true;
  return PICKLIST_TRANSITIONS[from].includes(to);
}

export function mergeImportedOrderStatus(
  current: FulfillmentOrderStatus,
  incoming: FulfillmentOrderStatus
): FulfillmentOrderStatus {
  if (current === 'CANCELLED' || current === 'COMPLETED') return current;
  return ORDER_RANK[incoming] > ORDER_RANK[current] ? incoming : current;
}

export function orderStatusTimestampsPatch(
  from: FulfillmentOrderStatus,
  to: FulfillmentOrderStatus
): Partial<{
  pickedAt: Date;
  packedAt: Date;
  shippedAt: Date;
  completedAt: Date;
  cancelledAt: Date;
}> {
  const now = new Date();
  const patch: Record<string, Date> = {};

  if (to === 'PICKING' && from !== 'PICKING') patch.pickedAt = now;
  if (to === 'PACKED' && from !== 'PACKED') patch.packedAt = now;
  if (to === 'SHIPPED' && from !== 'SHIPPED') patch.shippedAt = now;
  if (to === 'COMPLETED' && from !== 'COMPLETED') patch.completedAt = now;
  if (to === 'CANCELLED' && from !== 'CANCELLED') patch.cancelledAt = now;

  return patch;
}

export function inboundStatusTimestampsPatch(
  from: InboundPackageStatus,
  to: InboundPackageStatus
): Partial<{
  storedAt: Date;
  pickedUpAt: Date;
  closedAt: Date;
}> {
  const now = new Date();
  const patch: Record<string, Date> = {};

  if (to === 'STORED' && from !== 'STORED') patch.storedAt = now;
  if (to === 'PICKED_UP' && from !== 'PICKED_UP') patch.pickedUpAt = now;
  if (to === 'CLOSED' && from !== 'CLOSED') patch.closedAt = now;

  return patch;
}

export function pickListStatusTimestampsPatch(
  from: PickListStatus,
  to: PickListStatus
): Partial<{
  completedAt: Date;
}> {
  const now = new Date();
  const patch: Record<string, Date> = {};

  if (to === 'COMPLETED' && from !== 'COMPLETED') patch.completedAt = now;

  return patch;
}

export function returnStatusTimestampsPatch(
  from: ReturnStatus,
  to: ReturnStatus
): Partial<{
  receivedAt: Date;
  inspectedAt: Date;
  resolvedAt: Date;
}> {
  const now = new Date();
  const patch: Record<string, Date> = {};

  if (to === 'RECEIVED' && from !== 'RECEIVED') patch.receivedAt = now;
  if (to === 'INSPECTED' && from !== 'INSPECTED') patch.inspectedAt = now;
  if (['RESTOCKED', 'DISPOSED', 'RETURNED_TO_SENDER'].includes(to) && from !== to) {
    patch.resolvedAt = now;
  }

  return patch;
}
