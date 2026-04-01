-- CompetitorSnapshot RLS Policies
-- Enforce venture-based access control

ALTER TABLE "CompetitorSnapshot" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitor_snapshot_select" ON "CompetitorSnapshot"
  FOR SELECT
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (
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
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "competitor_snapshot_insert" ON "CompetitorSnapshot"
  FOR INSERT
  WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (
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
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "competitor_snapshot_update" ON "CompetitorSnapshot"
  FOR UPDATE
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (
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
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "competitor_snapshot_delete" ON "CompetitorSnapshot"
  FOR DELETE
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (
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
    OR current_setting('app.is_admin', true) = 'true'
  );
