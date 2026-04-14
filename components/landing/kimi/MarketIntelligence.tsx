'use client';

import { motion } from 'framer-motion';
import {
  ArrowTopRightIcon,
  EyeOpenIcon,
  FileTextIcon,
  LightningBoltIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { useI18n } from '@/components/i18n/I18nProvider';
import CtaButton from '@/components/landing/kimi/CtaButton';
import LandingShaderAccent from '@/components/landing/kimi/LandingShaderAccent';

type MarketCard = {
  title: string;
  description: string;
  meta: string;
};

type MarketPanel = {
  label: string;
  title: string;
  body: string;
};

const icons = [MagnifyingGlassIcon, LightningBoltIcon, EyeOpenIcon, FileTextIcon];

export default function MarketIntelligence() {
  const { copy } = useI18n();
  const section = copy.marketIntelligence as {
    eyebrow: string;
    title: string;
    description: string;
    boardLabel: string;
    boardIntro: string;
    boardTag: string;
    cards: MarketCard[];
    workflowTitle: string;
    workflowItems: string[];
    sourceLabel: string;
    sources: string[];
    panels: MarketPanel[];
    cta: string;
  };

  return (
    <section id="signals" className="relative overflow-hidden bg-black py-16 lg:py-28">
      <LandingShaderAccent
        mask="radial-gradient(58% 54% at 80% 18%, black 0%, transparent 72%)"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="mb-12 max-w-3xl lg:mb-16"
        >
          <div className="mb-5 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
            {section.eyebrow}
          </div>
          <h2 className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            {section.title}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
            {section.description}
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.14fr_0.86fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_42%,rgba(0,0,0,0.22)_100%)] p-6 ring-1 ring-white/10 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.85)] sm:p-8"
          >
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
                  {section.boardLabel}
                </p>
                <p className="mt-2 max-w-xl text-lg leading-relaxed text-white/72">
                  {section.boardIntro}
                </p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-white/10">
              {section.cards.map((card, index) => {
                const Icon = icons[index % icons.length];

                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{
                      duration: 0.55,
                      delay: index * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="grid gap-4 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="max-w-xl">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-white/28">
                          0{index + 1}
                        </span>
                        <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                          {card.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/58 sm:text-[15px]">
                        {card.description}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/44 sm:justify-self-end">
                      <span>{card.meta}</span>
                      <ArrowTopRightIcon className="h-3.5 w-3.5" />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-6 border-t border-white/10 pt-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
                  {section.sourceLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {section.sources.map((source) => (
                    <span
                      key={source}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/56"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>

              <CtaButton
                href="#start"
                label={section.cta}
                variant="primary"
                size="sm"
                className="border-[#FF9900] bg-[#FF9900] text-black hover:bg-[#ffb347]"
              />
            </div>
          </motion.div>

          <div className="grid gap-6">
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[1.8rem] bg-white/[0.03] p-6 ring-1 ring-white/10 shadow-[0_28px_90px_-64px_rgba(0,0,0,0.85)] sm:p-8"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
                {section.workflowTitle}
              </p>
              <div className="mt-6 space-y-3">
                {section.workflowItems.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                  >
                    <span className="mt-0.5 font-mono text-xs text-[#ffc978]">
                      0{index + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-white/65 sm:text-[15px]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {section.panels.map((panel, index) => (
                <motion.div
                  key={panel.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{
                    duration: 0.65,
                    delay: index * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex h-full flex-col rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(0,0,0,0.18)_100%)] p-6 ring-1 ring-white/10 shadow-[0_24px_90px_-70px_rgba(0,0,0,0.8)] sm:p-7"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/34">
                    {panel.label}
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                    {panel.title}
                  </h3>
                  <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-white/58 sm:text-[15px]">
                    {panel.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
