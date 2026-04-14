import { prisma } from '@/lib/database/prisma';
import {
  parseInventoryTransactionTypeParam,
  WarehouseInventoryValidationError,
} from '@/lib/warehouse/contracts';

export { parseInventoryTransactionTypeParam, WarehouseInventoryValidationError };

export type InventoryTransactionFilters = {
  type?: string | null;
  sku?: string | null;
  take: number;
};

export async function listInventoryTransactions(
  ventureId: string,
  filters: InventoryTransactionFilters
) {
  const type = parseInventoryTransactionTypeParam(filters.type ?? null);
  const sku = filters.sku?.trim();

  return prisma.inventoryTransaction.findMany({
    where: {
      ventureId,
      ...(type ? { type } : {}),
      ...(sku
        ? {
            item: {
              sku: { equals: sku, mode: 'insensitive' },
            },
          }
        : {}),
    },
    include: {
      item: {
        select: { id: true, sku: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      bin: {
        select: { id: true, code: true, label: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: filters.take,
  });
}

export async function adjustWarehouseItemStock(
  ventureId: string,
  itemId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const delta = Number.isFinite(body.delta) ? Number(body.delta) : null;
  const newQuantityInput = Number.isFinite(body.newQuantity) ? Number(body.newQuantity) : null;
  const reason = typeof body.reason === 'string' ? body.reason : null;
  const referenceType =
    typeof body.referenceType === 'string' && body.referenceType.trim()
      ? body.referenceType.trim()
      : 'MANUAL_ADJUSTMENT';
  const binId =
    typeof body.binId === 'string' && body.binId.trim()
      ? body.binId.trim()
      : null;

  if (delta === null && newQuantityInput === null) {
    throw new WarehouseInventoryValidationError(
      'MISSING_QUANTITY_CHANGE',
      'delta oder newQuantity ist erforderlich'
    );
  }

  return prisma.$transaction(async (tx) => {
    if (binId) {
      const bin = await tx.storageBin.findFirst({
        where: {
          id: binId,
          ventureId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!bin) {
        throw new WarehouseInventoryValidationError('BIN_NOT_FOUND', 'binId ist ungueltig');
      }
    }

    const item = await tx.warehouseItem.findFirst({
      where: { id: itemId, ventureId },
    });

    if (!item) {
      throw new WarehouseInventoryValidationError('ITEM_NOT_FOUND', 'Artikel nicht gefunden');
    }

    const previousQty = item.quantityOnHand;
    const newQty = newQuantityInput !== null ? newQuantityInput : previousQty + (delta as number);

    if (newQty < 0) {
      throw new WarehouseInventoryValidationError(
        'NEGATIVE_STOCK',
        'Bestand kann nicht negativ werden'
      );
    }

    const updatedItem = await tx.warehouseItem.update({
      where: { id: item.id },
      data: { quantityOnHand: newQty },
    });

    let type: 'IN' | 'OUT' | 'ADJUST' = 'ADJUST';
    let qtyForLog = Math.abs(newQty - previousQty);

    if (newQuantityInput === null) {
      if ((delta as number) > 0) type = 'IN';
      if ((delta as number) < 0) type = 'OUT';
      qtyForLog = Math.abs(delta as number);
    }

    await tx.inventoryTransaction.create({
      data: {
        ventureId,
        itemId: item.id,
        binId,
        type,
        quantity: qtyForLog,
        previousQty,
        newQty,
        referenceType,
        notes: reason,
        createdById: userId,
      },
    });

    return updatedItem;
  });
}
