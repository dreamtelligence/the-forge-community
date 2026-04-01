-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "isPersonalStudio" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Venture_ownerId_isPersonalStudio_idx" ON "Venture"("ownerId", "isPersonalStudio");

-- CreateIndex
CREATE UNIQUE INDEX "Venture_personal_studio_owner_unique" ON "Venture"("ownerId")
WHERE "isPersonalStudio" = true;
