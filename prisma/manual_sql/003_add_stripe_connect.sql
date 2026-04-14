-- ============================================
-- MIGRATION: Stripe Connect Integration
-- Date: 2026-01-19
-- Description: Rechtlich sauberes Payment-System ohne Geld-Holding
-- ============================================

-- WICHTIG: Wir halten KEIN Geld!
-- Alle Zahlungen laufen über Stripe Connect
-- Gelder gehen direkt an Squad Connected Accounts
-- Wir erhalten automatisch Platform Fees von Stripe

-- Step 1: Add Stripe Subscription fields to User
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT DEFAULT 'founder',
ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP(3);

-- Step 2: Add Stripe Connect fields to Squad
ALTER TABLE "Squad"
ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "stripeAccountStatus" TEXT,
ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN DEFAULT false;

-- Step 3: Create TransactionType enum
DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM (
        'SALE',
        'REFUND',
        'PLATFORM_FEE',
        'PAYOUT',
        'SUBSCRIPTION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Create TransactionStatus enum
DO $$ BEGIN
    CREATE TYPE "TransactionStatus" AS ENUM (
        'PENDING',
        'SUCCEEDED',
        'FAILED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 5: Create SquadTransaction table (Transaction Log, NO money holding!)
CREATE TABLE IF NOT EXISTS "SquadTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squadId" TEXT NOT NULL,

    -- Transaction Details
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',

    -- Stripe IDs (for tracking only!)
    "stripePaymentIntentId" TEXT UNIQUE,
    "stripeChargeId" TEXT,
    "stripeTransferId" TEXT,

    -- Platform Fee (our commission)
    "platformFeeAmount" DOUBLE PRECISION,
    "platformFeePercent" DOUBLE PRECISION,

    -- Description & Metadata
    "description" TEXT,
    "metadata" JSONB,

    -- Related Order/Customer
    "customerEmail" TEXT,
    "orderId" TEXT,

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    -- Foreign Key
    CONSTRAINT "SquadTransaction_squadId_fkey" FOREIGN KEY ("squadId")
        REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS "SquadTransaction_squadId_idx" ON "SquadTransaction"("squadId");
CREATE INDEX IF NOT EXISTS "SquadTransaction_type_idx" ON "SquadTransaction"("type");
CREATE INDEX IF NOT EXISTS "SquadTransaction_status_idx" ON "SquadTransaction"("status");
CREATE INDEX IF NOT EXISTS "SquadTransaction_createdAt_idx" ON "SquadTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS "SquadTransaction_stripePaymentIntentId_idx" ON "SquadTransaction"("stripePaymentIntentId");

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check User Stripe fields
SELECT
    COUNT(*) FILTER (WHERE "stripeCustomerId" IS NOT NULL) AS users_with_stripe,
    COUNT(*) AS total_users
FROM "User";

-- Check Squad Stripe Connect accounts
SELECT
    COUNT(*) FILTER (WHERE "stripeConnectedAccountId" IS NOT NULL) AS squads_with_connect,
    COUNT(*) FILTER (WHERE "stripeOnboardingComplete" = true) AS squads_onboarded,
    COUNT(*) AS total_squads
FROM "Squad";

-- Check Transaction enums
SELECT unnest(enum_range(NULL::"TransactionType")) AS transaction_types;
SELECT unnest(enum_range(NULL::"TransactionStatus")) AS transaction_statuses;

-- Sample transactions (should be empty initially)
SELECT
    type,
    status,
    COUNT(*) AS count,
    SUM(amount) AS total_amount,
    SUM("platformFeeAmount") AS total_platform_fees
FROM "SquadTransaction"
GROUP BY type, status;
