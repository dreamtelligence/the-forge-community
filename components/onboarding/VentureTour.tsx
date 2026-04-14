'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Zap, Package, Palette, Megaphone, CheckCircle2 } from 'lucide-react';
import { completeOnboardingTour } from '@/app/actions/user';

interface Step {
  id: string;
  title: string;
  content: string;
  anchor: string;
  position: 'right' | 'left' | 'top' | 'bottom';
  icon: any;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Willkommen in der Schmiede',
    content: 'Das ist dein Venture Workspace. Hier orchestrierst du dein gesamtes Business.',
    anchor: 'venture-header',
    position: 'right',
    icon: Zap
  },
  {
    id: 'stats',
    title: 'KPIs & Fortschritt',
    content: 'Behalte Budget, Deadlines und deinen Meilenstein-Fortschritt in Echtzeit im Auge.',
    anchor: 'stats-grid',
    position: 'bottom',
    icon: CheckCircle2
  },
  {
    id: 'brand',
    title: 'Identität & KI-Kontext',
    content: 'Definiere deine Brand DNA. Sie dient als Gehirn für alle unsere KI-Marketing-Tools.',
    anchor: 'brand-dna-card',
    position: 'bottom',
    icon: Palette
  },
  {
    id: 'sourcing',
    title: 'Hunderte B2B Partner',
    content: 'Greife sofort auf hunderte verifizierte Lieferanten und Logistik-Hallen in ganz Deutschland zu.',
    anchor: 'menu-suppliers',
    position: 'right',
    icon: Package
  },
  {
    id: 'marketing',
    title: 'Skalierung per Klick',
    content: 'Erstelle verkaufspsychologische Ads und Kampagnen, die perfekt zu deiner Brand passen.',
    anchor: 'marketing-card',
    position: 'bottom',
    icon: Megaphone
  }
];

export function VentureTour({ initialHasSeenTour }: { initialHasSeenTour: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!initialHasSeenTour) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [initialHasSeenTour]);

  const updateCoords = useCallback(() => {
    const step = STEPS[currentStep];
    const element = document.querySelector(`[data-tour="${step.anchor}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isVisible) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, updateCoords]);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsVisible(false);
      await completeOnboardingTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isVisible || !mounted) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  const getTooltipStyle = () => {
    const margin = 24;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    
    if (isMobile) {
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      // Wander-Logik: Falls Icon in der unteren Hälfte, Tooltip oben.
      const step = STEPS[currentStep];
      const element = document.querySelector(`[data-tour="${step.anchor}"]`);
      const rect = element?.getBoundingClientRect();
      const showAtTop = rect ? rect.top > windowHeight / 2 : false;

      return { 
        top: showAtTop ? 'calc(env(safe-area-inset-top) + 60px)' : 'auto', 
        bottom: showAtTop ? 'auto' : 'calc(env(safe-area-inset-bottom) + 80px)', 
        left: '50%', 
        width: 'calc(100vw - 32px)',
        maxWidth: '400px',
        transform: 'translateX(-50%)'
      };
    }

    if (step.position === 'right') {
      return { top: coords.top + coords.height / 2, left: coords.left + coords.width + margin, transform: 'translateY(-50%)' };
    }
    if (step.position === 'bottom') {
      return { top: coords.top + coords.height + margin, left: coords.left + coords.width / 2, transform: 'translateX(-50%)' };
    }
    return { top: coords.top + coords.height / 2, left: coords.left + coords.width + margin, transform: 'translateY(-50%)' };
  };

  // The Portal ensures the tour is always on the very top layer of the DOM
  return createPortal(
    <div className="fixed inset-0 z-[2147483647] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[3px] pointer-events-auto" style={{
        clipPath: `polygon(
          0% 0%, 
          0% 100%, 
          ${coords.left - 12}px 100%, 
          ${coords.left - 12}px ${coords.top - 12}px, 
          ${coords.left + coords.width + 12}px ${coords.top - 12}px, 
          ${coords.left + coords.width + 12}px ${coords.top + coords.height + 12}px, 
          ${coords.left - 12}px ${coords.top + coords.height + 12}px, 
          ${coords.left - 12}px 100%, 
          100% 100%, 
          100% 0%
        )`
      }} onClick={(e) => e.stopPropagation()} />

      {/* Focus Ring */}
      <motion.div
        animate={{ boxShadow: ['0 0 0 2px rgba(212,175,55,0.2)', '0 0 0 6px rgba(212,175,55,0.4)', '0 0 0 2px rgba(212,175,55,0.2)'] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute rounded-2xl border-2 border-[#FF9900]"
        style={{
          top: coords.top - 12,
          left: coords.left - 12,
          width: coords.width + 24,
          height: coords.height + 24
        }}
      />

      {/* Tooltip Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={currentStep}
        className="absolute bg-[#0F1113]/80 border border-white/10 rounded-[2rem] p-8 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] pointer-events-auto [backdrop-filter:brightness(1.2)_blur(3px)]"
        style={getTooltipStyle()}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FF9900]/10 flex items-center justify-center text-[#FF9900] border border-[#FF9900]/20">
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF9900]">Step {currentStep + 1} / {STEPS.length}</p>
            <h3 className="text-xl font-bold text-white tracking-tight">{step.title}</h3>
          </div>
        </div>

        <p className="text-sm text-white/50 leading-relaxed mb-8">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-white/30 hover:text-white'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Zurück
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-3 px-7 py-3.5 bg-[#FF9900] hover:bg-[#FF9900] text-black rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-[#FF9900]/20"
          >
            {currentStep === STEPS.length - 1 ? 'Tour beenden' : 'Nächster Schritt'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
