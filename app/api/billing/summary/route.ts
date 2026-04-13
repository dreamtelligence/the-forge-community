import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parseUsageBreakdownFromMetadata } from '@/lib/billing-v2';
import { resolvePlatformAccess } from '@/lib/platform-access';

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      credits: true,
      founderNumber: true,
      role: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      subscriptionEndsAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const access = resolvePlatformAccess(user);

  const usageFrom = new Date();
  usageFrom.setDate(usageFrom.getDate() - 30);

  const usageRows = await prisma.platformCreditUsage.findMany({
    where: {
      userId: user.id,
      usedAt: { gte: usageFrom },
    },
    select: {
      credits: true,
      costAmount: true,
      metadata: true,
    },
    take: 200,
  });

  const usageSummary = usageRows.reduce(
    (acc, row) => {
      const breakdown = parseUsageBreakdownFromMetadata(row.metadata as Record<string, any> | null);
      acc.totalCredits += row.credits;
      acc.totalChargeEur += breakdown?.chargedTotalEur ?? row.costAmount ?? 0;
      acc.providerCostEur += breakdown?.providerCostEur ?? 0;
      acc.platformFeeEur += breakdown?.platformFeeEur ?? 0;
      return acc;
    },
    { totalCredits: 0, totalChargeEur: 0, providerCostEur: 0, platformFeeEur: 0 }
  );

  return NextResponse.json({
    credits: user.credits,
    founderNumber: access.founderNumber,
    hasPlatformAccess: access.hasPlatformAccess,
    effectiveSubscriptionStatus: access.effectiveSubscriptionStatus,
    effectiveSubscriptionTier: access.effectiveSubscriptionTier,
    platformAccessSource: access.source,
    isIntroOffer: access.isIntroOffer,
    introFreePlatformAccessLimit: access.introFreePlatformAccessLimit,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionTier: user.subscriptionTier,
    subscriptionEndsAt: user.subscriptionEndsAt,
    usage30d: usageSummary,
  });
}
