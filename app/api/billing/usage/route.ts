import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parseUsageBreakdownFromMetadata } from '@/lib/billing-v2';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const from = new Date();
  from.setDate(from.getDate() - 30);

  const rows = await prisma.platformCreditUsage.findMany({
    where: {
      userId: user.id,
      usedAt: { gte: from },
    },
    orderBy: { usedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      usedAt: true,
      credits: true,
      provider: true,
      model: true,
      feature: true,
      costAmount: true,
      currency: true,
      metadata: true,
    },
  });

  const items = rows.map((row) => {
    const breakdown = parseUsageBreakdownFromMetadata(row.metadata as Record<string, any> | null);
    return {
      id: row.id,
      usedAt: row.usedAt,
      credits: row.credits,
      provider: row.provider,
      model: row.model,
      feature: row.feature,
      totalChargeEur: breakdown?.chargedTotalEur ?? row.costAmount ?? 0,
      providerCostEur: breakdown?.providerCostEur ?? null,
      platformFeeEur: breakdown?.platformFeeEur ?? null,
      currency: row.currency,
    };
  });

  const summary = items.reduce(
    (acc, item) => {
      acc.totalCredits += item.credits;
      acc.totalChargeEur += item.totalChargeEur;
      acc.providerCostEur += item.providerCostEur ?? 0;
      acc.platformFeeEur += item.platformFeeEur ?? 0;
      return acc;
    },
    {
      totalCredits: 0,
      totalChargeEur: 0,
      providerCostEur: 0,
      platformFeeEur: 0,
    }
  );

  return NextResponse.json({
    windowDays: 30,
    summary,
    items,
  });
}
