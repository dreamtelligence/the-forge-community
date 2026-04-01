'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useI18n } from '@/app/components/i18n/I18nProvider';
import LandingShaderAccent from '@/app/components/landing/kimi/LandingShaderAccent';

export default function Services() {
  const { copy } = useI18n();
  const tabs = (copy.services.tabs as string[]) || [];
  const services = copy.services.items as Array<{
    id: string;
    title: string;
    description: string;
    tab?: string;
    href?: string;
    linkLabel?: string;
  }>;
  const [activeTab, setActiveTab] = useState(tabs[0] || '');
  const filteredServices = activeTab
    ? services.filter((service) => service.tab === activeTab)
    : services;

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
    <section id="services" className="relative overflow-hidden py-16 lg:py-24 bg-black">
      <LandingShaderAccent
        mask="radial-gradient(62% 58% at 82% 24%, black 0%, transparent 72%)"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="mb-12"
        >
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            {copy.services.title}
            <sup className="text-2xl lg:text-3xl align-super ml-2">{copy.services.count}</sup>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          className="mb-8"
        >
          <div
            className="w-full flex items-center border-b border-white/15 gap-8 overflow-x-auto whitespace-nowrap scrollbar-hide"
            role="tablist"
            aria-label="Services"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={`flex-shrink-0 bg-transparent text-sm uppercase tracking-widest pb-4 rounded-none border-b-2 transition-all duration-300 ${
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

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
          className="text-white/50 text-sm leading-relaxed max-w-2xl mb-10"
        >
          {copy.services.helper}
        </motion.p>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="space-y-0"
          >
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                variants={itemVariants}
                className="group py-6 border-b border-white/15 hover:border-white/30 transition-colors duration-300"
              >
                <div className="flex items-start gap-8">
                  <span className="text-white/30 text-sm font-mono mt-1">{service.id}</span>
                  <div className="flex-1">
                    <div>
                      <h3 className="text-white text-lg sm:text-xl font-semibold group-hover:text-white/80 transition-colors duration-300 mb-2">
                        {service.title}
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed">
                        {service.description}
                      </p>
                      {service.href && service.linkLabel && (
                        <Link
                          href={service.href}
                          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80 hover:text-white transition-colors duration-300 mt-3"
                        >
                          {service.linkLabel}
                          <span aria-hidden="true">→</span>
                        </Link>
                      )}
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
