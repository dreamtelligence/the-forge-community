-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("userId", "feature", "windowStart")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_feature_windowStart_idx" ON "RateLimitBucket"("feature", "windowStart");

-- AddForeignKey
ALTER TABLE "RateLimitBucket" ADD CONSTRAINT "RateLimitBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
