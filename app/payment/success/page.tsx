'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Zap, ArrowRight } from 'lucide-react';

type BillingSummary = {
  credits: number;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  subscriptionEndsAt: string | null;
};

export default function PaymentSuccessPage() {
  const sp = useSearchParams();
  const type = (sp.get('type') || 'credits') as 'credits' | 'subscription';
  const returnTo = sp.get('returnTo');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<BillingSummary | null>(null);

  const primaryCtaHref = useMemo(() => {
    if (returnTo && returnTo.startsWith('/')) return returnTo;
    return '/studio';
  }, [returnTo]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await fetch('/api/billing/summary');
        const data = res.ok ? await res.json() : null;
        if (!mounted) return;
        setSummary(data);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
              Zahlung erfolgreich
            </div>
            <h1 className="text-2xl font-instrument-serif text-white">
              {type === 'subscription' ? 'Abo aktiviert' : 'Credits gutgeschrieben'}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/70">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm">Dein aktueller Credit-Stand</span>
            </div>
            <div className="text-lg font-bold text-white">
              {loading ? '…' : (summary?.credits ?? '—')}
            </div>
          </div>
          <div className="text-xs text-white/40 mt-2">
            {type === 'subscription'
              ? 'Du kannst jetzt Pro-Features nutzen. KI-Usage wird transparent separat berechnet.'
              : 'Du kannst direkt weiter generieren.'}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={primaryCtaHref}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] py-4 font-bold uppercase tracking-[0.2em] text-[11px]"
          >
            Weiter machen
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.02] text-white/80 py-4 font-bold uppercase tracking-[0.2em] text-[11px]"
          >
            Preise ansehen
          </Link>
        </div>
      </div>
    </div>
  );
}
