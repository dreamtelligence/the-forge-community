'use client';

import { motion } from 'framer-motion';
import CtaButton from '@/components/landing/kimi/CtaButton';
import { useI18n } from '@/components/i18n/I18nProvider';
import LazyVideo from '@/components/ui/LazyVideo';

const featuredVideo = {
  id: 1,
  title: 'Launch Kit - Footwear',
  category: 'Product Ads',
  number: '01',
  src: '/media-demos/videos/shoes_16_9.mp4',
};



export default function Marketing() {
  const { copy } = useI18n();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  return (
    <section id="marketing" className="py-16 lg:py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="mb-12 lg:mb-16"
        >
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6">
            {copy.marketing.title}
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mb-8">
            {copy.marketing.description}
          </p>
          
          {/* AI Tools Badges */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="text-white/40 text-sm">{copy.marketing.featuresLabel}</span>
            {copy.marketing.features.map((feature: string) => (
              <span key={feature} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                {feature}
              </span>
            ))}
          </div>

          {copy.marketing.modelsNote && (
            <p className="text-white/50 text-xs italic mb-8 max-w-xl">
              {copy.marketing.modelsNote}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40 mb-8">
            <span className="uppercase tracking-[0.3em] text-white/30 sm:inline">
              {copy.marketing.trendingLabel}
            </span>
            {copy.marketing.trendingTags.map((tag: string) => (
              <span key={tag} className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/60">
                {tag}
              </span>
            ))}
          </div>
          
          <CtaButton href="#start" label={copy.marketing.cta} variant="outline" size="md" />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="space-y-6 lg:space-y-8"
        >
          <motion.div key={featuredVideo.id} variants={itemVariants} className="group relative">
            <div className="relative overflow-hidden rounded-2xl aspect-[16/9] shadow-[0_30px_80px_-60px_rgba(0,0,0,0.9)]">
              <LazyVideo
                src={featuredVideo.src}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-white/70 text-xs uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                    {featuredVideo.category}
                  </span>
                  <span className="text-white/50 text-xs font-mono">{featuredVideo.number}</span>
                </div>

                <div>
                  <h3 className="text-white text-lg font-semibold mb-1">
                    {featuredVideo.title}
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>


        </motion.div>
      </div>
    </section>
  );
}
