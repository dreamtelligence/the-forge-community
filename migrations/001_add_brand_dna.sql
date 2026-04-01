-- ============================================
-- MIGRATION: Add BrandDNA Table
-- Date: 2026-01-19
-- Description: Creates the BrandDNA table for AI context and brand identity
-- ============================================

-- Create BrandDNA table
CREATE TABLE IF NOT EXISTS "BrandDNA" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL UNIQUE,

    -- Core Identity
    "brandName" TEXT NOT NULL,
    "tagline" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Voice & Tone (for AI content generation)
    "toneOfVoice" TEXT,
    "personality" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "writingStyle" TEXT,

    -- Target Audience
    "targetAudience" JSONB,
    "customerPersona" TEXT,

    -- Visual Identity
    "primaryColor" TEXT,
    "secondaryColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logoUrl" TEXT,
    "fontFamily" TEXT,

    -- Product/Service
    "productCategory" TEXT,
    "keyFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usp" TEXT,

    -- Competitors (for context)
    "competitors" JSONB,

    -- AI Context (Most Important!)
    "aiContext" TEXT,
    "doNotMention" TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    -- Foreign Key
    CONSTRAINT "BrandDNA_ventureId_fkey" FOREIGN KEY ("ventureId")
        REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS "BrandDNA_ventureId_idx" ON "BrandDNA"("ventureId");

-- ============================================
-- VERIFICATION QUERIES (run these to check)
-- ============================================

-- Check if table was created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'BrandDNA'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'BrandDNA';
