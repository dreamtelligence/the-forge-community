import {
  FinanceAuditAction,
  FinanceAuditEntityType,
  PlatformLedgerDirection,
  PlatformLedgerSource,
  Prisma,
  PrismaClient,
} from '@prisma/client';

type DbClient = Prisma.TransactionClient | PrismaClient;

export type FinanceAuditActor = {
  actorId?: string | null;
  actorEmail?: string | null;
  requestId?: string | null;
};

type FinanceAuditLogInput = FinanceAuditActor & {
  db: DbClient;
  entityType: FinanceAuditEntityType;
  entityId?: string | null;
  action: FinanceAuditAction;
  reason?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown> | null;
};

type CreateLedgerEntryInput = FinanceAuditActor & {
  db: DbClient;
  profileId: string;
  direction: PlatformLedgerDirection;
  source: PlatformLedgerSource;
  sourceId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  bookedAt?: Date;
  amountNet: number;
  taxAmount?: number;
  amountGross: number;
  currency?: string | null;
  invoiceId?: string | null;
  userId?: string | null;
  correctionReason?: string | null;
  reversesEntryId?: string | null;
  metadata?: Record<string, unknown> | null;
  auditAction?: FinanceAuditAction;
  auditReason?: string | null;
  auditMetadata?: Record<string, unknown> | null;
};

type ReverseLedgerEntryInput = FinanceAuditActor & {
  db: DbClient;
  entryId: string;
  reason: string;
};

function toAuditJson(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;

  // Dates, BigInts and nested objects are normalized once so the audit log
  // remains JSON-safe and stable for later exports or diffing.
  return JSON.parse(
    JSON.stringify(value, (_, nestedValue) =>
      typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue
    )
  ) as Prisma.InputJsonValue;
}

export function snapshotLedgerEntry(entry: {
  id: string;
  profileId: string;
  direction: PlatformLedgerDirection;
  source: PlatformLedgerSource;
  sourceId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  bookedAt: Date;
  amountNet: number;
  taxAmount: number;
  amountGross: number;
  currency: string;
  invoiceId?: string | null;
  userId?: string | null;
  correctionReason?: string | null;
  reversesEntryId?: string | null;
  immutableLockedAt?: Date;
  metadata?: Prisma.JsonValue | null;
  createdAt?: Date;
}) {
  return {
    id: entry.id,
    profileId: entry.profileId,
    direction: entry.direction,
    source: entry.source,
    sourceId: entry.sourceId ?? null,
    categoryId: entry.categoryId ?? null,
    description: entry.description ?? null,
    bookedAt: entry.bookedAt.toISOString(),
    amountNet: entry.amountNet,
    taxAmount: entry.taxAmount,
    amountGross: entry.amountGross,
    currency: entry.currency,
    invoiceId: entry.invoiceId ?? null,
    userId: entry.userId ?? null,
    correctionReason: entry.correctionReason ?? null,
    reversesEntryId: entry.reversesEntryId ?? null,
    immutableLockedAt: entry.immutableLockedAt?.toISOString() ?? null,
    metadata: entry.metadata ?? null,
    createdAt: entry.createdAt?.toISOString() ?? null,
  };
}

export async function recordFinanceAuditLog(input: FinanceAuditLogInput) {
  const {
    db,
    entityType,
    entityId,
    action,
    actorId,
    actorEmail,
    requestId,
    reason,
    beforeState,
    afterState,
    metadata,
  } = input;

  return db.financeAuditLog.create({
    data: {
      entityType,
      entityId: entityId ?? undefined,
      action,
      actorId: actorId ?? undefined,
      actorEmail: actorEmail ?? undefined,
      requestId: requestId ?? undefined,
      reason: reason ?? undefined,
      beforeState: toAuditJson(beforeState),
      afterState: toAuditJson(afterState),
      metadata: toAuditJson(metadata),
    },
  });
}

