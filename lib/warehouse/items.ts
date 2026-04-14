import { prisma } from '@/lib/database/prisma';
import {
  normalizeWarehouseItemInput,
  WarehouseItemValidationError,
} from '@/lib/warehouse/contracts';

export type WarehouseItemFilters = {
  query?: string | null;
};
export {
  normalizeWarehouseItemInput,
  WarehouseItemValidationError,
};

export async function listWarehouseItems(
  ventureId: string,
  filters: WarehouseItemFilters = {}
) {
  const query = filters.query?.trim();

  return prisma.warehouseItem.findMany({
    where: {
      ventureId,
      ...(query
        ? {
            OR: [
              { sku: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { barcode: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      defaultBin: {
        select: { id: true, code: true, label: true },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });
}

export async function createWarehouseItem(
  ventureId: string,
  userId: string,
  input: unknown
) {
  const normalized = normalizeWarehouseItemInput(input);

  if (normalized.defaultBinId) {
    const bin = await prisma.storageBin.findFirst({
      where: {
        id: normalized.defaultBinId,
        ventureId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!bin) {
      throw new WarehouseItemValidationError(
        'defaultBinId ist ungueltig oder gehoert nicht zu diesem Venture'
      );
    }
  }

  const item = await prisma.warehouseItem.create({
    data: {
      ventureId,
      sku: normalized.sku,
      name: normalized.name,
      barcode: normalized.barcode,
      description: normalized.description,
      unit: normalized.unit,
      quantityOnHand: normalized.quantityOnHand,
      reservedQuantity: normalized.reservedQuantity,
      reorderLevel: normalized.reorderLevel,
      defaultBinId: normalized.defaultBinId,
      createdById: userId,
    },
  });

  if (normalized.quantityOnHand > 0) {
    await prisma.inventoryTransaction.create({
      data: {
        ventureId,
        itemId: item.id,
        type: 'IN',
        quantity: normalized.quantityOnHand,
        previousQty: 0,
        newQty: normalized.quantityOnHand,
        referenceType: 'INITIAL_STOCK',
        createdById: userId,
      },
    });
  }

  return item;
}
