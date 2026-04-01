DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'VentureType' AND e.enumlabel = 'INFLUENCER'
  ) THEN
    ALTER TYPE "VentureType" ADD VALUE 'INFLUENCER';
  END IF;
END $$;

ALTER TABLE "Venture"
  ADD COLUMN IF NOT EXISTS "typeLabel" TEXT;
