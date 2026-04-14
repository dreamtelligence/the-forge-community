import { prisma } from '@/lib/database/prisma';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/admin';

/**
 * Admin API: Delete User Account
 * Sets accountStatus to DELETED (soft delete)
 */

export async function POST(req: Request) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, accountStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.accountStatus === 'DELETED') {
      return NextResponse.json({ error: 'User already deleted' }, { status: 400 });
    }

    // Soft delete: Set accountStatus to DELETED
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'DELETED',
        deletedAt: new Date(),
        deletedReason: 'Admin deletion',
      },
    });

    console.log(`[ADMIN] User ${user.email} soft deleted`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN DELETE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
