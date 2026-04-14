-- Competitor Watchdog System
-- Stores snapshots of competitor websites to detect changes in pricing, messaging, and products.

CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "competitorUrl" TEXT NOT NULL,
    "competitorName" TEXT,
    
    -- Change Detection Hashes
    "contentHash" TEXT,      -- Hash of the main body text (to detect messaging changes)
    "priceHash" TEXT,        -- Hash/Summary of detected prices
    "productHash" TEXT,      -- Hash of detected product titles
    
    -- Structured Data
    -- { prices: [19.99, 29.99], keywords: ["organic", "sale"], adsFound: boolean }
    "data" JSONB NOT NULL,
    
    -- Metrics
    "changesDetected" BOOLEAN DEFAULT false,
    "changeSummary" TEXT,    -- "Price dropped by 10%", "New product launch"
    
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

-- Add Foreign Key
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "CompetitorSnapshot_ventureId_idx" ON "CompetitorSnapshot"("ventureId");
CREATE INDEX "CompetitorSnapshot_competitorUrl_idx" ON "CompetitorSnapshot"("competitorUrl");
CREATE INDEX "CompetitorSnapshot_scannedAt_idx" ON "CompetitorSnapshot"("scannedAt");
