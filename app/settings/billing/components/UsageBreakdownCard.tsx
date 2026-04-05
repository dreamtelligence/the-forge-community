'use client';

import { BarChart3 } from 'lucide-react';

type UsageItem = {
  id: string;
  usedAt: Date;
  credits: number;
  provider: string | null;
  feature: string | null;
  totalChargeEur: number;
  providerCostEur: number;
  platformFeeEur: number;
};

const formatEur = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);

export function UsageBreakdownCard(props: {
  windowDays: number;
  summary: {
    totalCredits: number;
    totalChargeEur: number;
    providerCostEur: number;
    platformFeeEur: number;
  };
  items: UsageItem[];
}) {
  const { windowDays, summary, items } = props;
  const formatTimestamp = (value: Date) =>
    new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(value));

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
            Usage Breakdown
          </div>
          <h2 className="text-3xl font-instrument-serif text-white">
            Letzte {windowDays} Tage
          </h2>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Credits</div>
          <div className="text-xl font-semibold text-white mt-1">{summary.totalCredits}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Total</div>
          <div className="text-xl font-semibold text-white mt-1">{formatEur(summary.totalChargeEur)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Provider Cost</div>
          <div className="text-xl font-semibold text-white mt-1">{formatEur(summary.providerCostEur)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Platform Fee</div>
          <div className="text-xl font-semibold text-white mt-1">{formatEur(summary.platformFeeEur)}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">Letzte Jobs</div>
        {items.length === 0 ? (
          <p className="text-sm text-white/40">Noch keine Usage-Einträge im Zeitraum.</p>
        ) : (
          items.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]"
            >
              <div>
                <div className="text-sm text-white font-medium">
                  {(item.provider || 'provider').toUpperCase()} · {item.feature || 'usage'}
                </div>
                <div className="text-xs text-white/40">
                  {formatTimestamp(item.usedAt)} · {item.credits} Credits
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white">{formatEur(item.totalChargeEur)}</div>
                <div className="text-xs text-white/40">
                  Prov {formatEur(item.providerCostEur)} · Fee {formatEur(item.platformFeeEur)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
