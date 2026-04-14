'use client';

import { motion } from 'framer-motion';
import DatabaseWithRestApi from '@/shared/ui/database-with-rest-api';
import { useI18n } from '@/components/i18n/I18nProvider';
import LandingShaderAccent from '@/components/landing/kimi/LandingShaderAccent';

export default function Practice() {
  const { copy } = useI18n();
  return (
    <section className="relative overflow-hidden py-16 lg:py-24 bg-black">
      <LandingShaderAccent
        mask="radial-gradient(64% 60% at 26% 18%, black 0%, transparent 72%)"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10"
        >
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            {copy.practice.title}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
          className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center"
        >
          <div className="text-white/75 text-lg max-w-2xl">
            <p>
              {copy.practice.paragraph1}
            </p>
            <p className="mt-4 text-white/60">
              {copy.practice.paragraph2}
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/55">
              {copy.practice.bullets.map((item: string) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="justify-self-center lg:justify-self-end lg:translate-x-14 xl:translate-x-24">
            <DatabaseWithRestApi
              className="w-full max-w-none lg:w-[640px] xl:w-[700px]"
              circleText="FORGE"
              title={copy.practice.diagramTitle}
              badgeTexts={copy.practice.diagramBadges}
              buttonTexts={copy.practice.diagramButtons}
              lightColor="#22d3ee"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
