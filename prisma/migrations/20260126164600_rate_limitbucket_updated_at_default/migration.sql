-- Ensure updatedAt has default now() (guarded)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'RateLimitBucket'
  ) THEN
    ALTER TABLE "RateLimitBucket" ALTER COLUMN "updatedAt" SET DEFAULT now();
  END IF;
END $$;
