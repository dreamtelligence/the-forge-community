-- ============================================
-- MIGRATION: Multi-Squad Support (Many-to-Many)
-- Date: 2026-01-19
-- Description: Migrates from User.squadId to SquadMember table
-- ============================================

-- Step 1: Create SquadRole enum
DO $$ BEGIN
    CREATE TYPE "SquadRole" AS ENUM ('LEAD', 'MEMBER', 'GUEST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create SquadMember table
CREATE TABLE IF NOT EXISTS "SquadMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "role" "SquadRole" NOT NULL DEFAULT 'MEMBER',
    "equityShare" DOUBLE PRECISION,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    -- Foreign Keys
    CONSTRAINT "SquadMember_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "SquadMember_squadId_fkey" FOREIGN KEY ("squadId")
        REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE,

    -- Prevent duplicate memberships
    CONSTRAINT "SquadMember_userId_squadId_key" UNIQUE ("userId", "squadId")
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS "SquadMember_userId_idx" ON "SquadMember"("userId");
CREATE INDEX IF NOT EXISTS "SquadMember_squadId_idx" ON "SquadMember"("squadId");
CREATE INDEX IF NOT EXISTS "SquadMember_role_idx" ON "SquadMember"("role");

-- Step 4: Migrate existing data from User.squadId to SquadMember
-- Only if squadId column exists and has data
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'squadId'
    ) THEN
        INSERT INTO "SquadMember" (id, "userId", "squadId", role, "joinedAt")
        SELECT
            'sm_' || gen_random_uuid()::text AS id,
            u.id AS "userId",
            u."squadId" AS "squadId",
            'MEMBER' AS role,
            u."createdAt" AS "joinedAt"
        FROM "User" u
        WHERE u."squadId" IS NOT NULL
        ON CONFLICT ("userId", "squadId") DO NOTHING;

        RAISE NOTICE 'Migrated % users to SquadMember table',
            (SELECT COUNT(*) FROM "User" WHERE "squadId" IS NOT NULL);
    END IF;
END $$;

-- Step 5: Drop old squadId column from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "squadId";

-- ============================================
-- VERIFICATION QUERIES (run these to check)
-- ============================================

-- Check SquadMember table
SELECT COUNT(*) AS "total_memberships" FROM "SquadMember";

-- Check roles distribution
SELECT role, COUNT(*) AS count
FROM "SquadMember"
GROUP BY role;

-- Check users with multiple squads
SELECT "userId", COUNT(*) AS squad_count
FROM "SquadMember"
WHERE "leftAt" IS NULL
GROUP BY "userId"
HAVING COUNT(*) > 1;

-- Verify foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'SquadMember';
