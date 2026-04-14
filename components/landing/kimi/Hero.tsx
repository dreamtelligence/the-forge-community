'use client';

import { motion } from 'framer-motion';
import CtaButton from '@/components/landing/kimi/CtaButton';

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  return (
    <section id="hero" className="min-h-screen bg-black pt-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <div className="lg:hidden flex justify-center">
          <div className="w-full max-w-[320px] rounded-3xl border border-white/10 bg-black p-6">
            <h1 className="text-2xl font-semibold text-white leading-snug tracking-tight">
              Viele Founder. 1
              <br />
              Brand.
              <br />
              Profitiere von
              <br />
              unserem
              <br />
              Netzwerk an
              <br />
              B2B
              <br />
              Händlern.
            </h1>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-2 items-center gap-12">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="order-2 lg:order-1"
          >
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight"
            >
              Viele Founder.
              <br />
              Ein Venture.
              <br />
              Ein System.
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-white/70 text-lg leading-relaxed max-w-xl mt-6"
            >
              Stake & Scale verbindet Solo-Founder zu Squads, liefert AI-Studios
              für Brand, Marketing, Sourcing & Legal – plus direkten Zugang zu
              B2B-Netzwerk und geprüften Lieferanten.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 mt-10">
              <CtaButton href="#start" label="Magic Link starten" variant="primary" size="md" />
              <CtaButton href="#pricing" label="Preise ansehen" variant="outline" size="md" />
            </motion.div>
          </motion.div>

          <motion.div
            variants={imageVariants}
            initial="hidden"
            animate="visible"
            className="order-1 lg:order-2"
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
              <img
                src="/images/hero-fashion.jpg"
                alt="Stake & Scale Hero"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
