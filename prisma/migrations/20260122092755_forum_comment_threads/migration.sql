-- AlterTable
ALTER TABLE "ForumComment" ADD COLUMN     "likes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "ForumCommentVote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumCommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumCommentVote_commentId_idx" ON "ForumCommentVote"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumCommentVote_commentId_userId_key" ON "ForumCommentVote"("commentId", "userId");

-- CreateIndex
CREATE INDEX "ForumComment_parentId_idx" ON "ForumComment"("parentId");

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumCommentVote" ADD CONSTRAINT "ForumCommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ForumComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumCommentVote" ADD CONSTRAINT "ForumCommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
