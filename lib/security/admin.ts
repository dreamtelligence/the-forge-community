import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { isAdminRole, isConfiguredAdminEmail } from '@/lib/security/admin-access';

/**
 * Admin Authorization Helpers
 *
 * Centralized admin checks for API routes
 */

async function hasAdminPrivilegesByEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;

  if (isConfiguredAdminEmail(email)) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  return isAdminRole(user?.role);
}

/**
 * Checks if the current session user is an admin
 * @returns boolean
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return hasAdminPrivilegesByEmail(session?.user?.email);
}

/**
 * Requires admin access - returns 403 response if not admin
 * Use in API routes: const adminCheck = await requireAdmin(); if (adminCheck) return adminCheck;
 *
 * @returns NextResponse with 403 if not admin, null if authorized
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!(await hasAdminPrivilegesByEmail(session.user.email))) {
    return NextResponse.json(
      { error: 'Admin access required - Unauthorized' },
      { status: 403 }
    );
  }

  return null; // Authorized
}

/**
 * Alternative: Returns admin status and session
 * @returns { isAdmin: boolean, session: Session | null }
 */
export async function getAdminStatus() {
  const session = await auth();
  const adminCheck = await isAdmin();

  return {
    isAdmin: adminCheck,
    session,
    email: session?.user?.email || null
  };
}
