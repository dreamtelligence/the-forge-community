-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "voiceId" TEXT,
    "voiceName" TEXT,
    "modelId" TEXT,
    "pronunciationDictionaryId" TEXT,
    "pronunciationDictionaryVersionId" TEXT,
    "voiceSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceProfile_ventureId_key" ON "VoiceProfile"("ventureId");

-- CreateIndex
CREATE INDEX "VoiceProfile_ventureId_idx" ON "VoiceProfile"("ventureId");

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
