-- Add character prompt for AI Influencer DNA extraction
ALTER TABLE "BrandDNA" ADD COLUMN IF NOT EXISTS "character_prompt" TEXT;
