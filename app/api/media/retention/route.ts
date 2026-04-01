import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { LIFECYCLE_CONFIG, resolveRetentionDays } from '@/lib/storage/media-lifecycle';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentRetentionDays = resolveRetentionDays(user);

  return NextResponse.json({
    currentTier: user.role === 'ADMIN' ? 'enterprise' : user.subscriptionTier || 'founder',
    currentRetentionDays,
    tiers: {
      free: LIFECYCLE_CONFIG.RETENTION_DAYS_FREE,
      pro: LIFECYCLE_CONFIG.RETENTION_DAYS_PRO,
      enterprise: LIFECYCLE_CONFIG.RETENTION_DAYS_ENTERPRISE,
    },
  });
}
