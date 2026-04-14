-- ============================================
-- MIGRATION 005: Legal Studio - Document Management
-- Created: 2026-01-20
-- Author: System
-- Description: Adds LegalDocument table for AI-powered contract generation
-- ============================================

-- Step 1: Create Enums
-- ============================================

CREATE TYPE "LegalDocumentType" AS ENUM (
  'NDA',
  'SERVICE_AGREEMENT',
  'PARTNERSHIP',
  'SUPPLIER_CONTRACT',
  'EMPLOYMENT',
  'CUSTOM'
);

CREATE TYPE "LegalDocumentStatus" AS ENUM (
  'DRAFT',
  'REVIEW',
  'SENT',
  'SIGNED',
  'ARCHIVED',
  'REJECTED'
);

-- Step 2: Create LegalDocument Table
-- ============================================

CREATE TABLE "LegalDocument" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Relations
  "ventureId" TEXT NOT NULL,
  "squadId" TEXT,
  "createdById" TEXT NOT NULL,

  -- Document Details
  "documentType" "LegalDocumentType" NOT NULL,
  "documentTitle" TEXT NOT NULL,
  "status" "LegalDocumentStatus" NOT NULL DEFAULT 'DRAFT',

  -- AI Generation Context
  "aiPrompt" TEXT,
  "generatedContent" TEXT,

  -- Partner Information
  "partnerCompanyName" TEXT,
  "partnerContactName" TEXT,
  "partnerContactEmail" TEXT,
  "partnerContactPhone" TEXT,
  "partnerAddress" TEXT,

  -- Contract Terms (JSONB for flexibility)
  "contractTerms" JSONB,

  -- File Storage
  "documentUrl" TEXT,
  "signatureUrl" TEXT,

  -- Metadata
  "version" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,

  -- Timestamps
  "sentAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  CONSTRAINT "LegalDocument_ventureId_fkey" FOREIGN KEY ("ventureId")
    REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "LegalDocument_squadId_fkey" FOREIGN KEY ("squadId")
    REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT "LegalDocument_createdById_fkey" FOREIGN KEY ("createdById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 3: Create Performance Indexes
-- ============================================

CREATE INDEX "LegalDocument_ventureId_idx" ON "LegalDocument"("ventureId");
CREATE INDEX "LegalDocument_squadId_idx" ON "LegalDocument"("squadId");
CREATE INDEX "LegalDocument_createdById_idx" ON "LegalDocument"("createdById");
CREATE INDEX "LegalDocument_status_idx" ON "LegalDocument"("status");
CREATE INDEX "LegalDocument_documentType_idx" ON "LegalDocument"("documentType");
CREATE INDEX "LegalDocument_createdAt_idx" ON "LegalDocument"("createdAt" DESC);

-- Step 4: Add Trigger for Updated Timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_legal_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_legal_document_timestamp
BEFORE UPDATE ON "LegalDocument"
FOR EACH ROW
EXECUTE FUNCTION update_legal_document_timestamp();

-- Step 5: Add Comments for Documentation
-- ============================================

COMMENT ON TABLE "LegalDocument" IS 'AI-generated legal documents and contracts for ventures';
COMMENT ON COLUMN "LegalDocument"."documentType" IS 'Type of legal document (NDA, Service Agreement, etc.)';
COMMENT ON COLUMN "LegalDocument"."status" IS 'Document workflow status (Draft → Review → Sent → Signed)';
COMMENT ON COLUMN "LegalDocument"."aiPrompt" IS 'Original AI prompt used for generation (audit trail)';
COMMENT ON COLUMN "LegalDocument"."generatedContent" IS 'AI-generated contract text (before edits)';
COMMENT ON COLUMN "LegalDocument"."contractTerms" IS 'Structured contract terms (duration, payment, scope, etc.)';
COMMENT ON COLUMN "LegalDocument"."version" IS 'Document version number (for revision tracking)';
COMMENT ON COLUMN "LegalDocument"."documentUrl" IS 'URL to PDF export (Vercel Blob Storage)';
COMMENT ON COLUMN "LegalDocument"."signatureUrl" IS 'URL to e-signature service (DocuSign, HelloSign, etc.)';

-- Step 6: Row-Level Security (RLS)
-- ============================================
-- Following the pattern from 004_enable_rls.sql

-- Enable RLS on LegalDocument table
ALTER TABLE "LegalDocument" ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view documents from their own ventures
CREATE POLICY "legal_documents_select_policy" ON "LegalDocument"
FOR SELECT
USING (
  "ventureId" IN (
    -- User owns the venture
    SELECT "id" FROM "Venture" WHERE "ownerId" = current_setting('app.user_id', true)::text
    UNION
    -- OR user is an active squad member of the venture's squad
    SELECT "Venture"."id"
    FROM "Venture"
    INNER JOIN "SquadMember" ON "SquadMember"."squadId" = "Venture"."squadId"
    WHERE "SquadMember"."userId" = current_setting('app.user_id', true)::text
    AND "SquadMember"."leftAt" IS NULL
  )
);

-- Policy 2: Users can create documents for their own ventures
CREATE POLICY "legal_documents_insert_policy" ON "LegalDocument"
FOR INSERT
WITH CHECK (
  "ventureId" IN (
    SELECT "id" FROM "Venture" WHERE "ownerId" = current_setting('app.user_id', true)::text
    UNION
    SELECT "Venture"."id"
    FROM "Venture"
    INNER JOIN "SquadMember" ON "SquadMember"."squadId" = "Venture"."squadId"
    WHERE "SquadMember"."userId" = current_setting('app.user_id', true)::text
    AND "SquadMember"."leftAt" IS NULL
  )
);

-- Policy 3: Users can update documents they created (or are squad LEADs)
CREATE POLICY "legal_documents_update_policy" ON "LegalDocument"
FOR UPDATE
USING (
  "createdById" = current_setting('app.user_id', true)::text
  OR
  "ventureId" IN (
    SELECT "Venture"."id"
    FROM "Venture"
    INNER JOIN "SquadMember" ON "SquadMember"."squadId" = "Venture"."squadId"
    WHERE "SquadMember"."userId" = current_setting('app.user_id', true)::text
    AND "SquadMember"."role" = 'LEAD'
    AND "SquadMember"."leftAt" IS NULL
  )
);

-- Policy 4: Only document creator or squad LEAD can delete
CREATE POLICY "legal_documents_delete_policy" ON "LegalDocument"
FOR DELETE
USING (
  "createdById" = current_setting('app.user_id', true)::text
  OR
  "ventureId" IN (
    SELECT "Venture"."id"
    FROM "Venture"
    INNER JOIN "SquadMember" ON "SquadMember"."squadId" = "Venture"."squadId"
    WHERE "SquadMember"."userId" = current_setting('app.user_id', true)::text
    AND "SquadMember"."role" = 'LEAD'
    AND "SquadMember"."leftAt" IS NULL
  )
);

-- Policy 5: Admins bypass all policies
CREATE POLICY "legal_documents_admin_policy" ON "LegalDocument"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "User"
    WHERE "id" = current_setting('app.user_id', true)::text
    AND "role" = 'ADMIN'
  )
);

-- Step 7: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON "LegalDocument" TO authenticated;

-- ============================================
-- END OF MIGRATION 005
-- ============================================

-- Rollback Script (for reference):
-- DROP TABLE IF EXISTS "LegalDocument" CASCADE;
-- DROP TYPE IF EXISTS "LegalDocumentType" CASCADE;
-- DROP TYPE IF EXISTS "LegalDocumentStatus" CASCADE;
-- DROP FUNCTION IF EXISTS update_legal_document_timestamp() CASCADE;
