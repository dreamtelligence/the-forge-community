import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  try {
    // Erweitere die Users Tabelle um die Founder-spezifischen Felder
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS birthday DATE,
      ADD COLUMN IF NOT EXISTS address_street TEXT,
      ADD COLUMN IF NOT EXISTS address_city TEXT,
      ADD COLUMN IF NOT EXISTS address_zip TEXT,
      ADD COLUMN IF NOT EXISTS address_country TEXT,
      ADD COLUMN IF NOT EXISTS instagram TEXT,
      ADD COLUMN IF NOT EXISTS linkedin TEXT,
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS skills TEXT[],
      ADD COLUMN IF NOT EXISTS goal TEXT;
    `;
    return NextResponse.json({ message: "Database schema updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
