'use client';

import { motion } from 'framer-motion';
import ImageInImage from '@/app/components/landing/kimi/ImageInImage';
import { useI18n } from '@/app/components/i18n/I18nProvider';
import BetaLoginButton from '@/app/components/ui/BetaLoginButton';
import LandingShaderAccent from '@/app/components/landing/kimi/LandingShaderAccent';

export default function B2BSourcing() {
  const { copy, locale } = useI18n();

  return (
    <section className="relative overflow-hidden py-16 lg:py-24 bg-black">
      <LandingShaderAccent
        mask="radial-gradient(65% 60% at 18% 30%, black 0%, transparent 72%)"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="order-2 lg:order-1 flex justify-center lg:justify-start"
          >
            <div className="w-full sm:w-[420px] lg:w-[520px] xl:w-[600px]">
              <ImageInImage
                mainSrc="/freeze_dryed.webp"
                insetSrc="/vans.webp"
                alt="B2B Sourcing"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            className="order-1 lg:order-2 space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              {copy.b2b.titleLines[0]}
              <br />
              {copy.b2b.titleLines[1]}
            </h2>
            <p className="text-white/70 text-lg leading-relaxed max-w-lg">
              {copy.b2b.body}
            </p>
            <BetaLoginButton
              label={copy.b2b.cta}
              locale={locale}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/20 bg-white px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-black !opacity-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-300 hover:bg-white/90"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
