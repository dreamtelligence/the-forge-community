import { FulfillmentOrderSource, Prisma as PrismaNs } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import {
  parseFulfillmentOrderSourceParam,
  WarehouseImportErrorValidationError,
} from '@/lib/warehouse/contracts';

export {
  parseFulfillmentOrderSourceParam,
  WarehouseImportErrorValidationError,
};

export type WarehouseImportErrorFilters = {
  provider?: string | null;
  resolved?: unknown;
};

function parseResolvedFilter(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export async function listWarehouseImportErrors(
  ventureId: string,
  filters: WarehouseImportErrorFilters = {}
) {
  const provider = parseFulfillmentOrderSourceParam(filters.provider ?? null);
  const resolved = parseResolvedFilter(filters.resolved);

  return prisma.warehouseImportError.findMany({
    where: {
      ventureId,
      ...(provider ? { provider } : {}),
      ...(resolved === true ? { resolvedAt: { not: null } } : {}),
      ...(resolved === false ? { resolvedAt: null } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  });
}

export async function createWarehouseImportErrorEntry(
  ventureId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const provider =
    parseFulfillmentOrderSourceParam(
      typeof body.provider === 'string' ? body.provider : null
    ) ?? FulfillmentOrderSource.MANUAL;
  const sourceEntity =
    typeof body.sourceEntity === 'string' ? body.sourceEntity.trim() : '';
  const errorMessage =
    typeof body.errorMessage === 'string' ? body.errorMessage.trim() : '';

  if (!sourceEntity || !errorMessage) {
    throw new WarehouseImportErrorValidationError(
      'MISSING_REQUIRED_FIELDS',
      'sourceEntity und errorMessage sind erforderlich'
    );
  }

  return prisma.warehouseImportError.create({
    data: {
      ventureId,
      provider,
      sourceEntity,
      sourceEntityId:
        typeof body.sourceEntityId === 'string' && body.sourceEntityId.trim()
          ? body.sourceEntityId.trim()
          : null,
      payload: (body.payload ?? undefined) as PrismaNs.InputJsonValue | undefined,
      errorMessage,
    },
  });
}

export async function updateWarehouseImportErrorResolution(
  ventureId: string,
  errorId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const resolved = body.resolved !== false;

  const existing = await prisma.warehouseImportError.findFirst({
    where: { id: errorId, ventureId },
    select: { id: true },
  });
  if (!existing) {
    throw new WarehouseImportErrorValidationError(
      'IMPORT_ERROR_NOT_FOUND',
      'Import-Fehler nicht gefunden'
    );
  }

  return prisma.warehouseImportError.update({
    where: { id: existing.id },
    data: {
      resolvedAt: resolved ? new Date() : null,
    },
  });
}
