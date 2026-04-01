-- Add likes counter to MediaAsset
ALTER TABLE "MediaAsset" ADD COLUMN "likes" INTEGER NOT NULL DEFAULT 0;

-- Create MediaAssetLike join table
CREATE TABLE "MediaAssetLike" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAssetLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAssetLike_assetId_userId_key" ON "MediaAssetLike"("assetId", "userId");
CREATE INDEX "MediaAssetLike_assetId_idx" ON "MediaAssetLike"("assetId");

ALTER TABLE "MediaAssetLike" ADD CONSTRAINT "MediaAssetLike_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAssetLike" ADD CONSTRAINT "MediaAssetLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
