'use client';

import { useState } from 'react';
import { X, Zap, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Pack = {
  id: 'small' | 'medium' | 'large';
  label: string;
  priceEur: string;
  credits: number;
  priceId: string;
  popular?: boolean;
};

export function CreditsTopUpModal(props: {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
  requiredCredits?: number | null;
  creditsAvailable?: number | null;
}) {
  const { open, onClose, returnTo, requiredCredits, creditsAvailable } = props;
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  if (!open) return null;

  const packs: Pack[] = [
    {
      id: 'small',
      label: '100 Credits',
      priceEur: '12,90',
      credits: 100,
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_SMALL_NEW ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_SMALL ||
        'price_1SyUUuAmspxoSxsTjPKULQlM',
    },
    {
      id: 'medium',
      label: '400 Credits',
      priceEur: '49,99',
      credits: 400,
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM_NEW ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM ||
        'price_1SyUYYAmspxoSxsTsRUjnNzx',
      popular: true,
    },
    {
      id: 'large',
      label: '1000 Credits',
      priceEur: '119,00',
      credits: 1000,
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_LARGE_NEW ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_LARGE ||
        'price_1SyUbKAmspxoSxsTbdepo69M',
    },
  ];

  const startCheckout = async (pack: Pack) => {
    setLoadingPack(pack.id);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'credits', priceId: pack.priceId, returnTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Checkout failed');
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (e: any) {
      alert(e?.message || 'Checkout fehlgeschlagen');
      setLoadingPack(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,153,0,0.14),transparent_42%),rgba(2,4,8,0.86)] backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#0B0F14]/95 p-6 shadow-[0_26px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-white/50 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
              Credits aufladen
            </div>
            <h3 className="text-xl font-instrument-serif text-white">
              Nicht genug Credits
            </h3>
            {(requiredCredits || creditsAvailable) && (
              <p className="text-sm text-white/50 mt-1">
                Benötigt: <b className="text-white">{requiredCredits ?? '—'}</b> · Verfügbar:{' '}
                <b className="text-white">{creditsAvailable ?? '—'}</b>
              </p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {packs.map((p) => (
            <button
              key={p.id}
              onClick={() => startCheckout(p)}
              disabled={!!loadingPack}
              className={cn(
                'relative text-left rounded-2xl border p-4 transition',
                p.popular
                  ? 'border-[var(--accent)]/40 bg-white/[0.04]'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/20',
                loadingPack && 'opacity-70'
              )}
            >
              {p.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1 rounded-full">
                    Beliebt
                  </span>
                </div>
              )}
              <div className="text-white font-semibold">{p.label}</div>
              <div className="text-white/60 text-xs mt-1">{p.credits} AI Credits</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-white text-lg font-bold">{p.priceEur}€</div>
                <div className="text-white/40 text-xs">einmalig</div>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                {loadingPack === p.id ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Weiterleitung…
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    Kaufen
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 text-xs text-white/40">
          Credits verfallen nicht. Du wirst nach dem Checkout zurückgeleitet.
        </div>
      </div>
    </div>
  );
}
