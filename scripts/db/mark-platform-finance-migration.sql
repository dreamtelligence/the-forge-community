DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE "migration_name" = '20260308130000_platform_finance'
  ) THEN
    INSERT INTO "_prisma_migrations"
      ("id","checksum","started_at","finished_at","migration_name","logs","rolled_back_at","applied_steps_count")
    VALUES
      ('20260308130000_platform_finance','5f9ff8ec99bb2b827ab38f8484aa0378343297cfbbf30e32e2ca4de0a9e8c87c',NOW(),NOW(),'20260308130000_platform_finance',NULL,NULL,1);
  END IF;
END
$$;
