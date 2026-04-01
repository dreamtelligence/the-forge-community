WITH target_user AS (
  SELECT id FROM "User" WHERE email = 'info@stakeandscale.de' LIMIT 1
),
asset_id AS (
  SELECT 'c' || substring(md5(random()::text || clock_timestamp()::text), 1, 24) AS id
)
INSERT INTO "MediaAsset"
  ("id","ventureId","ownerId","type","url","filename","mimeType","size","source","tags","createdAt","updatedAt")
SELECT
  asset_id.id,
  'cml46m9d80002vdt082ysom4k',
  target_user.id,
  'VIDEO',
  '/0.mp4',
  '0.mp4',
  'video/mp4',
  7971251,
  'GENERATED',
  ARRAY[]::text[],
  now(),
  now()
FROM target_user, asset_id;
