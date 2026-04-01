'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CtaButton from '@/app/components/landing/kimi/CtaButton';
import { cn } from '@/lib/utils';
import { estimateVideoCredits } from '@/lib/credit-pricing';
import { useI18n } from '@/app/components/i18n/I18nProvider';
import BetaLoginButton from '@/app/components/ui/BetaLoginButton';

const PRICING_VIDEO_MODEL = process.env.NEXT_PUBLIC_PRICING_VIDEO_MODEL || 'google/veo-3.1';
const PRICING_VIDEO_DURATION = Number(process.env.NEXT_PUBLIC_PRICING_VIDEO_DURATION || '5');
const PRICING_VIDEO_AUDIO = process.env.NEXT_PUBLIC_PRICING_VIDEO_AUDIO !== 'false';

const PRICING_VIDEO_ESTIMATE = estimateVideoCredits({
  modelId: PRICING_VIDEO_MODEL,
  durationSeconds: Number.isFinite(PRICING_VIDEO_DURATION) ? PRICING_VIDEO_DURATION : 5,
  generateAudio: PRICING_VIDEO_AUDIO,
  fallbackCredits: 35,
  minimumCredits: 1,
});

const PRICING_VEO_WITH_AUDIO = estimateVideoCredits({
  modelId: 'google/veo-3.1',
  durationSeconds: 5,
  generateAudio: true,
  fallbackCredits: 58,
  minimumCredits: 1,
});

const PRICING_VEO_NO_AUDIO = estimateVideoCredits({
  modelId: 'google/veo-3.1',
  durationSeconds: 5,
  generateAudio: false,
  fallbackCredits: 29,
  minimumCredits: 1,
});

const CREDIT_ESTIMATES = {
  nanoBananaImage: 4,
  veoVideoWithAudio: PRICING_VEO_WITH_AUDIO.credits,
  veoVideoNoAudio: PRICING_VEO_NO_AUDIO.credits,
  textVideo: PRICING_VIDEO_ESTIMATE.credits,
  imageVideo: PRICING_VIDEO_ESTIMATE.credits,
};

