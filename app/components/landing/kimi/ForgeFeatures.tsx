'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useI18n } from '@/app/components/i18n/I18nProvider';

type Feature = {
  id: string;
  title: string;
  description: string;
  images: string[];
};

export default function ForgeFeatures() {
  const { copy } = useI18n();
  const tabs: string[] = copy?.forgeFeatures?.tabs ?? [];
  const tabContent: Record<string, Feature[]> = copy?.forgeFeatures?.content ?? {};
  const [activeTab, setActiveTab] = useState(tabs[0] || 'Community');
  const currentFeatures = tabContent[activeTab] || tabContent[tabs[0]] || [];
  const previewAlt = copy?.forgeFeatures?.previewAlt || 'Feature preview';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  return (
    <section className="relative overflow-hidden py-16 lg:py-24 bg-black">
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="mb-12"
        >
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            {copy?.forgeFeatures?.title}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex flex-wrap gap-4 border-b border-white/15 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm uppercase tracking-widest pb-2 border-b-2 transition-all duration-300 ${
                  activeTab === tab
                    ? 'text-white border-white'
                    : 'text-white/50 border-transparent hover:text-white/70'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="space-y-0"
          >
            {currentFeatures.map((feature) => (
              <motion.div
                key={feature.id}
                variants={itemVariants}
                className="group py-6 border-b border-white/15 hover:border-white/30 transition-colors duration-300"
              >
                <div className="flex items-start gap-8">
                  <span className="text-white/30 text-sm font-mono mt-1">{feature.id}</span>
                  <div className="flex-1 grid sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-white text-lg sm:text-xl font-semibold group-hover:text-white/80 transition-colors duration-300 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {feature.images.slice(0, 4).map((img, idx) => (
                        <div
                          key={idx}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300 relative"
                        >
                          <Image
                            src={img}
                            alt={`${previewAlt} ${idx + 1}`}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
