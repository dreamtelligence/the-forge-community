import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PageShell from '@/app/components/PageShell';
import AuthGuard from '@/app/components/AuthGuard';
import { BillingOverview } from './components/BillingOverview';
import { SubscriptionCard } from './components/SubscriptionCard';
import { CreditBalanceCard } from './components/CreditBalanceCard';
import { InvoiceList } from './components/InvoiceList';
import { UsageBreakdownCard } from './components/UsageBreakdownCard';
import { parseUsageBreakdownFromMetadata } from '@/lib/billing-v2';
import { resolvePlatformAccess } from '@/lib/platform-access';

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  // Fetch user with all billing-related data
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      credits: true,
      founderNumber: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      role: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      subscriptionEndsAt: true,
      energyTransactions: {
        where: { type: 'GRANT' },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!user) {
    redirect('/login');
  }

  const access = resolvePlatformAccess(user);

  const recentGrants = user.energyTransactions.map((grant) => ({
    id: grant.id,
    delta: grant.delta,
    feature: grant.feature ?? 'other',
    createdAt: grant.createdAt,
  }));

  const invoices = await prisma.platformInvoice.findMany({
    where: {
      OR: [
        { ledgerEntry: { userId: user.id } },
        { buyerEmail: user.email },
      ],
    },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      currency: true,
      status: true,
      issueDate: true,
      pdfUrl: true,
      lineItems: {
        select: {
          id: true,
          description: true,
        },
      },
    },
    orderBy: { issueDate: 'desc' },
    take: 20,
  });

  const usageFrom = new Date();
  usageFrom.setDate(usageFrom.getDate() - 30);

  const usageRows = await prisma.platformCreditUsage.findMany({
    where: {
      userId: user.id,
      usedAt: { gte: usageFrom },
    },
    orderBy: { usedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      usedAt: true,
      credits: true,
      provider: true,
      feature: true,
      costAmount: true,
      metadata: true,
    },
  });

  const usageItems = usageRows.map((row) => {
    const breakdown = parseUsageBreakdownFromMetadata(row.metadata as Record<string, any> | null);
    return {
      id: row.id,
      usedAt: row.usedAt,
      credits: row.credits,
      provider: row.provider,
      feature: row.feature,
      totalChargeEur: breakdown?.chargedTotalEur ?? row.costAmount ?? 0,
      providerCostEur: breakdown?.providerCostEur ?? 0,
      platformFeeEur: breakdown?.platformFeeEur ?? 0,
    };
  });

  const usageSummary = usageItems.reduce(
    (acc, item) => {
      acc.totalCredits += item.credits;
      acc.totalChargeEur += item.totalChargeEur;
      acc.providerCostEur += item.providerCostEur;
      acc.platformFeeEur += item.platformFeeEur;
      return acc;
    },
    { totalCredits: 0, totalChargeEur: 0, providerCostEur: 0, platformFeeEur: 0 }
  );

  return (
    <AuthGuard>
      <PageShell>
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-10">
          {/* Header */}
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.3em]">
              Billing & Abrechnung
            </div>
            <h1 className="text-4xl md:text-5xl font-instrument-serif text-white">
              Abrechnung & Credits
            </h1>
            <p className="text-sm text-white/40">
              Verwalte dein Abo, Credits und Rechnungen
            </p>
          </header>

          {/* Overview Cards */}
          <BillingOverview
            credits={user.credits}
            subscriptionStatus={access.effectiveSubscriptionStatus}
            subscriptionTier={access.effectiveSubscriptionTier}
            accessSource={access.source}
          />

          {/* Subscription Management */}
          <SubscriptionCard
            founderNumber={access.founderNumber}
            subscriptionStatus={access.effectiveSubscriptionStatus}
            subscriptionTier={access.effectiveSubscriptionTier}
            subscriptionEndsAt={user.subscriptionEndsAt}
            accessSource={access.source}
            introFreePlatformAccessLimit={access.introFreePlatformAccessLimit}
          />

          {/* Credit Balance & Purchase */}
          <CreditBalanceCard
            currentCredits={user.credits}
            recentGrants={recentGrants}
          />

          <UsageBreakdownCard
            windowDays={30}
            summary={usageSummary}
            items={usageItems}
          />

          {/* Invoice History */}
          <InvoiceList invoices={invoices} />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
