import { sql } from '@vercel/postgres';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isAdminRole, isConfiguredAdminEmail } from '@/lib/admin-access';

/**
 * Database Security Helpers
 *
 * Sets Postgres session variables for Row-Level Security (RLS).
 * Call these before ANY database query in API routes.
 */

/**
 * Sets the current user email in Postgres session for RLS policies
 * @param email - User email from session
 */
export async function setCurrentUser(email: string) {
  try {
    await sql`SELECT set_config('app.current_user_email', ${email}, false);`;
  } catch (error) {
    console.error('Failed to set current user:', error);
  }
}

/**
 * Sets admin flag in Postgres session to bypass RLS
 * @param isAdmin - Whether the current user is an admin
 */
export async function setAdminMode(isAdmin: boolean) {
  try {
    await sql`SELECT set_config('app.is_admin', ${isAdmin ? 'true' : 'false'}, false);`;
  } catch (error) {
    console.error('Failed to set admin mode:', error);
  }
}

/**
 * Clears all session variables (cleanup)
 */
export async function clearSessionVars() {
  try {
    await sql`SELECT set_config('app.current_user_email', '', false);`;
    await sql`SELECT set_config('app.is_admin', 'false', false);`;
  } catch (error) {
    console.error('Failed to clear session vars:', error);
  }
}

/**
 * Wrapper for secure database queries
 * Automatically sets user context before query execution
 *
 * @example
 * const result = await secureQuery(async () => {
 *   return await sql`SELECT * FROM users WHERE id = ${userId}`;
 * });
 */
export async function secureQuery<T>(
  queryFn: () => Promise<T>,
  options?: { bypassRLS?: boolean }
): Promise<T> {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error('Unauthorized - No active session');
  }

  // Set session variables
  await setCurrentUser(session.user.email);

  // Check if user is admin
  let isAdmin = isConfiguredAdminEmail(session.user.email);
  if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    isAdmin = isAdminRole(user?.role);
  }
  await setAdminMode(options?.bypassRLS && isAdmin ? true : false);

  try {
    // Execute the query with RLS context
    const result = await queryFn();
    return result;
  } finally {
    // Cleanup (optional, as session variables are per-transaction)
    // await clearSessionVars();
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) {
    return false;
  }

  if (isConfiguredAdminEmail(session.user.email)) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  return isAdminRole(user?.role);
}

/**
 * Verifies if the current user has access to the specified squad.
 * Throws an error if access is denied.
 * @param squadId - The ID of the squad to check access for
 */
export async function verifySquadAccess(squadId: string) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      role: true,
      squadMemberships: {
        where: { leftAt: null },
        select: { squadId: true }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'ADMIN') {
    return true; // Admins have access to all squads
  }

  const userSquadIds = user.squadMemberships.map(m => m.squadId);
  if (!userSquadIds.includes(squadId)) {
    throw new Error('Access denied: You are not a member of this squad');
  }

  return true;
}