export async function createPlatformLedgerEntry(input: CreateLedgerEntryInput) {
  const {
    db,
    profileId,
    direction,
    source,
    sourceId,
    categoryId,
    description,
    bookedAt,
    amountNet,
    taxAmount,
    amountGross,
    currency,
    invoiceId,
    userId,
    correctionReason,
    reversesEntryId,
    metadata,
    auditAction = FinanceAuditAction.CREATED,
    auditReason,
    auditMetadata,
    actorId,
    actorEmail,
    requestId,
  } = input;

  const entry = await db.platformLedgerEntry.create({
    data: {
      profileId,
      direction,
      source,
      sourceId: sourceId ?? undefined,
      categoryId: categoryId ?? undefined,
      description: description ?? undefined,
      bookedAt: bookedAt ?? new Date(),
      amountNet,
      taxAmount: taxAmount ?? 0,
      amountGross,
      currency: currency?.toUpperCase() || 'EUR',
      invoiceId: invoiceId ?? undefined,
      userId: userId ?? undefined,
      correctionReason: correctionReason ?? undefined,
      reversesEntryId: reversesEntryId ?? undefined,
      metadata: toAuditJson(metadata),
    },
  });

  await recordFinanceAuditLog({
    db,
    entityType: FinanceAuditEntityType.PLATFORM_LEDGER_ENTRY,
    entityId: entry.id,
    action: auditAction,
    actorId,
    actorEmail,
    requestId,
    reason: auditReason,
    afterState: snapshotLedgerEntry(entry),
    metadata: auditMetadata ?? metadata ?? undefined,
  });

  return entry;
}

export async function reversePlatformLedgerEntry(input: ReverseLedgerEntryInput) {
  const { db, entryId, reason, actorId, actorEmail, requestId } = input;

  const existingEntry = await db.platformLedgerEntry.findUnique({
    where: { id: entryId },
    include: {
      reversedByEntry: true,
    },
  });

  if (!existingEntry) {
    throw new Error('Ledger-Eintrag nicht gefunden.');
  }

  if (existingEntry.reversesEntryId) {
    throw new Error('Storno-Einträge dürfen nicht erneut storniert werden.');
  }

  if (existingEntry.reversedByEntry) {
    return existingEntry.reversedByEntry;
  }

  const reversal = await createPlatformLedgerEntry({
    db,
    profileId: existingEntry.profileId,
    direction:
      existingEntry.direction === PlatformLedgerDirection.INCOME
        ? PlatformLedgerDirection.EXPENSE
        : PlatformLedgerDirection.INCOME,
    source: PlatformLedgerSource.REVERSAL,
    sourceId: existingEntry.id,
    categoryId: existingEntry.categoryId,
    description: `Storno zu ${existingEntry.description || existingEntry.id}`,
    amountNet: existingEntry.amountNet,
    taxAmount: existingEntry.taxAmount,
    amountGross: existingEntry.amountGross,
    currency: existingEntry.currency,
    userId: existingEntry.userId,
    correctionReason: reason,
    reversesEntryId: existingEntry.id,
    metadata: {
      originalEntryId: existingEntry.id,
      originalSource: existingEntry.source,
      originalInvoiceId: existingEntry.invoiceId,
      originalBookedAt: existingEntry.bookedAt.toISOString(),
      originalDescription: existingEntry.description,
    },
    actorId,
    actorEmail,
    requestId,
    auditReason: reason,
    auditMetadata: {
      originalEntryId: existingEntry.id,
    },
  });

  await recordFinanceAuditLog({
    db,
    entityType: FinanceAuditEntityType.PLATFORM_LEDGER_ENTRY,
    entityId: existingEntry.id,
    action: FinanceAuditAction.REVERSED,
    actorId,
    actorEmail,
    requestId,
    reason,
    beforeState: snapshotLedgerEntry(existingEntry),
    afterState: {
      reversalEntryId: reversal.id,
      reversalBookedAt: reversal.bookedAt.toISOString(),
    },
    metadata: {
      reversalEntryId: reversal.id,
    },
  });

  return reversal;
}
