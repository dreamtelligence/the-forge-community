-- AlterTable (guarded: RateLimitBucket may not exist yet in shadow DB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'RateLimitBucket'
  ) THEN
    ALTER TABLE "RateLimitBucket" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
