-- ============================================
-- MIGRATION: AI Action Log + Confirmation
-- Date: 2026-02-04
-- Description: Track AI-triggered actions with confirmation + audit
-- ============================================

-- ============================================
-- STEP 0: Enum
-- ============================================

DO $$ BEGIN
  CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXECUTED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- STEP 1: Table
-- ============================================

CREATE TABLE IF NOT EXISTS "AiAction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ventureId" TEXT,
  "toolName" TEXT NOT NULL,
  "status" "AiActionStatus" NOT NULL DEFAULT 'PENDING',
  "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
  "confirmationToken" TEXT,
  "summary" TEXT,
  "payload" JSONB,
  "result" JSONB,
  "error" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiAction_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 2: Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS "AiAction_userId_idx" ON "AiAction"("userId");
CREATE INDEX IF NOT EXISTS "AiAction_ventureId_idx" ON "AiAction"("ventureId");
CREATE INDEX IF NOT EXISTS "AiAction_status_idx" ON "AiAction"("status");
CREATE INDEX IF NOT EXISTS "AiAction_toolName_idx" ON "AiAction"("toolName");
CREATE INDEX IF NOT EXISTS "AiAction_createdAt_idx" ON "AiAction"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AiAction_confirmationToken_key" ON "AiAction"("confirmationToken");

-- ============================================
-- STEP 3: Foreign Keys
-- ============================================

ALTER TABLE "AiAction"
  ADD CONSTRAINT "AiAction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiAction"
  ADD CONSTRAINT "AiAction_ventureId_fkey"
  FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- STEP 4: Row-Level Security
-- ============================================

ALTER TABLE "AiAction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_action_select_own" ON "AiAction"
  FOR SELECT
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "ai_action_insert_own" ON "AiAction"
  FOR INSERT
  WITH CHECK (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
  );

CREATE POLICY "ai_action_update_own" ON "AiAction"
  FOR UPDATE
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "ai_action_delete_own" ON "AiAction"
  FOR DELETE
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
