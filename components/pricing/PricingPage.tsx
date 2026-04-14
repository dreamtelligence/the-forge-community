'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PricingTable } from '@/components/PricingTable';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function PricingPageClient() {
  const { copy } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = async (type: 'subscription' | 'credits', priceId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, priceId }),
      });

      if (!response.ok) {
        let errorMessage = copy?.pricingPage?.checkoutError || 'Checkout failed.';
        if (response.status === 401) {
          errorMessage = copy?.pricingPage?.checkoutUnauthorized || 'Bitte einloggen.';
        } else {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              const data = await response.json();
              if (data?.message) {
                errorMessage = data.message;
              }
            } catch {
              // Ignore JSON parse errors and use fallback message.
            }
          }
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      console.error('[PRICING] Error:', error);
      const message =
        error instanceof Error
          ? error.message
          : copy?.pricingPage?.checkoutError || 'Checkout failed.';
      alert(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] py-20">
      <div className="container mx-auto px-4 mb-8">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
              return;
            }
            router.push('/settings/billing');
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>
      </div>

      <div className="container mx-auto px-4 mb-12 text-center">
        <h1 className="text-5xl font-instrument-serif text-white mb-4">
          {copy?.pricingPage?.title}
        </h1>
        <p className="text-xl text-white/60">
          {copy?.pricingPage?.subtitle}
        </p>
      </div>

      <PricingTable onSelectPlan={handleSelectPlan} isLoading={isLoading} />
    </div>
  );
}
