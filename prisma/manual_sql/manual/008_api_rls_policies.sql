-- ============================================
-- API Key Management - RLS Policies
-- ============================================
-- Must be run manually after db push
-- Date: 2026-02-01

-- Enable RLS on API tables
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiWebhook" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ApiKey: Users see own keys" ON "ApiKey";
DROP POLICY IF EXISTS "ApiRequest: Users see own requests" ON "ApiRequest";
DROP POLICY IF EXISTS "ApiWebhook: Users see own webhooks" ON "ApiWebhook";

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

-- ApiRequest Insert: Allow all inserts (used by API auth middleware)
CREATE POLICY "ApiRequest: Allow inserts"
  ON "ApiRequest"
  FOR INSERT
  WITH CHECK (true);

-- ApiWebhook Policies: Users see own webhooks
CREATE POLICY "ApiWebhook: Users see own webhooks"
  ON "ApiWebhook"
  FOR ALL
  USING (
    "userId" = current_setting('app.user_id', true)::TEXT
    OR current_setting('app.is_admin', true)::BOOLEAN = true
  );
