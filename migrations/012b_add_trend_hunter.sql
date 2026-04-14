-- Trend Hunter System
-- Stores AI-generated trend analysis reports based on Brand DNA

CREATE TABLE "TrendReport" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    -- Search Context
    "category" TEXT NOT NULL, -- e.g. "Sustainable Fashion"
    "timeframe" TEXT NOT NULL DEFAULT 'current_month',
    
    -- Results (JSON)
    -- Structure: { 
    --   sources: string[], 
    --   trends: Array<{
    --     title: string, 
    --     description: string, 
    --     matchScore: number, 
    --     reasoning: string,
    --     platform: 'tiktok' | 'amazon' | 'google' | 'general'
    --   }> 
    -- }
    "data" JSONB NOT NULL,
    
    -- Status
    "status" TEXT NOT NULL DEFAULT 'COMPLETED', -- PENDING, COMPLETED, FAILED

    CONSTRAINT "TrendReport_pkey" PRIMARY KEY ("id")
);

-- Add Foreign Key
ALTER TABLE "TrendReport" ADD CONSTRAINT "TrendReport_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add Index for fast retrieval
CREATE INDEX "TrendReport_ventureId_idx" ON "TrendReport"("ventureId");
