-- Erstellt die Tabelle ForgeApp manuell
CREATE TABLE IF NOT EXISTS "ForgeApp" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputs" JSONB NOT NULL,
    "workflow" JSONB NOT NULL,
    "template" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForgeApp_pkey" PRIMARY KEY ("id")
);

-- Indizes für Performance hinzufügen
CREATE INDEX IF NOT EXISTS "ForgeApp_ventureId_idx" ON "ForgeApp"("ventureId");
CREATE INDEX IF NOT EXISTS "ForgeApp_ownerId_idx" ON "ForgeApp"("ownerId");

-- Foreign Key Constraints (Verknüpfung zu Venture und User)
-- Hinweis: Wir nutzen 'ON DELETE CASCADE', damit Apps gelöscht werden, wenn das Venture gelöscht wird.
ALTER TABLE "ForgeApp" 
ADD CONSTRAINT "ForgeApp_ventureId_fkey" 
FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForgeApp" 
ADD CONSTRAINT "ForgeApp_ownerId_fkey" 
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
