-- =============================================
-- VENTURE SYSTEM DATABASE MIGRATION
-- Run this in Neon Dashboard SQL Editor
-- =============================================

-- Add MENTOR role to existing enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MENTOR';

-- Create new enums
DO $$ BEGIN
    CREATE TYPE "VentureType" AS ENUM ('ECOMMERCE', 'SAAS', 'SERVICE', 'MARKETPLACE', 'AGENCY', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VentureStatus" AS ENUM ('IDEATION', 'IN_PROGRESS', 'LAUNCHED', 'PAUSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Venture table
CREATE TABLE IF NOT EXISTS "Venture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VentureType" NOT NULL DEFAULT 'OTHER',
    "status" "VentureStatus" NOT NULL DEFAULT 'IDEATION',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "productType" TEXT,
    "targetMarket" TEXT,
    "brandColors" TEXT,
    "logoUrl" TEXT,
    "pricing" JSONB,
    "marketingBudget" DOUBLE PRECISION,
    "totalBudget" DOUBLE PRECISION,
    "estimatedRevenue" DOUBLE PRECISION,
    "launchDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "squadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venture_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Venture_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id")
);

CREATE INDEX IF NOT EXISTS "Venture_ownerId_idx" ON "Venture"("ownerId");
CREATE INDEX IF NOT EXISTS "Venture_squadId_idx" ON "Venture"("squadId");
CREATE INDEX IF NOT EXISTS "Venture_status_idx" ON "Venture"("status");

-- Create VentureStep table
CREATE TABLE IF NOT EXISTS "VentureStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentureStep_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE,
    CONSTRAINT "VentureStep_ventureId_stepNumber_key" UNIQUE ("ventureId", "stepNumber")
);

CREATE INDEX IF NOT EXISTS "VentureStep_ventureId_idx" ON "VentureStep"("ventureId");

-- Create VentureTask table
CREATE TABLE IF NOT EXISTS "VentureTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "overdueNotifiedAt" TIMESTAMP(3),
    "ventureId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "isFromTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentureTask_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE,
    CONSTRAINT "VentureTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "VentureTask_ventureId_idx" ON "VentureTask"("ventureId");
CREATE INDEX IF NOT EXISTS "VentureTask_assignedToId_idx" ON "VentureTask"("assignedToId");
CREATE INDEX IF NOT EXISTS "VentureTask_dueDate_idx" ON "VentureTask"("dueDate");
CREATE INDEX IF NOT EXISTS "VentureTask_status_idx" ON "VentureTask"("status");

-- Create VentureTemplate table
CREATE TABLE IF NOT EXISTS "VentureTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VentureType" NOT NULL,
    "defaultSteps" JSONB NOT NULL,
    "defaultTasks" JSONB NOT NULL,
    "estimatedDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VentureTemplate_type_idx" ON "VentureTemplate"("type");

-- Create CostItem table
CREATE TABLE IF NOT EXISTS "CostItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "ventureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostItem_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CostItem_ventureId_idx" ON "CostItem"("ventureId");
CREATE INDEX IF NOT EXISTS "CostItem_category_idx" ON "CostItem"("category");

-- Create Resource table
CREATE TABLE IF NOT EXISTS "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT,
    "url" TEXT,
    "contactEmail" TEXT,
    "contactInfo" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minOrderQty" INTEGER,
    "priceRange" TEXT,
    "location" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Resource_category_idx" ON "Resource"("category");
CREATE INDEX IF NOT EXISTS "Resource_type_idx" ON "Resource"("type");

-- Create VentureResource join table
CREATE TABLE IF NOT EXISTS "VentureResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentureResource_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE,
    CONSTRAINT "VentureResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE,
    CONSTRAINT "VentureResource_ventureId_resourceId_key" UNIQUE ("ventureId", "resourceId")
);

CREATE INDEX IF NOT EXISTS "VentureResource_ventureId_idx" ON "VentureResource"("ventureId");
CREATE INDEX IF NOT EXISTS "VentureResource_resourceId_idx" ON "VentureResource"("resourceId");

-- Create MentoringSession table
CREATE TABLE IF NOT EXISTS "MentoringSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "outcome" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentoringSession_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE,
    CONSTRAINT "MentoringSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "MentoringSession_ventureId_idx" ON "MentoringSession"("ventureId");
CREATE INDEX IF NOT EXISTS "MentoringSession_mentorId_idx" ON "MentoringSession"("mentorId");

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Venture System tables created successfully!';
END $$;
