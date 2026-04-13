-- CreateEnum
CREATE TYPE "SquadInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "SquadInvite" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "SquadInviteStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "SquadInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SquadInvite_squadId_invitedUserId_key" ON "SquadInvite"("squadId", "invitedUserId");

-- CreateIndex
CREATE INDEX "SquadInvite_invitedUserId_status_idx" ON "SquadInvite"("invitedUserId", "status");

-- CreateIndex
CREATE INDEX "SquadInvite_squadId_status_idx" ON "SquadInvite"("squadId", "status");

-- AddForeignKey
ALTER TABLE "SquadInvite" ADD CONSTRAINT "SquadInvite_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadInvite" ADD CONSTRAINT "SquadInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadInvite" ADD CONSTRAINT "SquadInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
