-- CreateTable
CREATE TABLE "SystemCache" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemCache_key_key" ON "SystemCache"("key");

-- CreateIndex
CREATE INDEX "SystemCache_key_idx" ON "SystemCache"("key");

-- CreateIndex
CREATE INDEX "SystemCache_expiresAt_idx" ON "SystemCache"("expiresAt");
