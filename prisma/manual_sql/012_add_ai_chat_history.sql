-- ============================================
-- MIGRATION: AI Chat History
-- Date: 2026-02-04
-- Description: Persisted AI chat threads + messages with RLS
-- ============================================

-- ============================================
-- STEP 1: Tables
-- ============================================

CREATE TABLE "AiChatThread" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiChatThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiChatMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "mode" TEXT,
  "attachments" JSONB,
  "sources" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 2: Indexes
-- ============================================

CREATE INDEX "AiChatThread_userId_idx" ON "AiChatThread"("userId");
CREATE INDEX "AiChatThread_lastMessageAt_idx" ON "AiChatThread"("lastMessageAt");
CREATE INDEX "AiChatMessage_threadId_idx" ON "AiChatMessage"("threadId");
CREATE INDEX "AiChatMessage_createdAt_idx" ON "AiChatMessage"("createdAt");

-- ============================================
-- STEP 3: Foreign Keys
-- ============================================

ALTER TABLE "AiChatThread"
  ADD CONSTRAINT "AiChatThread_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiChatMessage"
  ADD CONSTRAINT "AiChatMessage_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "AiChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STEP 4: Row-Level Security
-- ============================================

ALTER TABLE "AiChatThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiChatMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_thread_select_own" ON "AiChatThread"
  FOR SELECT
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "ai_chat_thread_insert_own" ON "AiChatThread"
  FOR INSERT
  WITH CHECK (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
  );

CREATE POLICY "ai_chat_thread_update_own" ON "AiChatThread"
  FOR UPDATE
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "ai_chat_thread_delete_own" ON "AiChatThread"
  FOR DELETE
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "ai_chat_message_select_own" ON "AiChatMessage"
  FOR SELECT
  USING (
    "threadId" IN (
      SELECT "id" FROM "AiChatThread"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
    )
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "ai_chat_message_insert_own" ON "AiChatMessage"
  FOR INSERT
  WITH CHECK (
    "threadId" IN (
      SELECT "id" FROM "AiChatThread"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
    )
  );

CREATE POLICY "ai_chat_message_update_own" ON "AiChatMessage"
  FOR UPDATE
  USING (
    "threadId" IN (
      SELECT "id" FROM "AiChatThread"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
    )
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "ai_chat_message_delete_own" ON "AiChatMessage"
  FOR DELETE
  USING (
    "threadId" IN (
      SELECT "id" FROM "AiChatThread"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
    )
    OR current_setting('app.is_admin', true) = 'true'
  );
