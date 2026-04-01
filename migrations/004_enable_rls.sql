-- ============================================
-- MIGRATION: Row-Level Security (RLS)
-- Date: 2026-01-19
-- Description: Datenisolation - User sieht nur seine eigenen Daten
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on Tables
-- ============================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Venture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VentureTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandDNA" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SquadMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SquadTransaction" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: USER Policies
-- ============================================

-- User kann nur eigene Daten sehen
CREATE POLICY "users_select_own" ON "User"
  FOR SELECT
  USING (
    email = current_setting('app.current_user_email', true)
    OR
    current_setting('app.is_admin', true) = 'true'
  );

-- User kann nur eigene Daten updaten
CREATE POLICY "users_update_own" ON "User"
  FOR UPDATE
  USING (email = current_setting('app.current_user_email', true));

-- ============================================
-- STEP 3: VENTURE Policies
-- ============================================

-- User sieht nur eigene Ventures ODER Squad Ventures
CREATE POLICY "ventures_select" ON "Venture"
  FOR SELECT
  USING (
    -- Eigene Ventures
    "ownerId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR
    -- Squad Ventures (wenn User im Squad ist)
    "squadId" IN (
      SELECT "squadId" FROM "SquadMember"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
      AND "leftAt" IS NULL
    )
    OR
    -- Admin sieht alles
    current_setting('app.is_admin', true) = 'true'
  );

-- User kann nur eigene Ventures erstellen
CREATE POLICY "ventures_insert" ON "Venture"
  FOR INSERT
  WITH CHECK (
    "ownerId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
  );

-- User kann nur eigene Ventures updaten (oder Squad Ventures wenn Lead)
CREATE POLICY "ventures_update" ON "Venture"
  FOR UPDATE
  USING (
    "ownerId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR
    -- Squad Lead kann Squad Ventures updaten
    ("squadId" IN (
      SELECT "squadId" FROM "SquadMember"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
      AND role = 'LEAD'
      AND "leftAt" IS NULL
    ))
  );

-- ============================================
-- STEP 4: VENTURE TASK Policies
-- ============================================

CREATE POLICY "venture_tasks_select" ON "VentureTask"
  FOR SELECT
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE "ownerId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
      OR "squadId" IN (
        SELECT "squadId" FROM "SquadMember"
        WHERE "userId" IN (
          SELECT id FROM "User"
          WHERE email = current_setting('app.current_user_email', true)
        )
        AND "leftAt" IS NULL
      )
    )
    OR
    current_setting('app.is_admin', true) = 'true'
  );

-- ============================================
-- STEP 5: BRAND DNA Policies
-- ============================================

CREATE POLICY "brand_dna_select" ON "BrandDNA"
  FOR SELECT
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE "ownerId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
      OR "squadId" IN (
        SELECT "squadId" FROM "SquadMember"
        WHERE "userId" IN (
          SELECT id FROM "User"
          WHERE email = current_setting('app.current_user_email', true)
        )
        AND "leftAt" IS NULL
      )
    )
    OR
    current_setting('app.is_admin', true) = 'true'
  );

-- ============================================
-- STEP 6: SQUAD MEMBER Policies
-- ============================================

-- User sieht nur Memberships von Squads in denen er Mitglied ist
CREATE POLICY "squad_members_select" ON "SquadMember"
  FOR SELECT
  USING (
    -- Eigene Memberships
    "userId" IN (
      SELECT id FROM "User"
      WHERE email = current_setting('app.current_user_email', true)
    )
    OR
    -- Memberships vom gleichen Squad
    "squadId" IN (
      SELECT "squadId" FROM "SquadMember"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
    )
    OR
    current_setting('app.is_admin', true) = 'true'
  );

-- ============================================
-- STEP 7: SQUAD TRANSACTION Policies
-- ============================================

-- User sieht nur Transactions von seinen Squads
CREATE POLICY "squad_transactions_select" ON "SquadTransaction"
  FOR SELECT
  USING (
    "squadId" IN (
      SELECT "squadId" FROM "SquadMember"
      WHERE "userId" IN (
        SELECT id FROM "User"
        WHERE email = current_setting('app.current_user_email', true)
      )
      AND "leftAt" IS NULL
    )
    OR
    current_setting('app.is_admin', true) = 'true'
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Check welche Tabellen RLS haben
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Check alle Policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
