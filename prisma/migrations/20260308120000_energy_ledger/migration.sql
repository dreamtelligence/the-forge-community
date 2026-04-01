-- CreateEnum
CREATE TYPE "EnergyTransactionType" AS ENUM ('GRANT', 'SPEND', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EnergyTransactionStatus" AS ENUM ('RESERVED', 'SETTLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "EnergyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" "EnergyTransactionType" NOT NULL,
    "status" "EnergyTransactionStatus" NOT NULL DEFAULT 'SETTLED',
    "feature" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "requestId" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "metadata" JSONB,
    "relatedTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnergyTransaction_requestId_key" ON "EnergyTransaction"("requestId");

-- CreateIndex
CREATE INDEX "EnergyTransaction_userId_createdAt_idx" ON "EnergyTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EnergyTransaction_feature_idx" ON "EnergyTransaction"("feature");

-- CreateIndex
CREATE INDEX "EnergyTransaction_status_idx" ON "EnergyTransaction"("status");

-- AddForeignKey
ALTER TABLE "EnergyTransaction" ADD CONSTRAINT "EnergyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyTransaction" ADD CONSTRAINT "EnergyTransaction_relatedTransactionId_fkey" FOREIGN KEY ("relatedTransactionId") REFERENCES "EnergyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
