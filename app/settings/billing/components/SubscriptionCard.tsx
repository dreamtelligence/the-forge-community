'use client';

import { useState } from 'react';
import { CreditCard, X, ArrowUpCircle, Loader2 } from 'lucide-react';

interface SubscriptionCardProps {
  subscriptionStatus: string | null;
  subscriptionTier: string;
  subscriptionEndsAt: Date | null;
}

export function SubscriptionCard({
  subscriptionStatus,
  subscriptionTier,
  subscriptionEndsAt
}: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isPastDue = subscriptionStatus === 'past_due';
  const isCancelled = subscriptionStatus === 'cancelled';
  const hasActiveSubscription =
    subscriptionStatus === 'active' ||
    (isCancelled && subscriptionEndsAt && new Date(subscriptionEndsAt) > new Date());
  const subscriptionEndsAtLabel = subscriptionEndsAt
    ? new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(subscriptionEndsAt))
    : null;

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/subscription/cancel', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Cancellation failed');

      window.location.reload();
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Fehler beim Kündigen. Bitte nochmal versuchen.');
    } finally {
      setIsLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          priceId:
            process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ||
            process.env.NEXT_PUBLIC_STRIPE_PRICE_PLATFORM_ACCESS,
        }),
      });

      if (!res.ok) throw new Error('Checkout failed');

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Fehler beim Upgrade. Bitte nochmal versuchen.');
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Portal creation failed');

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
      alert('Fehler beim Öffnen des Billing Portals.');
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          hasActiveSubscription ? 'bg-green-500/10' : isPastDue ? 'bg-red-500/10' : 'bg-white/5'
        }`}>
          <CreditCard className={`w-6 h-6 ${
            hasActiveSubscription ? 'text-green-500' : isPastDue ? 'text-red-500' : 'text-white/40'
          }`} />
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
            Abonnement
          </div>
          <h2 className="text-2xl font-instrument-serif text-white">
            {hasActiveSubscription
              ? isCancelled
                ? 'Kündigung geplant'
                : 'Pro Plan'
              : isPastDue
                ? 'Zahlung fällig'
                : 'Kein Abo'}
          </h2>
        </div>
      </div>

      {hasActiveSubscription && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Status</span>
            <span className={`font-medium ${isCancelled ? 'text-yellow-400' : 'text-green-500'}`}>
              {isCancelled ? 'Kündigung geplant' : 'Aktiv'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Plan</span>
            <span className="text-white capitalize">{subscriptionTier}</span>
          </div>
          {subscriptionEndsAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">
                {isCancelled ? 'Abo endet am' : 'Nächste Abrechnung'}
              </span>
              <span className="text-white">{subscriptionEndsAtLabel}</span>
            </div>
          )}
          {isCancelled && (
            <div className="text-xs text-white/50">
              Dein Abo endet automatisch. Es erfolgen keine weiteren Abbuchungen.
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              onClick={handleManageBilling}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              ) : (
                'Zahlungsmethode verwalten'
              )}
            </button>
            {!isCancelled && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
              >
                Kündigen
              </button>
            )}
          </div>
        </div>
      )}

      {isPastDue && (
        <div className="space-y-4">
          <p className="text-sm text-red-400">
            Deine letzte Zahlung ist fehlgeschlagen. Bitte aktualisiere deine Zahlungsmethode.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mx-auto animate-spin" />
            ) : (
              'Zahlungsmethode aktualisieren'
            )}
          </button>
        </div>
      )}

      {!hasActiveSubscription && !isPastDue && (
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            Upgrade auf Pro für 49,00€/Monat. KI-Usage wird transparent separat berechnet.
          </p>
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4" />
                Auf Pro upgraden
              </>
            )}
          </button>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl border border-white/10 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-instrument-serif text-white">
                Abo kündigen?
              </h3>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-white/40 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-6">
              Dein Zugriff bleibt bis zum Ende des aktuellen Abrechnungszeitraums bestehen.
              Du erhältst keine weiteren monatlichen Credits.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                ) : (
                  'Jetzt kündigen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
