'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Megaphone, ShieldCheck, Zap, Globe, FileText, CheckCircle2 } from 'lucide-react';

const TABS = [
  {
    id: 'sourcing',
    label: 'Supply Chain Command',
    icon: Factory,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    title: 'Globales Sourcing auf Autopilot.',
    description: 'Verbinde dich direkt mit geprüften Manufakturen. Verwalte Samples, Quality-Checks und Produktionsaufträge in einem Dashboard.',
    features: ['Lieferanten-Datenbank', 'Sample Tracking', 'Automatisierte POs']
  },
  {
    id: 'marketing',
    label: 'Growth Engine',
    icon: Megaphone,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    title: 'Brand DNA gesteuerter Content.',
    description: 'Erstelle Kampagnen, die deine Brand-Identität kennen. Orion generiert Posts, Ads und E-Mails, die perfekt zu deiner Stimme passen.',
    features: ['Multi-Channel Planer', 'AI Copywriting', 'Brand-Konsistenz']
  },
  {
    id: 'legal',
    label: 'Admin Shield',
    icon: ShieldCheck,
    color: 'text-royal',
    bg: 'bg-royal/10',
    border: 'border-royal/20',
    title: 'Rechtssicherheit per Klick.',
    description: 'Keine teuren Anwälte mehr. Generiere wasserdichte Verträge (NDAs, Service Agreements), die sich automatisch an deinen Venture-Status anpassen.',
    features: ['Kontext-Aware Verträge', 'Slicing Pie Integration', 'DSGVO Compliance']
  }
];

export default function ForgeOSShowcase() {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 uppercase tracking-[0.3em] mb-6">
          <Zap className="w-3 h-3 text-[var(--accent)]" />
          The Operating System
        </div>
        <h2 className="text-4xl md:text-6xl font-instrument-serif text-white mb-6">
          Tools, die Solo-Founder<br/>
          <span className="text-[var(--accent)]">nicht bezahlen können.</span>
        </h2>
        <p className="text-white/40 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          Wir haben Enterprise-Level Software gebaut, um den Zufall aus der Gleichung zu nehmen. 
          Jedes Modul greift ineinander und nutzt die zentrale Brand DNA.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl border transition-all duration-300 ${
              activeTab.id === tab.id
                ? `${tab.bg} ${tab.border} ring-1 ring-[var(--accent)]/50`
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab.id === tab.id ? tab.color : 'text-white/40'}`} />
            <span className={`text-xs font-bold uppercase tracking-widest ${activeTab.id === tab.id ? 'text-white' : 'text-white/40'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Content Display */}
      <div className="relative min-h-[500px] glass-card border border-white/10 rounded-3xl overflow-hidden p-8 md:p-12">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-2 gap-12 items-center relative z-10"
          >
            {/* Text Content */}
            <div className="space-y-8">
              <div>
                <h3 className="text-3xl font-instrument-serif text-white mb-4">{activeTab.title}</h3>
                <p className="text-white/60 leading-relaxed">{activeTab.description}</p>
              </div>
              
              <ul className="space-y-4">
                {activeTab.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                    <CheckCircle2 className={`w-5 h-5 ${activeTab.color}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="pt-8">
                <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent)] hover:text-white transition-colors group">
                  Live Demo ansehen
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>

            {/* Visual Mockup */}
            <div className="relative">
              {/* Abstract UI Representation */}
              <div className="bg-[#0B0C0E] border border-white/10 rounded-xl overflow-hidden shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Mockup Header */}
                <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 justify-between">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                  </div>
                  <div className="text-[9px] text-white/30 font-mono">forge_os_v1.0</div>
                </div>

                {/* Mockup Body - Dynamic based on Tab */}
                <div className="p-6 space-y-4 min-h-[300px] bg-[url('/grid.svg')]">
                  {activeTab.id === 'sourcing' && (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <div className="text-xs font-bold text-white">Aktive Lieferanten</div>
                        <div className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-1 rounded">GLOBAL NET</div>
                      </div>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-white/40" />
                          </div>
                          <div className="flex-1">
                            <div className="h-2 w-24 bg-white/20 rounded mb-1.5" />
                            <div className="h-1.5 w-12 bg-white/10 rounded" />
                          </div>
                          <div className="text-[10px] text-green-400">Verifiziert</div>
                        </div>
                      ))}
                    </>
                  )}

                  {activeTab.id === 'marketing' && (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <div className="text-xs font-bold text-white">Content Pipeline</div>
                        <div className="bg-pink-500/20 text-pink-400 text-[10px] px-2 py-1 rounded">AI GENERATED</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-white/10 mb-4">
                        <div className="flex gap-2 mb-2">
                          <Zap className="w-3 h-3 text-[var(--accent)]" />
                          <div className="text-[10px] text-[var(--accent)] uppercase font-bold">Orion Suggestion</div>
                        </div>
                        <div className="h-2 w-3/4 bg-white/20 rounded mb-2" />
                        <div className="h-2 w-full bg-white/20 rounded mb-2" />
                        <div className="h-2 w-1/2 bg-white/20 rounded" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 rounded bg-white/5 border border-white/5" />
                        ))}
                      </div>
                    </>
                  )}

                  {activeTab.id === 'legal' && (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <div className="text-xs font-bold text-white">Vertrags-Status</div>
                        <div className="bg-royal/20 text-royal text-[10px] px-2 py-1 rounded">SECURE</div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border-l-2 border-green-500">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-white/40" />
                            <span className="text-xs text-white/80">Co-Founder Agreement</span>
                          </div>
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border-l-2 border-yellow-500">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-white/40" />
                            <span className="text-xs text-white/80">Supplier NDA</span>
                          </div>
                          <div className="text-[9px] text-yellow-500 uppercase">Review</div>
                        </div>
                      </div>
                      <div className="mt-6 p-3 rounded bg-royal/10 border border-royal/20 text-[10px] text-royal/80 leading-relaxed">
                        <span className="font-bold">Context Injector:</span> "Da ihr ein SaaS-Produkt baut, wurden Klauseln zu Server-Uptime und Datensicherheit automatisch hinzugefügt."
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${activeTab.bg} blur-2xl opacity-50`} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