export default function Pricing() {
  const { copy, link, locale } = useI18n();
  const tabs = copy?.pricing?.tabs ?? [];
  const loginPlan = copy?.pricing?.loginPlan ?? {};
  const membershipPlan = copy?.pricing?.membershipPlan ?? {};
  const creditPacks = copy?.pricing?.creditPacks ?? [];
  const creditsCopy = copy?.pricing?.credits ?? {};
  const transparencyCopy = copy?.pricing?.transparency ?? {};
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>(tabs[0]?.id || 'login');

  return (
    <section id="pricing" className="py-20 lg:py-24 bg-black relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-royal/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
          >
            {copy?.pricing?.headline}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/40 mt-4 max-w-xl mx-auto text-base"
          >
            {copy?.pricing?.subheadline}
          </motion.p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-12 -mx-6 px-6 overflow-x-auto md:overflow-visible md:flex md:justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max rounded-xl bg-white/[0.03] p-1 border border-white/5 backdrop-blur-md">
            {tabs.map((tab: { id: string; label: string }) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-4 sm:px-6 py-2 rounded-lg font-bold uppercase tracking-[0.12em] text-[8px] sm:text-[9px] transition-all duration-500 whitespace-nowrap",
                  activeTab === tab.id ? "text-black" : "text-white/40 hover:text-white/70"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'login' && (
              <motion.div 
                key="login"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-lg mx-auto"
              >
                <div className="p-8 lg:p-10 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-xl relative group">
                  <div className="relative z-10">
                    <div className="mb-8">
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-5xl font-bold text-white tracking-tighter">{loginPlan.price}</span>
                        <span className="text-white/30 text-lg font-light tracking-widest uppercase">{loginPlan.period}</span>
                      </div>
                      <h3 className="text-white text-xl font-semibold mb-2 tracking-tight">{loginPlan.name}</h3>
                      <p className="text-white/40 text-sm leading-relaxed">{loginPlan.description}</p>
                    </div>

                    <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8" />

                    <ul className="space-y-4 mb-10">
                      {loginPlan.features?.map((feature: string) => (
                        <li key={feature} className="flex items-center gap-3">
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-white/60 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <BetaLoginButton
                      label={loginPlan.cta}
                      locale={locale}
                      wrapperClassName="w-full"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all duration-300"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'membership' && (
              <motion.div 
                key="membership"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-lg mx-auto"
              >
                <div className="relative p-8 lg:p-10 rounded-[2rem] border border-royal/20 bg-white/[0.04] backdrop-blur-2xl shadow-[0_0_60px_-20px_rgba(255,153,0,0.1)] group">
                  {membershipPlan.badge && (
                    <div className="absolute -top-3 right-8">
                      <span className="text-[8px] font-black uppercase tracking-[0.25em] bg-royal text-white px-4 py-1.5 rounded-full shadow-xl">
                        {membershipPlan.badge}
                      </span>
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className="mb-8">
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-5xl font-bold text-white tracking-tighter">{membershipPlan.price}€</span>
                        <span className="text-white/30 text-base tracking-[0.15em] uppercase font-light">{membershipPlan.period}</span>
                      </div>
                      <h3 className="text-white text-2xl font-semibold mb-2 tracking-tight">{membershipPlan.name}</h3>
                      <p className="text-white/40 text-sm leading-relaxed">{membershipPlan.description}</p>
                    </div>

                    <div className="h-px w-full bg-gradient-to-r from-royal/20 via-royal/10 to-transparent mb-8" />

                    <ul className="space-y-4 mb-10">
                      {membershipPlan.features?.map((feature: string) => (
                        <li key={feature} className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-royal/40 shadow-[0_0_8px_rgba(255,153,0,0.4)]" />
                          <span className="text-white/80 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <CtaButton
                      href={link(membershipPlan.href)}
                      label={membershipPlan.cta}
                      variant="primary"
                      size="md"
                      className="w-full py-6 text-[10px] uppercase tracking-[0.2em] font-black bg-white text-black hover:bg-neutral-200 border-none shadow-[0_15px_30px_-10px_rgba(255,255,255,0.15)]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'credits' && (
              <motion.div 
                key="credits"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="grid md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
                  {creditPacks.map((pack: any) => (
                    <div
                      key={pack.id}
                      className={cn(
                        "relative flex flex-col p-7 rounded-[1.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-sm group transform-gpu",
                        "transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/20 hover:bg-white/[0.04]"
                      )}
                    >
                      {pack.popular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="text-[7px] font-black uppercase tracking-[0.25em] bg-white text-black px-3 py-1 rounded-full">
                            {creditsCopy.popular}
                          </span>
                        </div>
                      )}

                      <div className="mb-6">
                        <p className="text-[8px] text-white/30 uppercase tracking-[0.25em] font-black mb-1.5">
                          {pack.bestFor}
                        </p>
                        <h4 className="text-lg font-bold text-white tracking-tight">{pack.name}</h4>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-white font-bold tracking-tighter text-3xl">
                            {pack.price}€
                          </span>
                          {pack.originalPrice && (
                            <span className="text-base text-white/20 font-light line-through decoration-white/40">{pack.originalPrice}€</span>
                          )}
                        </div>
                        <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] mt-1.5">{creditsCopy.oneTime}</p>
                      </div>

                      <div className="mb-8 flex-1">
                        <div className="space-y-3 rounded-2xl border border-white/5 bg-black/40 p-4">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-white/40 uppercase tracking-widest">{creditsCopy.nanoBananaImages}</span>
                            <span className="text-white font-mono">{Math.floor(pack.credits / CREDIT_ESTIMATES.nanoBananaImage)}</span>
                          </div>
                          <div className="h-px bg-white/5" />
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-white/40 uppercase tracking-widest">{creditsCopy.veoVideosWithAudio}</span>
                            <span className="text-white font-mono">{Math.floor(pack.credits / CREDIT_ESTIMATES.veoVideoWithAudio)}</span>
                          </div>
                          <div className="h-px bg-white/5" />
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-white/40 uppercase tracking-widest">{creditsCopy.veoVideosNoAudio}</span>
                            <span className="text-white font-mono">{Math.floor(pack.credits / CREDIT_ESTIMATES.veoVideoNoAudio)}</span>
                          </div>
                        </div>
                      </div>

                      <CtaButton
                        href={link('/pricing')}
                        label={creditsCopy.buyCta}
                        variant="outline"
                        size="sm"
                        className="w-full py-4 text-[9px] uppercase tracking-[0.2em] font-black transition-colors duration-300"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-10 text-center">
                  <p className="text-[9px] text-white/20 uppercase tracking-[0.3em]">
                    {creditsCopy.footer}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'transparency' && (
              <motion.div
                key="transparency"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-3xl mx-auto"
              >
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm">
                  <h3 className="text-white text-2xl font-semibold tracking-tight mb-2">
                    {transparencyCopy.headline || 'Transparente Usage-Kosten'}
                  </h3>
                  <p className="text-white/50 text-sm mb-6">
                    {transparencyCopy.subheadline || 'Basispreis + 10% Plattform-Fee. Preise werden pro Generation vor Start angezeigt.'}
                  </p>

                  <div className="space-y-3">
                    {(transparencyCopy.items || []).map((item: any) => (
                      <div
                        key={item.label}
                        className="grid grid-cols-12 gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs"
                      >
                        <div className="col-span-5 text-white/80 font-medium">{item.label}</div>
                        <div className="col-span-3 text-white/40">{item.base}</div>
                        <div className="col-span-2 text-royal/90">{item.fee}</div>
                        <div className="col-span-2 text-white text-right font-mono">{item.total}</div>
                      </div>
                    ))}
                  </div>

                  <ul className="mt-6 space-y-2">
                    {(transparencyCopy.bullets || []).map((line: string) => (
                      <li key={line} className="text-xs text-white/60 flex items-start gap-2">
                        <span className="mt-1 h-1 w-1 rounded-full bg-white/40" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
