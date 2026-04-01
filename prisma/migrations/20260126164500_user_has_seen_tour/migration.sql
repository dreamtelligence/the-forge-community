-- Add hasSeenTour flag (guarded for existing column)
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "hasSeenTour" BOOLEAN NOT NULL DEFAULT false;
