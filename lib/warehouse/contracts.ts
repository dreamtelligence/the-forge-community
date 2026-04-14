import {
  CarrierType,
  FulfillmentOrderSource,
  FulfillmentOrderStatus,
  InboundPackageStatus,
  InventoryTransactionType,
  PickListItemStatus,
  PickListStatus,
  ReturnStatus,
  ShipmentStatus,
  StorageBinType,
} from '@prisma/client';

export class WarehouseItemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WarehouseItemValidationError';
  }
}

export class WarehouseBinValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WarehouseBinValidationError';
  }
}

export class WarehouseInventoryValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WarehouseInventoryValidationError';
    this.code = code;
  }
}

export class WarehouseOrderValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WarehouseOrderValidationError';
    this.code = code;
  }
}

export class WarehousePickListValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WarehousePickListValidationError';
    this.code = code;
  }
}

export class WarehouseInboundPackageValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WarehouseInboundPackageValidationError';
    this.code = code;
  }
}

export class WarehouseShipmentValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WarehouseShipmentValidationError';
    this.code = code;
  }
}

export class WarehouseReturnValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WarehouseReturnValidationError';
    this.code = code;
  }
}

export class WarehouseImportErrorValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WarehouseImportErrorValidationError';
    this.code = code;
  }
}

export function parseWarehouseTake(
  value: string | null,
  options: { fallback: number; min?: number; max: number }
): number {
  if (value === null || value.trim() === '') {
    return options.fallback;
  }

  const parsed = Number(value);
  const min = options.min ?? 1;

  if (!Number.isFinite(parsed)) {
    return options.fallback;
  }

  return Math.max(min, Math.min(options.max, Math.trunc(parsed)));
}

export function parseWarehouseBooleanFlag(value: string | null): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function parseWarehouseQuantity(
  value: unknown,
  options: { fallback: number; min?: number } = { fallback: 1 }
): number {
  const parsed = Number(value);
  const min = options.min ?? 1;

  if (!Number.isFinite(parsed)) {
    return options.fallback;
  }

  return Math.max(min, Math.trunc(parsed));
}

export type NormalizedWarehouseItemInput = {
  sku: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reservedQuantity: number;
  reorderLevel: number;
  defaultBinId: string | null;
  barcode: string | null;
  description: string | null;
};

export function normalizeWarehouseItemInput(input: unknown): NormalizedWarehouseItemInput {
  const body = (input ?? {}) as Record<string, unknown>;
  const sku = String(body.sku ?? '').trim();
  const name = String(body.name ?? '').trim();
  const unit = String(body.unit ?? 'pcs').trim() || 'pcs';
  const quantityOnHand = Number.isFinite(body.quantityOnHand) ? Number(body.quantityOnHand) : 0;
  const reservedQuantity = Number.isFinite(body.reservedQuantity) ? Number(body.reservedQuantity) : 0;
  const reorderLevel = Number.isFinite(body.reorderLevel) ? Number(body.reorderLevel) : 0;
  const defaultBinId = body.defaultBinId ? String(body.defaultBinId).trim() : null;
  const barcode = body.barcode ? String(body.barcode).trim() : null;
  const description = body.description ? String(body.description).trim() : null;

  if (!sku || !name) {
    throw new WarehouseItemValidationError('sku und name sind erforderlich');
  }
  if (quantityOnHand < 0 || reservedQuantity < 0 || reorderLevel < 0) {
    throw new WarehouseItemValidationError('Mengen duerfen nicht negativ sein');
  }

  return {
    sku,
    name,
    unit,
    quantityOnHand,
    reservedQuantity,
    reorderLevel,
    defaultBinId,
    barcode,
    description,
  };
}

export function parseStorageBinType(value: unknown): StorageBinType {
  if (typeof value !== 'string') return StorageBinType.SHELF;
  return Object.values(StorageBinType).includes(value as StorageBinType)
    ? (value as StorageBinType)
    : StorageBinType.SHELF;
}

export function parseCarrierTypeParam(value: unknown): CarrierType | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(CarrierType).includes(value as CarrierType)
    ? (value as CarrierType)
    : undefined;
}

export function parseInventoryTransactionTypeParam(
  value: string | null
): InventoryTransactionType | undefined {
  if (!value) return undefined;
  return Object.values(InventoryTransactionType).includes(value as InventoryTransactionType)
    ? (value as InventoryTransactionType)
    : undefined;
}

export function parseFulfillmentOrderStatusParam(
  value: string | null
): FulfillmentOrderStatus | undefined {
  if (!value) return undefined;
  return Object.values(FulfillmentOrderStatus).includes(value as FulfillmentOrderStatus)
    ? (value as FulfillmentOrderStatus)
    : undefined;
}

export function parseFulfillmentOrderSourceParam(
  value: string | null
): FulfillmentOrderSource | undefined {
  if (!value) return undefined;
  return Object.values(FulfillmentOrderSource).includes(value as FulfillmentOrderSource)
    ? (value as FulfillmentOrderSource)
    : undefined;
}

export function parseShipmentStatusParam(value: string | null): ShipmentStatus | undefined {
  if (!value) return undefined;
  return Object.values(ShipmentStatus).includes(value as ShipmentStatus)
    ? (value as ShipmentStatus)
    : undefined;
}

export function parseInboundPackageStatusParam(
  value: unknown
): InboundPackageStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(InboundPackageStatus).includes(value as InboundPackageStatus)
    ? (value as InboundPackageStatus)
    : undefined;
}

export function parsePickListStatusParam(value: unknown): PickListStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(PickListStatus).includes(value as PickListStatus)
    ? (value as PickListStatus)
    : undefined;
}

export function parsePickListItemStatusParam(value: unknown): PickListItemStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(PickListItemStatus).includes(value as PickListItemStatus)
    ? (value as PickListItemStatus)
    : undefined;
}

export function parseReturnStatusParam(value: unknown): ReturnStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(ReturnStatus).includes(value as ReturnStatus)
    ? (value as ReturnStatus)
    : undefined;
}
