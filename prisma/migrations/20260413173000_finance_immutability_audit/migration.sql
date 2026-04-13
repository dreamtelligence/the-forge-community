-- AlterEnum
ALTER TYPE "PlatformLedgerSource" ADD VALUE 'REVERSAL';

-- CreateEnum
CREATE TYPE "FinanceAuditEntityType" AS ENUM (
  'PLATFORM_INVOICE',
  'PLATFORM_LEDGER_ENTRY',
  'PLATFORM_DOCUMENT',
  'PLATFORM_CREDIT_PURCHASE',
  'PLATFORM_CREDIT_USAGE',
  'STRIPE_WEBHOOK',
  'PLATFORM_LEDGER_EXPORT'
);

-- CreateEnum
CREATE TYPE "FinanceAuditAction" AS ENUM (
  'CREATED',
  'FINALIZED',
  'STORED',
  'REVERSED',
  'PROCESSED',
  'EXPORTED'
);

-- AlterTable
ALTER TABLE "PlatformInvoice"
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "immutableLockedAt" TIMESTAMP(3);

ALTER TABLE "PlatformInvoiceLine"
  ADD COLUMN "immutableLockedAt" TIMESTAMP(3);

ALTER TABLE "PlatformLedgerEntry"
  ADD COLUMN "immutableLockedAt" TIMESTAMP(3),
  ADD COLUMN "correctionReason" TEXT,
  ADD COLUMN "reversesEntryId" TEXT;

ALTER TABLE "PlatformDocument"
  ADD COLUMN "immutableLockedAt" TIMESTAMP(3);

ALTER TABLE "PlatformCreditPurchase"
  ADD COLUMN "immutableLockedAt" TIMESTAMP(3);

ALTER TABLE "PlatformCreditUsage"
  ADD COLUMN "immutableLockedAt" TIMESTAMP(3);

-- Backfill immutable lock timestamps for existing append-only tables.
UPDATE "PlatformInvoiceLine"
SET "immutableLockedAt" = COALESCE("immutableLockedAt", "createdAt");

UPDATE "PlatformLedgerEntry"
SET "immutableLockedAt" = COALESCE("immutableLockedAt", "createdAt");

UPDATE "PlatformDocument"
SET "immutableLockedAt" = COALESCE("immutableLockedAt", "createdAt");

UPDATE "PlatformCreditPurchase"
SET "immutableLockedAt" = COALESCE("immutableLockedAt", "createdAt");

UPDATE "PlatformCreditUsage"
SET "immutableLockedAt" = COALESCE("immutableLockedAt", "createdAt");

UPDATE "PlatformInvoice"
SET
  "finalizedAt" = COALESCE("finalizedAt", CASE WHEN "pdfUrl" IS NOT NULL THEN COALESCE("updatedAt", "createdAt") END),
  "immutableLockedAt" = COALESCE(
    "immutableLockedAt",
    CASE WHEN "pdfUrl" IS NOT NULL THEN COALESCE("updatedAt", "createdAt") END
  );

ALTER TABLE "PlatformInvoiceLine"
  ALTER COLUMN "immutableLockedAt" SET NOT NULL,
  ALTER COLUMN "immutableLockedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PlatformLedgerEntry"
  ALTER COLUMN "immutableLockedAt" SET NOT NULL,
  ALTER COLUMN "immutableLockedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PlatformDocument"
  ALTER COLUMN "immutableLockedAt" SET NOT NULL,
  ALTER COLUMN "immutableLockedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PlatformCreditPurchase"
  ALTER COLUMN "immutableLockedAt" SET NOT NULL,
  ALTER COLUMN "immutableLockedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PlatformCreditUsage"
  ALTER COLUMN "immutableLockedAt" SET NOT NULL,
  ALTER COLUMN "immutableLockedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "FinanceAuditLog" (
  "id" TEXT NOT NULL,
  "entityType" "FinanceAuditEntityType" NOT NULL,
  "entityId" TEXT,
  "action" "FinanceAuditAction" NOT NULL,
  "actorId" TEXT,
  "actorEmail" TEXT,
  "requestId" TEXT,
  "reason" TEXT,
  "beforeState" JSONB,
  "afterState" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformLedgerEntry_reversesEntryId_key" ON "PlatformLedgerEntry"("reversesEntryId");
CREATE INDEX "FinanceAuditLog_entityType_entityId_idx" ON "FinanceAuditLog"("entityType", "entityId");
CREATE INDEX "FinanceAuditLog_action_idx" ON "FinanceAuditLog"("action");
CREATE INDEX "FinanceAuditLog_requestId_idx" ON "FinanceAuditLog"("requestId");
CREATE INDEX "FinanceAuditLog_createdAt_idx" ON "FinanceAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PlatformLedgerEntry"
  ADD CONSTRAINT "PlatformLedgerEntry_reversesEntryId_fkey"
  FOREIGN KEY ("reversesEntryId") REFERENCES "PlatformLedgerEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceAuditLog"
  ADD CONSTRAINT "FinanceAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- A locked finance record may be created freely, but once locked it must only be
-- corrected through additional records (for example reversals), never by mutation.
CREATE OR REPLACE FUNCTION prevent_locked_finance_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finance table % is append-only; delete is not allowed.', TG_TABLE_NAME;
  END IF;

  IF OLD."immutableLockedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Finance table % is locked; update is not allowed.', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_finance_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'FinanceAuditLog is append-only; update/delete is not allowed.';
END;
$$;

CREATE TRIGGER "PlatformInvoice_lock_guard"
BEFORE UPDATE OR DELETE ON "PlatformInvoice"
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_finance_record_mutation();

CREATE TRIGGER "PlatformInvoiceLine_lock_guard"
BEFORE UPDATE OR DELETE ON "PlatformInvoiceLine"
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_finance_record_mutation();

CREATE TRIGGER "PlatformLedgerEntry_lock_guard"
BEFORE UPDATE OR DELETE ON "PlatformLedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_finance_record_mutation();

CREATE TRIGGER "PlatformDocument_lock_guard"
BEFORE UPDATE OR DELETE ON "PlatformDocument"
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_finance_record_mutation();

CREATE TRIGGER "PlatformCreditPurchase_lock_guard"
BEFORE UPDATE OR DELETE ON "PlatformCreditPurchase"
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_finance_record_mutation();

CREATE TRIGGER "PlatformCreditUsage_lock_guard"
BEFORE UPDATE OR DELETE ON "PlatformCreditUsage"
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_finance_record_mutation();

CREATE TRIGGER "FinanceAuditLog_append_only_guard"
BEFORE UPDATE OR DELETE ON "FinanceAuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_finance_audit_log_mutation();
