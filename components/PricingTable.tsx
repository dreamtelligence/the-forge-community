'use client';

import { Check, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { estimateVideoCredits } from '@/lib/billing/credit-pricing';

interface PricingTableProps {
  onSelectPlan?: (type: 'subscription' | 'credits', priceId: string) => void;
  isLoading?: boolean;
}

export function PricingTable({ onSelectPlan, isLoading = false }: PricingTableProps) {
  const [activeTab, setActiveTab] = useState<'subscription' | 'credits'>('subscription');

  // ============================================
  // PLATFORM SUBSCRIPTION
  // ============================================
  const subscription = {
    id: 'platform_access',
    name: 'Platform Access',
    subtitle: 'Monatlicher Zugang',
    price: '49,00',
    period: '/monat',
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PLATFORM_ACCESS ||
      'price_1Su7nCAmspxoSxsTbeDeDJUt',
    features: [
      { text: 'Venture Workspace & Dashboard', highlight: true },
      { text: 'Founder Academy (Playbooks & Trainings)', highlight: true },
      { text: 'Brand DNA & Positionierungs-Studio', highlight: true },
      { text: 'Marketing-, Content- & Legal-KI', highlight: true },
      { text: 'AI Advisor „Orion" (kontextbasiert)', highlight: true },
      { text: 'Squad- & Team-Zusammenarbeit', highlight: false },
      { text: 'KI-Usage transparent nach Provider-Kosten', highlight: false },
      { text: 'Community Hub: Forum, DMs, Squads', highlight: false },
      { text: 'Monatlich kündbar', highlight: false },
    ],
    cta: 'Jetzt starten',
  };

  // ============================================
  // AI CREDIT PACKS (One-Time Purchase)
  // ============================================
  const veoWithAudio = estimateVideoCredits({
    modelId: 'google/veo-3.1',
    durationSeconds: 5,
    generateAudio: true,
    fallbackCredits: 22,
    minimumCredits: 1,
  }).credits;

  const veoWithoutAudio = estimateVideoCredits({
    modelId: 'google/veo-3.1',
    durationSeconds: 5,
    generateAudio: false,
    fallbackCredits: 11,
    minimumCredits: 1,
  }).credits;

  const CREDIT_ESTIMATES = {
    nanoBananaImage: 4,
    veoWithAudio,
    veoWithoutAudio,
  };

  const creditPacks = [
    {
      id: 'credits_small',
      name: '100 Credits',
      price: '12,90',
      credits: 100,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_SMALL_NEW || process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_SMALL || 'price_1SyUUuAmspxoSxsTjPKULQlM',
      bestFor: 'Starter',
      cta: 'Credits kaufen',
      modelAccess: [
        'Nano Banana (Image)',
        'Veo 3.1 (Video)',
        'Kling 2.6 (Video)',
        'Flux Pro (Image)'
      ],
      tasks: '2 gleichzeitige Jobs',
    },
    {
      id: 'credits_medium',
      name: '400 Credits',
      price: '49,99',
      credits: 400,
      originalPrice: '55,00',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM_NEW || process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM || 'price_1SyUYYAmspxoSxsTsRUjnNzx',
      bestFor: 'Beliebt',
      popular: true,
      cta: 'Credits kaufen',
      modelAccess: [
        'Nano Banana (Image)',
        'Veo 3.1 (Video)',
        'Kling 2.6 (Video)',
        'Flux Pro (Image)'
      ],
      tasks: '4 gleichzeitige Jobs',
    },
    {
      id: 'credits_large',
      name: '1000 Credits',
      price: '119,00',
      credits: 1000,
      originalPrice: '129,00',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_LARGE_NEW || process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_LARGE || 'price_1SyUbKAmspxoSxsTbdepo69M',
      bestFor: 'Pro',
      cta: 'Credits kaufen',
      modelAccess: [
        'Nano Banana (Image)',
        'Veo 3.1 (Video)',
        'Kling 2.6 + Sora 2',
        'Flux Pro (Image)'
      ],
      tasks: '8 gleichzeitige Jobs',
    },
  ];

  const handleSelect = (type: 'subscription' | 'credits', priceId: string) => {
    if (onSelectPlan && !isLoading) {
      onSelectPlan(type, priceId);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      {/* ============================================ */}
      {/* TAB SWITCHER */}
      {/* ============================================ */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex rounded-2xl bg-white/[0.03] p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('subscription')}
            className={cn(
              'px-8 py-3 rounded-xl font-bold uppercase tracking-[0.15em] text-[10px] transition-all duration-300',
              activeTab === 'subscription'
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg'
                : 'text-white/50 hover:text-white/70'
            )}
          >
            Platform Zugang
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={cn(
              'px-8 py-3 rounded-xl font-bold uppercase tracking-[0.15em] text-[10px] transition-all duration-300',
              activeTab === 'credits'
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg'
                : 'text-white/50 hover:text-white/70'
            )}
          >
            AI Credits
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* SUBSCRIPTION VIEW */}
      {/* ============================================ */}
      {activeTab === 'subscription' && (
        <div className="max-w-2xl mx-auto">
          <div className="relative group flex flex-col p-10 rounded-3xl bg-[#0F1113] border border-[var(--accent)]/40 shadow-[0_0_50px_-12px_rgba(212,175,55,0.2)] overflow-hidden">
            {/* Background Glow */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-60">
                <div className="absolute inset-12 rounded-[2rem] bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,transparent_65%)]" />
              </div>
              <Sparkles className="h-40 w-40 text-[var(--accent)] opacity-10 transition-all duration-700 group-hover:opacity-40 group-hover:scale-110" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-3xl font-instrument-serif text-[var(--accent)]">
                    {subscription.name}
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1 rounded-full">
                    Empfohlen
                  </span>
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
                  {subscription.subtitle}
                </p>
              </div>

              <div className="mb-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-instrument-serif text-white">{subscription.price}€</span>
                  <span className="text-sm text-white/30 uppercase tracking-widest">{subscription.period}</span>
                </div>
              </div>

              <ul className="space-y-5 mb-12">
                {subscription.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <Check className={cn(
                      'w-5 h-5 mt-0.5 flex-shrink-0',
                      feature.highlight ? 'text-[var(--accent)]' : 'text-[var(--accent)]/40'
                    )} />
                    <span className={cn(
                      'text-sm leading-relaxed',
                      feature.highlight ? 'text-white font-medium' : 'text-white/50'
                    )}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect('subscription', subscription.priceId)}
                disabled={isLoading}
                className={cn(
                  'w-full py-5 rounded-xl font-bold uppercase tracking-[0.2em] text-[11px] transition-all duration-500',
                  'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg hover:brightness-110 active:scale-[0.98]',
                  isLoading && 'cursor-not-allowed opacity-70'
                )}
              >
                {isLoading ? 'Processing...' : subscription.cta}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CREDIT PACKS VIEW */}
      {/* ============================================ */}
      {activeTab === 'credits' && (
        <div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-instrument-serif text-white mb-3">
              AI Credits kaufen
            </h2>
            <p className="text-white/50 text-sm">
              Einmaliger Kauf • Keine Laufzeit • Credits verfallen nicht
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {creditPacks.map((pack) => (
              <div
                key={pack.id}
                className={cn(
                  'relative flex flex-col p-8 rounded-2xl transition-all duration-500 border',
                  pack.popular
                    ? 'bg-white/[0.04] border-[var(--accent)]/40 shadow-[0_0_30px_-12px_rgba(212,175,55,0.15)] scale-105'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                )}
              >
                {/* Popular Badge */}
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-1.5 rounded-full shadow-lg">
                      Beliebt
                    </span>
                  </div>
                )}

                {/* Pack Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-6 h-6 text-[var(--accent)]" />
                    <h3 className="text-2xl font-instrument-serif text-white">
                      {pack.name}
                    </h3>
                  </div>
                  <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold">
                    {pack.bestFor}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'font-instrument-serif text-white',
                      pack.popular ? 'text-5xl' : 'text-4xl'
                    )}>
                      {pack.price}€
                    </span>
                    {pack.originalPrice && (
                      <span className="text-sm text-white/40 line-through">{pack.originalPrice}€</span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-1">einmalig</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-sm text-white">{pack.credits} AI Credits</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[var(--accent)]/70" />
                    <span className="text-sm text-white/80">{pack.tasks}</span>
                  </li>
                  {pack.modelAccess.map((model: string) => (
                    <li key={model} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-[var(--accent)]/40" />
                      <span className="text-sm text-white/55">{model}</span>
                    </li>
                  ))}
                </ul>

                <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/60 space-y-1">
                  <div>≈ {Math.floor(pack.credits / CREDIT_ESTIMATES.nanoBananaImage)} Nano Banana Bilder</div>
                  <div>≈ {Math.floor(pack.credits / CREDIT_ESTIMATES.veoWithAudio)} Veo 3.1 Videos (5s, mit Audio)</div>
                  <div>≈ {Math.floor(pack.credits / CREDIT_ESTIMATES.veoWithoutAudio)} Veo 3.1 Videos (5s, ohne Audio)</div>
                  <div className="mt-1 text-[10px] text-white/40">Richtwert • 10% Plattform-Fee bereits einkalkuliert</div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelect('credits', pack.priceId)}
                  disabled={isLoading}
                  className={cn(
                    'w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-500',
                    pack.popular
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg hover:brightness-110 active:scale-[0.98]'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:border-white/30 active:scale-[0.98]',
                    isLoading && 'cursor-not-allowed opacity-70'
                  )}
                >
                  {isLoading ? 'Processing...' : pack.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-12 p-6 rounded-xl bg-white/[0.02] border border-white/10">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              Wie Credits berechnet werden
            </h4>
            <p className="text-sm text-white/60">
              Wir rechnen pro Generation transparent nach Modellkosten ab: Basispreis + 10% Plattform-Fee.
              Beispiele: Nano Banana Bild ca. 4 Credits, Veo 3.1 (5s) ca. 11 Credits ohne Audio oder 22 Credits mit Audio.
              Platform Access (49,00€/Monat) ist separat und deckt Workspace, Collaboration und Infrastruktur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
