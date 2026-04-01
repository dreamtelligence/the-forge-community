-- TrendReport RLS Policies
-- Enforce venture-based access control

ALTER TABLE "TrendReport" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trend_report_select" ON "TrendReport"
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

CREATE POLICY "trend_report_insert" ON "TrendReport"
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

CREATE POLICY "trend_report_update" ON "TrendReport"
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

CREATE POLICY "trend_report_delete" ON "TrendReport"
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
