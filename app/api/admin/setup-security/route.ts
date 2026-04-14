import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/admin';

/**
 * CRITICAL SECURITY SETUP
 *
 * This endpoint implements Row-Level Security (RLS) to prevent data leaks.
 * Only authenticated admins can run this migration.
 *
 * Run once after deployment: POST /api/admin/setup-security
 */
export async function POST() {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  try {
    // Step 1: Enable RLS on users table
    await sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`;

    // Step 2: Drop existing policies if they exist (idempotent)
    await sql`DROP POLICY IF EXISTS users_isolation ON users;`;
    await sql`DROP POLICY IF EXISTS users_own_data ON users;`;

    // Step 3: Create policy - users can only see their own data
    await sql`
      CREATE POLICY users_own_data ON users
      FOR ALL
      USING (email = current_setting('app.current_user_email', true))
      WITH CHECK (email = current_setting('app.current_user_email', true));
    `;

    // Step 4: Allow admin to bypass RLS (for admin panel)
    await sql`
      CREATE POLICY users_admin_access ON users
      FOR ALL
      TO PUBLIC
      USING (
        current_setting('app.is_admin', true)::boolean = true
      );
    `;

    // Step 5: Add karma column for persistent storage
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS karma INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS founder_number INTEGER,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    `;

    // Step 6: Create index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_karma ON users(karma);
    `;

    return NextResponse.json({
      success: true,
      message: 'Row-Level Security enabled successfully',
      appliedPolicies: [
        'users_own_data - Users can only access their own data',
        'users_admin_access - Admins can bypass RLS',
      ],
      addedColumns: ['karma', 'founder_number', 'status'],
      indexes: ['idx_users_email', 'idx_users_karma']
    });
  } catch (error: any) {
    console.error('RLS setup failed:', error);
    return NextResponse.json(
      { error: error.message, hint: 'Check if RLS is already enabled' },
      { status: 500 }
    );
  }
}
