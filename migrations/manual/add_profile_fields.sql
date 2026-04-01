-- Adds missing profile fields to the User table so the Dossier form persists data
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS addressStreet TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS addressCity TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS addressZip TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS addressCountry TEXT DEFAULT 'Germany';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Optional index for lookups by phone (comment out if not needed)
-- CREATE INDEX IF NOT EXISTS idx_user_phone ON "User"(phone);
