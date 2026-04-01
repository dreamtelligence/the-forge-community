'use client';

import { motion } from 'framer-motion';
import { useI18n } from '@/app/components/i18n/I18nProvider';
import LandingShaderAccent from '@/app/components/landing/kimi/LandingShaderAccent';

export default function FAQ() {
  const { copy } = useI18n();
  const faqs: Array<{ id: string; question: string; answer: string }> = copy?.faq?.items ?? [];
  return (
    <section id="faq" className="relative overflow-hidden py-16 lg:py-24 bg-black">
      <LandingShaderAccent
        mask="radial-gradient(68% 62% at 78% 22%, black 0%, transparent 74%)"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-10 lg:mb-14 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-none lg:whitespace-nowrap">
            {copy?.faq?.title}
          </h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-2"
          >
            {faqs.map((faq) => (
              <details key={faq.id} className="group border-b border-white/15 py-4">
                <summary className="flex items-center gap-4 cursor-pointer list-none">
                  <span className="text-white/30 text-sm font-mono">{faq.id}</span>
                  <span className="text-white text-base sm:text-lg font-medium flex-1">
                    {faq.question}
                  </span>
                  <span className="text-white/40 text-sm">+</span>
                </summary>
                <div className="pl-12 pr-4 pt-3">
                  <p className="text-white/60 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <div className="relative">
              <div className="aspect-[3/4] w-full max-w-sm rounded-2xl overflow-hidden mb-8">
                <img src="/images/project-3.jpg" alt="FAQ" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
