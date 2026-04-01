-- ============================================
-- Migration 008: API Key Management System
-- ============================================
-- Description: Adds API key authentication for external access
-- Author: Claude Code
-- Date: 2026-02-01

-- ============================================
-- 1. API Keys Table
-- ============================================

CREATE TABLE IF NOT EXISTS "ApiKey" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "ventureId" TEXT,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL UNIQUE,
  "keyPrefix" TEXT NOT NULL,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rateLimit" INTEGER NOT NULL DEFAULT 100,
  "rateLimitDaily" INTEGER NOT NULL DEFAULT 1000,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApiKey_ventureId_fkey" FOREIGN KEY ("ventureId")
    REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for ApiKey
CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX IF NOT EXISTS "ApiKey_ventureId_idx" ON "ApiKey"("ventureId");
CREATE INDEX IF NOT EXISTS "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- ============================================
-- 2. API Requests Table (Usage Logging)
-- ============================================

CREATE TABLE IF NOT EXISTS "ApiRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "apiKeyId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "creditsUsed" INTEGER,
  "responseTime" INTEGER,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApiRequest_apiKeyId_fkey" FOREIGN KEY ("apiKeyId")
    REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for ApiRequest
CREATE INDEX IF NOT EXISTS "ApiRequest_apiKeyId_createdAt_idx" ON "ApiRequest"("apiKeyId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequest_endpoint_idx" ON "ApiRequest"("endpoint");

-- ============================================
-- 3. API Webhooks Table
-- ============================================

CREATE TABLE IF NOT EXISTS "ApiWebhook" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "ventureId" TEXT,
  "url" TEXT NOT NULL,
  "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "secret" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastTriggeredAt" TIMESTAMP(3),
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApiWebhook_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApiWebhook_ventureId_fkey" FOREIGN KEY ("ventureId")
    REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for ApiWebhook
CREATE INDEX IF NOT EXISTS "ApiWebhook_userId_idx" ON "ApiWebhook"("userId");
CREATE INDEX IF NOT EXISTS "ApiWebhook_ventureId_idx" ON "ApiWebhook"("ventureId");

-- ============================================
-- 4. Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for ApiKey
DROP TRIGGER IF EXISTS update_apikey_updated_at ON "ApiKey";
CREATE TRIGGER update_apikey_updated_at
  BEFORE UPDATE ON "ApiKey"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ApiWebhook
DROP TRIGGER IF EXISTS update_apiwebhook_updated_at ON "ApiWebhook";
CREATE TRIGGER update_apiwebhook_updated_at
  BEFORE UPDATE ON "ApiWebhook"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Row-Level Security (RLS) Policies
-- ============================================

-- Enable RLS on API tables
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiWebhook" ENABLE ROW LEVEL SECURITY;

-- ApiKey Policies: Users can only see their own keys
CREATE POLICY "ApiKey: Users see own keys"
  ON "ApiKey"
  FOR ALL
  USING (
    "userId" = current_setting('app.user_id', true)::TEXT
    OR current_setting('app.is_admin', true)::BOOLEAN = true
  );

-- ApiRequest Policies: Users see requests for their keys
CREATE POLICY "ApiRequest: Users see own requests"
  ON "ApiRequest"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "ApiKey"
      WHERE "ApiKey"."id" = "ApiRequest"."apiKeyId"
      AND "ApiKey"."userId" = current_setting('app.user_id', true)::TEXT
    )
    OR current_setting('app.is_admin', true)::BOOLEAN = true
  );

-- ApiWebhook Policies: Users see own webhooks
CREATE POLICY "ApiWebhook: Users see own webhooks"
  ON "ApiWebhook"
  FOR ALL
  USING (
    "userId" = current_setting('app.user_id', true)::TEXT
    OR current_setting('app.is_admin', true)::BOOLEAN = true
  );

-- ============================================
-- Migration Complete
-- ============================================
