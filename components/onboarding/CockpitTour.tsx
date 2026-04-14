'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ArrowLeft,
  Layout,
  MessageCircle,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Target,
  Users
} from 'lucide-react';
import { completeCockpitTour } from '@/app/actions/user';

interface CockpitTourProps {
  initialHasSeenTour: boolean;
  isNavOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

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
    id: 'open-nav',
    title: 'Navigation öffnen',
    content: 'Öffne jetzt deinen Orbital-Navigator, damit wir alle Module im Cockpit erklären können.',
    anchor: 'cockpit-core',
    position: 'bottom',
    icon: ShieldCheck
  },
  {
    id: 'ventures',
    title: 'Ventures',
    content: 'Hier findest du deine aktiven Ventures, ihren Fortschritt und den direkten Einstieg ins Forge-Cockpit.',
    anchor: 'cockpit-menu-ventures',
    position: 'bottom',
    icon: Rocket
  },
  {
    id: 'squads',
    title: 'Squads',
    content: 'Teamräume, Partner und interne Strukturen. Erstelle Squads oder tritt bestehenden Einheiten bei.',
    anchor: 'cockpit-menu-squads',
    position: 'left',
    icon: Users
  },
  {
    id: 'academy',
    title: 'Academy',
    content: 'Playbooks, Frameworks und Ressourcen. Hier findest du Wissen, Templates und operative Guides.',
    anchor: 'cockpit-menu-academy',
    position: 'left',
    icon: Layout
  },
  {
    id: 'profile',
    title: 'Profile',
    content: 'Deine Identität im Netzwerk: Profil, Bio, Skills, Reputation und Founder-Daten.',
    anchor: 'cockpit-menu-profile',
    position: 'top',
    icon: ShieldCheck
  },
  {
    id: 'messages',
    title: 'Messages',
    content: 'Direkte Kommunikation mit Foundern, Squads und Partnern. Alle DMs laufen hier zusammen.',
    anchor: 'cockpit-menu-messages',
    position: 'right',
    icon: MessageCircle
  },
  {
    id: 'forum',
    title: 'Forum',
    content: 'Community-Threads, Diskussionen, Feedback und Wissenstransfer. Poste, vote und kommentiere.',
    anchor: 'cockpit-menu-forum',
    position: 'right',
    icon: MessageSquare
  },
  {
    id: 'missions',
    title: 'Missions',
    content: 'Mission Control: Tasks, Ziele und Deadlines. Alles Operative läuft über diese Missionen.',
    anchor: 'cockpit-menu-missions',
    position: 'right',
    icon: Target
  }
];

export function CockpitTour({ initialHasSeenTour, isNavOpen, onNavOpenChange, onComplete }: CockpitTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [anchorFound, setAnchorFound] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = typeof window !== 'undefined'
      ? window.localStorage.getItem('cockpit_tour_completed') === 'true'
      : false;
    setIsDismissed(dismissed);
    if (!initialHasSeenTour && !dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [initialHasSeenTour]);

  useEffect(() => {
    if (!isVisible || currentStep === 0) return;
    if (!isNavOpen) onNavOpenChange(true);
  }, [currentStep, isNavOpen, isVisible, onNavOpenChange]);

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
      setAnchorFound(true);
    } else {
      setCoords({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        width: 0,
        height: 0
      });
      setAnchorFound(false);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isVisible) return;
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, updateCoords]);

  const handleNext = async () => {
    if (currentStep === 0 && !isNavOpen) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsVisible(false);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('cockpit_tour_completed', 'true');
      }
      await completeCockpitTour();
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isVisible || !mounted || isDismissed) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const canProceed = currentStep > 0 || isNavOpen;

  const getTooltipStyle = () => {
    const margin = 24;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    if (isMobile) {
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      // Wandere-Logik: Falls das Icon in der unteren Hälfte ist, Tooltip oben anzeigen.
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

    if (!anchorFound) {
      return { bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90vw' };
    }

    if (step.position === 'right') {
      return { top: coords.top + coords.height / 2, left: coords.left + coords.width + margin, transform: 'translateY(-50%)' };
    }
    if (step.position === 'left') {
      return { top: coords.top + coords.height / 2, left: coords.left - margin, transform: 'translate(-100%, -50%)' };
    }
    if (step.position === 'top') {
      return { top: coords.top - margin, left: coords.left + coords.width / 2, transform: 'translate(-50%, -100%)' };
    }
    return { top: coords.top + coords.height + margin, left: coords.left + coords.width / 2, transform: 'translateX(-50%)' };
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] pointer-events-none">
      <div className="absolute inset-0 bg-black/65 pointer-events-auto" />

      {anchorFound && (
        <div
          className="absolute rounded-2xl border border-white/10"
          style={{
            top: coords.top - 8,
            left: coords.left - 8,
            width: coords.width + 16,
            height: coords.height + 16
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        key={currentStep}
        className="absolute bg-[#0F1113]/80 border border-white/10 rounded-[1.5rem] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,1)] pointer-events-auto [backdrop-filter:brightness(1.2)_blur(3px)]"
        style={getTooltipStyle()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#FF9900]/10 flex items-center justify-center text-[#FF9900] border border-[#FF9900]/20">
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#FF9900]">Step {currentStep + 1} / {STEPS.length}</p>
            <h3 className="text-base font-bold text-white tracking-tight">{step.title}</h3>
          </div>
        </div>

        <p className="text-[13px] text-white/60 leading-relaxed mb-5">
          {step.content}
        </p>

        {currentStep === 0 && (
          <div className="mb-5">
            <button
              onClick={() => onNavOpenChange(true)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
            >
              Navigation öffnen
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-white/30 hover:text-white'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Zurück
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${
              canProceed ? 'bg-[#FF9900] hover:bg-[#FF9900] text-black shadow-xl shadow-[#FF9900]/15' : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {currentStep === STEPS.length - 1 ? 'Tour abschließen' : 'Nächster Schritt'} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
