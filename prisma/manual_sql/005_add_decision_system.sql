-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('MULTIPLE_CHOICE', 'YES_NO', 'RANKING');
CREATE TYPE "DecisionStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "ventureId" TEXT,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'multiple-choice',
    "options" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'open',
    "deadline" TIMESTAMP(3),
    "requiredQuorum" INTEGER NOT NULL DEFAULT 50,
    "winningThreshold" INTEGER NOT NULL DEFAULT 50,
    "winningOption" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteResponse" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "comment" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Decision_squadId_idx" ON "Decision"("squadId");
CREATE INDEX "Decision_status_idx" ON "Decision"("status");

-- CreateIndex
CREATE INDEX "VoteResponse_decisionId_idx" ON "VoteResponse"("decisionId");
CREATE INDEX "VoteResponse_userId_idx" ON "VoteResponse"("userId");
CREATE UNIQUE INDEX "VoteResponse_decisionId_userId_key" ON "VoteResponse"("decisionId", "userId");

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteResponse" ADD CONSTRAINT "VoteResponse_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoteResponse" ADD CONSTRAINT "VoteResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable (Old Vote)
DROP TABLE IF EXISTS "Vote";
