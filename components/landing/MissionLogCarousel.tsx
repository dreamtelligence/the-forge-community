'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Truck, ShoppingBag, Lightbulb } from 'lucide-react';

const PROJECTS = [
  {
    id: 'smartstore',
    title: 'SmartStore',
    subtitle: 'Fulfillment & 3PL',
    description: 'Ein Nischen-Logistik Provider für High-Value Goods. Wir schließen die Lücke zwischen Garage-Shipping und Enterprise-Logistik.',
    metrics: [
      { label: 'Ziel MRR (6 Mo)', value: '€12k' },
      { label: 'EBITDA Marge', value: '35%' },
    ],
    roadmap: [
      { step: '01', title: 'Gründung', status: 'ABGESCHLOSSEN' },
      { step: '02', title: 'Rechtliches & Banking', status: 'IN BEARBEITUNG' },
      { step: '03', title: 'Tech Stack Setup', status: 'WARTESCHLANGE' },
      { step: '04', title: 'Kunden-Onboarding', status: 'WARTESCHLANGE' }
    ],
    color: 'text-[#FF9900]',
    accent: '#FF9900',
    bgStyle: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
    border: 'border-[#FF9900]/50',
    icon: Truck
  },
  {
    id: 'crunchlabs',
    title: 'CRUNCH LABS',
    subtitle: 'Food / E-Commerce',
    description: 'Gefriergetrocknete Früchte & Snacks als Premium-Subscription. Inspiriert von Buah/KoRo, aber mit Fokus auf Creator-Economy.',
    metrics: [
      { label: 'Marge (D2C)', value: '65%' },
      { label: 'AOV (Warenkorb)', value: '€45' },
    ],
    roadmap: [
      { step: '01', title: 'Produkt-Sourcing', status: 'IN BEARBEITUNG' },
      { step: '02', title: 'Branding & Design', status: 'ABGESCHLOSSEN' },
      { step: '03', title: 'Shopify Setup', status: 'WARTESCHLANGE' },
      { step: '04', title: 'Influencer Launch', status: 'WARTESCHLANGE' }
    ],
    color: 'text-orange-400',
    accent: '#fb923c',
    bgStyle: 'radial-gradient(circle at 50% 50%, rgba(251, 146, 60, 0.35) 0%, rgba(0, 0, 0, 1) 100%)',
    border: 'border-orange-500/50',
    icon: ShoppingBag
  },
  {
    id: 'lumiere',
    title: 'LUMIÈRE',
    subtitle: 'D2C / Brand',
    description: 'Ästhetische LED-Ambiente Beleuchtung. High-End Private Labeling mit Fokus auf TikTok-Viralität und Home-Office Trends.',
    metrics: [
      { label: 'ROI (Ad Spend)', value: '4.5x' },
      { label: 'Time-to-Market', value: '30d' },
    ],
    roadmap: [
      { step: '01', title: 'Sample Order', status: 'ABGESCHLOSSEN' },
      { step: '02', title: 'Content Production', status: 'IN BEARBEITUNG' },
      { step: '03', title: 'Ads Testing', status: 'WARTESCHLANGE' },
      { step: '04', title: 'Scale Phase', status: 'WARTESCHLANGE' }
    ],
    color: 'text-purple-400',
    accent: '#a855f7',
    bgStyle: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.35) 0%, rgba(0, 0, 0, 1) 100%)',
    border: 'border-purple-500/50',
    icon: Lightbulb
  }
];

