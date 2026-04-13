'use client';

import { Zap, CreditCard, TrendingUp } from 'lucide-react';

interface BillingOverviewProps {
  credits: number;
  subscriptionStatus: string | null;
  subscriptionTier: string;
  accessSource?: 'none' | 'promo' | 'stripe' | 'admin';
}

export function BillingOverview({
  credits,
  subscriptionStatus,
  subscriptionTier,
  accessSource = 'none',
}: BillingOverviewProps) {
  const isActive = subscriptionStatus === 'active';
  const isPastDue = subscriptionStatus === 'past_due';
  const isCancelled = subscriptionStatus === 'cancelled';
  const isPromo = accessSource === 'promo';

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Credit Balance */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
              AI Credits
            </div>
            <div className="text-2xl font-instrument-serif text-white">
              {credits}
            </div>
          </div>
        </div>
        <div className="text-xs text-white/40">
          Verfügbare Credits für KI-Features
        </div>
      </div>

      {/* Subscription Status */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isActive ? 'bg-green-500/10' : isPastDue ? 'bg-red-500/10' : 'bg-white/5'
          }`}>
            <CreditCard className={`w-5 h-5 ${
              isActive ? 'text-green-500' : isPastDue ? 'text-red-500' : 'text-white/40'
            }`} />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
              Abo-Status
            </div>
          <div className={`text-2xl font-instrument-serif ${
              isActive
                ? 'text-green-500'
                : isPastDue
                  ? 'text-red-500'
                  : isCancelled
                    ? 'text-yellow-400'
                    : 'text-white'
            }`}>
              {isActive
                ? isPromo
                  ? 'Gratis aktiv'
                  : 'Aktiv'
                : isPastDue
                  ? 'Zahlung fällig'
                  : isCancelled
                    ? 'Kündigung geplant'
                    : 'Kein Abo'}
            </div>
          </div>
        </div>
        <div className="text-xs text-white/40">
          {isActive && (isPromo ? 'Früher Zugang ohne aktives Stripe-Abo' : 'Dein Abo ist aktiv')}
          {isPastDue && 'Bitte aktualisiere deine Zahlungsmethode'}
          {isCancelled && 'Abo läuft aus, keine weitere Abbuchung'}
          {!isActive && !isPastDue && !isCancelled && 'Kein aktives Abonnement'}
        </div>
      </div>

      {/* Current Tier */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
              Aktueller Plan
            </div>
            <div className="text-2xl font-instrument-serif text-white capitalize">
              {subscriptionTier === 'founder' ? 'Free' : subscriptionTier}
            </div>
          </div>
        </div>
        <div className="text-xs text-white/40">
          {subscriptionTier === 'founder' && 'Free Tier'}
          {subscriptionTier === 'pro' && (isPromo ? 'Pro Intro Access' : 'Pro 49,00€/Monat + usage-basiert')}
          {subscriptionTier === 'enterprise' && 'Enterprise'}
        </div>
      </div>
    </div>
  );
}
