/*
  Warnings:

  - You are about to drop the column `completedSteps` on the `Venture` table. All the data in the column will be lost.
  - You are about to drop the column `currentStep` on the `Venture` table. All the data in the column will be lost.

*/
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

-- AlterTable
ALTER TABLE "Squad" ADD COLUMN     "maxMembers" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "minMembers" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "mission" TEXT,
ADD COLUMN     "squadType" TEXT NOT NULL DEFAULT 'venture',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'forming';

-- AlterTable
ALTER TABLE "Venture" DROP COLUMN "completedSteps",
DROP COLUMN "currentStep",
ADD COLUMN     "currentPhase" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "SquadWallet" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "budgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "budgetSamples" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "budgetProduction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "budgetMarketing" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenturePhase" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenturePhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityType" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SquadWallet_squadId_key" ON "SquadWallet"("squadId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "VenturePhase_ventureId_phaseNumber_key" ON "VenturePhase"("ventureId", "phaseNumber");

-- CreateIndex
CREATE INDEX "TimeEntry_squadId_idx" ON "TimeEntry"("squadId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");

-- AddForeignKey
ALTER TABLE "SquadWallet" ADD CONSTRAINT "SquadWallet_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "SquadWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenturePhase" ADD CONSTRAINT "VenturePhase_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