export default function MissionLogCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextProject = () => setActiveIndex((prev) => (prev + 1) % PROJECTS.length);
  const prevProject = () => setActiveIndex((prev) => (prev - 1 + PROJECTS.length) % PROJECTS.length);

  const activeProject = PROJECTS[activeIndex];
  const Icon = activeProject.icon;

  return (
    <div className="relative w-full min-h-[900px] flex flex-col justify-center py-24 overflow-hidden bg-transparent">
      
      {/* Immersiver Hintergrund-Raum */}
      <div 
        className="absolute inset-0 transition-all duration-1000 ease-in-out pointer-events-none"
        style={{ 
          background: activeProject.bgStyle,
          opacity: 0.2
        }}
      />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.15] [mask-image:radial-gradient(white,transparent)] pointer-events-none" />

      {/* Navigation - Mittig Oben */}
      <div className="flex flex-col items-center mb-24 gap-6 relative z-30">
        <div className="flex items-center gap-8 bg-white/5 backdrop-blur-2xl p-2 rounded-full border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <button 
            onClick={prevProject}
            className="p-4 rounded-full hover:bg-white/10 transition-all group"
          >
            <ArrowLeft className="w-6 h-6 text-white/40 group-hover:text-white" />
          </button>
          
          <div className="flex gap-3">
            {PROJECTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-2 transition-all duration-500 rounded-full ${
                  i === activeIndex ? `w-12` : 'w-3 bg-white/10'
                }`}
                style={{ backgroundColor: i === activeIndex ? activeProject.accent : undefined }}
              />
            ))}
          </div>

          <button 
            onClick={nextProject}
            className="p-4 rounded-full hover:bg-white/10 transition-all group"
          >
            <ArrowRight className="w-6 h-6 text-white/40 group-hover:text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center max-w-7xl mx-auto px-4 md:px-6 relative z-20">
        {/* Left: Content */}
        <div className="min-h-[600px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeProject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "circOut" }}
              className="text-center lg:text-left"
            >
              <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-black/80 border ${activeProject.border} text-[9px] sm:text-[10px] font-black ${activeProject.color} uppercase tracking-[0.2em] sm:tracking-[0.4em] mb-10 shadow-2xl w-fit mx-auto lg:mx-0`}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeProject.accent }} />
                Operational Mission Log
              </div>
              
              <h2 className="text-5xl md:text-7xl lg:text-9xl font-instrument-serif text-white mb-4 leading-[0.8] tracking-tighter">
                {activeProject.title}
              </h2>
              <p className={`text-2xl md:text-4xl font-instrument-serif italic mb-12 ${activeProject.color}`}>
                {activeProject.subtitle}
              </p>
              
              <p className="text-lg md:text-2xl text-white/70 mb-14 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium min-h-[120px]">
                {activeProject.description}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto lg:mx-0">
                {activeProject.metrics.map((metric, i) => (
                  <div key={i} className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-md hover:border-white/20 transition-all text-left shadow-2xl">
                    <div className={`text-4xl font-instrument-serif text-white mb-1`}>
                      {metric.value}
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Right: The UI Card */}
        <div className="relative mt-8 lg:mt-0">
          <div className={`relative backdrop-blur-3xl border rounded-[48px] p-8 md:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] overflow-hidden transition-all duration-1000 ${activeProject.border} bg-black/60 min-h-[650px] flex flex-col`}>
            
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 shadow-2xl" style={{ color: activeProject.accent }}>
                  <Icon className="w-10 h-10" />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20">System Status</div>
                  <div className="text-base font-bold text-white/80">Mission Roadmap</div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)]" style={{ backgroundColor: activeProject.accent }}/>
              </div>
            </div>

            <div className="space-y-8 sm:space-y-10 relative z-10 flex-1 flex flex-col justify-center">
              {activeProject.roadmap.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 group/item">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-[10px] sm:text-xs text-white/20 group-hover/item:text-white transition-colors w-4 sm:w-6">{item.step}</div>
                      <div className="flex-1 font-instrument-serif text-xl sm:text-2xl md:text-3xl text-white/90 group-hover/item:translate-x-2 transition-transform duration-500">{item.title}</div>
                    </div>
                    <div className={`w-fit sm:ml-auto text-[8px] sm:text-[10px] font-black tracking-[0.2em] px-3 sm:px-5 py-1.5 sm:py-2 rounded-full border transition-all ${
                      item.status === 'ABGESCHLOSSEN' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                      item.status === 'IN BEARBEITUNG' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
                      'border-white/10 text-white/20'
                    }`}>
                      {item.status}
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
