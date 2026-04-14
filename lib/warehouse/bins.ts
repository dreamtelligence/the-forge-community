import { prisma } from '@/lib/database/prisma';
import {
  parseStorageBinType,
  WarehouseBinValidationError,
} from '@/lib/warehouse/contracts';
export {
  parseStorageBinType,
  WarehouseBinValidationError,
};

export type StorageBinFilters = {
  code?: string | null;
  query?: string | null;
  take: number;
};

export async function listStorageBins(ventureId: string, filters: StorageBinFilters) {
  const code = filters.code?.trim();
  const query = filters.query?.trim();

  return prisma.storageBin.findMany({
    where: {
      ventureId,
      isActive: true,
      ...(code ? { code: { equals: code, mode: 'insensitive' } } : {}),
      ...(query
        ? {
            OR: [
              { code: { contains: query, mode: 'insensitive' } },
              { label: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      code: true,
      label: true,
      binType: true,
      locationId: true,
      location: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: [{ code: 'asc' }],
    take: filters.take,
  });
}

export async function createStorageBin(ventureId: string, input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) {
    throw new WarehouseBinValidationError('code ist erforderlich');
  }

  let locationId: string | null = null;
  if (typeof body.locationId === 'string' && body.locationId.trim()) {
    const location = await prisma.warehouseLocation.findFirst({
      where: { id: body.locationId.trim(), ventureId },
      select: { id: true },
    });
    if (!location) {
      throw new WarehouseBinValidationError('locationId ist ungueltig');
    }
    locationId = location.id;
  }

  return prisma.storageBin.create({
    data: {
      ventureId,
      code,
      label: typeof body.label === 'string' && body.label.trim() ? body.label.trim() : null,
      binType: parseStorageBinType(body.binType),
      capacity: Number.isFinite(body.capacity) ? Number(body.capacity) : null,
      locationId,
    },
    select: {
      id: true,
      code: true,
      label: true,
      binType: true,
      locationId: true,
    },
  });
}
