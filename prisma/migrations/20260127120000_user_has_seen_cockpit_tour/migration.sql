-- Add hasSeenCockpitTour flag (guarded for existing column)
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "hasSeenCockpitTour" BOOLEAN NOT NULL DEFAULT false;
