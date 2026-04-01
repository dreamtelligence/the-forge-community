'use client';

import { Zap, Plus } from 'lucide-react';
import Link from 'next/link';

interface CreditBalanceCardProps {
  currentCredits: number;
  recentGrants: Array<{
    id: string;
    delta: number;
    feature: string;
    createdAt: Date;
  }>;
}

export function CreditBalanceCard({ currentCredits, recentGrants }: CreditBalanceCardProps) {
  const isLow = currentCredits < 20;

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isLow ? 'bg-red-500/10' : 'bg-[var(--accent)]/10'
          }`}>
            <Zap className={`w-6 h-6 ${isLow ? 'text-red-400' : 'text-[var(--accent)]'}`} />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
              Credit Balance
            </div>
            <h2 className="text-3xl font-instrument-serif text-white">
              {currentCredits}
            </h2>
          </div>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Credits kaufen
        </Link>
      </div>

      {isLow && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">
            ⚠️ Deine Credits sind niedrig. Kaufe Credits nach, um weiter AI-Features zu nutzen.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
          Letzte Gutschriften
        </div>

        {recentGrants.length === 0 ? (
          <p className="text-sm text-white/40">Keine Credits erhalten</p>
        ) : (
          <div className="space-y-2">
            {recentGrants.slice(0, 5).map((grant) => (
              <div
                key={grant.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">
                      +{grant.delta} Credits
                    </div>
                    <div className="text-xs text-white/40">
                      {grant.feature === 'credit-purchase' && 'Kauf'}
                      {grant.feature === 'monthly-subscription-credits' && 'Monatliches Abo'}
                      {grant.feature === 'signup' && 'Willkommensbonus'}
                      {grant.feature === 'other' && 'Gutschrift'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-white/40">
                  {new Date(grant.createdAt).toLocaleDateString('de-DE')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
