-- ============================================
-- MIGRATION: Add Slack Integration Support
-- Date: 2026-02-01
-- Description: Adds metadata column to IntegrationConnection for Slack settings
-- ============================================

-- Add metadata column to IntegrationConnection for provider-specific settings
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS "IntegrationConnection_metadata_idx" 
ON "IntegrationConnection" USING GIN ("metadata");

-- ============================================
-- VERIFICATION QUERIES (run these to check)
-- ============================================

-- Check if column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'IntegrationConnection' 
AND column_name = 'metadata';

-- Check if index was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'IntegrationConnection' 
AND indexname = 'IntegrationConnection_metadata_idx';
