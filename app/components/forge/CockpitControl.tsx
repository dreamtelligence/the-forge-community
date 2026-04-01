'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Users, 
  GraduationCap,
  User as UserIcon,
  MessageCircle,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { useUnreadMessages } from '@/app/hooks/useUnreadMessages';
import { CoreSpinLoader } from '@/components/ui/core-spin-loader';

interface CockpitControlProps {
  userImage?: string | null;
  userName?: string;
  stats: {
    ventures: number;
    tasks: number;
  };
  onToggleView: (view: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  minimal?: boolean;
}

export default function CockpitControl({
  userName,
  onToggleView,
  isOpen: controlledOpen,
  onOpenChange,
  minimal = false
}: CockpitControlProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = typeof controlledOpen === 'boolean' ? controlledOpen : isOpenInternal;
  const setIsOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (typeof controlledOpen !== 'boolean') {
      setIsOpenInternal(next);
    }
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const parallaxRafRef = useRef<number | null>(null);
  const parallaxTarget = useRef({ x: 0, y: 0 });
  const parallaxCurrent = useRef({ x: 0, y: 0 });
  const [, setOrbitSize] = useState(720);
  const [orbitRadius, setOrbitRadius] = useState(220);
  const { unreadCount } = useUnreadMessages(30000, { enableSound: true });

  const accent = '#C08A3A';
  const menuItems = [
    { icon: Rocket, label: 'Ventures', description: 'Deine Projekte', action: () => onToggleView('ventures'), color: accent, tourId: 'cockpit-menu-ventures' },
    { icon: Users, label: 'Squads', description: 'Teams & Partner', href: '/squads', color: accent, tourId: 'cockpit-menu-squads' },
    { icon: GraduationCap, label: 'Academy', description: 'Playbooks & Wissen', href: '/resources', color: accent, tourId: 'cockpit-menu-academy' },
    { icon: UserIcon, label: 'Profile', description: 'Deine Identität', href: '/profile', color: accent, tourId: 'cockpit-menu-profile' },
    { icon: MessageCircle, label: 'Messages', description: 'DMs & Inbox', href: '/messages', color: accent, badgeCount: unreadCount, tourId: 'cockpit-menu-messages' },
    { icon: MessageSquare, label: 'Forum', description: 'Community Threads', href: '/forum', color: accent, tourId: 'cockpit-menu-forum' },
    { icon: Zap, label: 'Missions', description: 'Tasks & Ziele', action: () => onToggleView('missions'), color: accent, tourId: 'cockpit-menu-missions' },
  ];
  const angleStep = 360 / menuItems.length;
  const startAngle = -90;

  useEffect(() => {
    const update = () => {
      const size = containerRef.current?.offsetWidth || 720;
      setOrbitSize(size);
      setOrbitRadius(Math.max(150, Math.min(240, Math.round(size * 0.32))));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (minimal) return;
    const container = containerRef.current;
    const layer = parallaxRef.current;
    if (!container || !layer) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const maxOffset = 18;

    const animate = () => {
      const { x, y } = parallaxCurrent.current;
      const target = parallaxTarget.current;
      const nextX = x + (target.x - x) * 0.08;
      const nextY = y + (target.y - y) * 0.08;

      parallaxCurrent.current = { x: nextX, y: nextY };
      layer.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;

      if (Math.abs(target.x - nextX) > 0.1 || Math.abs(target.y - nextY) > 0.1) {
        parallaxRafRef.current = requestAnimationFrame(animate);
      } else {
        parallaxRafRef.current = null;
      }
    };

    const handleMove = (event: MouseEvent | PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5;
      const relY = (event.clientY - rect.top) / rect.height - 0.5;
      parallaxTarget.current = {
        x: relX * maxOffset,
        y: relY * maxOffset,
      };
      if (parallaxRafRef.current === null) {
        parallaxRafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleLeave = () => {
      parallaxTarget.current = { x: 0, y: 0 };
      if (parallaxRafRef.current === null) {
        parallaxRafRef.current = requestAnimationFrame(animate);
      }
    };

    layer.style.willChange = 'transform';
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);
    container.addEventListener('pointermove', handleMove);
    container.addEventListener('pointerleave', handleLeave);

    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
      container.removeEventListener('pointermove', handleMove);
      container.removeEventListener('pointerleave', handleLeave);
      if (parallaxRafRef.current !== null) {
        cancelAnimationFrame(parallaxRafRef.current);
        parallaxRafRef.current = null;
      }
    };
  }, [minimal]);

  const displayName = userName?.trim().split(' ')[0] || 'Operator';

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-[min(720px,90vw)] h-[min(720px,90vw)]">
      
      {/* --- BACKGROUND AMBIENCE (Deep Glow) --- */}
      {!minimal && (
        <div
          ref={parallaxRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        >
          <div className={`transition-all duration-1000 absolute w-[300px] h-[300px] bg-[#1A1410] rounded-full ${isOpen ? 'scale-150 opacity-40' : 'scale-100 opacity-25'}`} />
          
          {/* Rotating Tech Rings (Subtle) */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute w-[min(640px,80vw)] h-[min(640px,80vw)] rounded-full border border-[#3A2A18] opacity-35"
          />
        </div>
      )}

      {/* Connector dots removed */}

      {/* --- CENTRAL CONTROL --- */}
      <div className="relative z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute inset-0 z-[-1] pointer-events-none"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0, 0.3]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-[-20px] rounded-full border-2 border-[#3A2A18]"
              />
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="absolute inset-[-10px] rounded-full bg-[#1A1410] border border-[#3A2A18]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="relative w-32 h-32 flex items-center justify-center group outline-none cursor-pointer"
          aria-label={`${isOpen ? 'Close' : 'Open'} cockpit for ${displayName}`}
          data-tour="cockpit-core"
        >
          <CoreSpinLoader
            size={96}
            showText={false}
            disableBlur
            variant="forge"
            className="pointer-events-none"
          />
          
          {/* Orbit Ring Animation */}
          {!minimal && (
            <div className="absolute inset-[-8px] rounded-full border border-[#3A2A18] border-t-[#7B5322] animate-spin-slow pointer-events-none" />
          )}
        </motion.button>

        {!isOpen && (
          <>
            {/* Top Arrow pointing down */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 bottom-full mb-6 -translate-x-1/2 pointer-events-none select-none z-50"
            >
              <motion.div
                animate={{ 
                  y: [0, 12, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="text-[#8B5E23]/70"
              >
                <ChevronDown className="w-12 h-12" />
              </motion.div>
            </motion.div>

            {/* Bottom Arrow pointing up */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-full mt-6 -translate-x-1/2 pointer-events-none select-none z-50"
            >
              <motion.div
                animate={{ 
                  y: [0, -12, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="text-[#8B5E23]/70"
              >
                <ChevronUp className="w-12 h-12" />
              </motion.div>
            </motion.div>
          </>
        )}
      </div>

      {/* --- SATELLITES --- */}
      <AnimatePresence>
        {isOpen && menuItems.map((item, index) => {
          const angle = startAngle + index * angleStep;
          const radian = (angle * Math.PI) / 180;
          const x = Math.cos(radian) * orbitRadius;
          const y = Math.sin(radian) * orbitRadius;

          return (
            <div
              key={item.label}
              className="absolute left-1/2 top-1/2 z-40 pointer-events-auto"
              style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
              data-tour={item.tourId}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25, 
                  delay: index * 0.05 
                }}
              >
                {item.href ? (
                  <Link href={item.href} className="group block text-center">
                    <SatelliteContent item={item} />
                  </Link>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); item.action?.(); setIsOpen(false); }} className="group block text-center">
                    <SatelliteContent item={item} />
                  </button>
                )}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function SatelliteContent({ item }: { item: any }) {
  const badge = Number(item.badgeCount || 0);
  const badgeText = badge > 99 ? '99+' : String(badge);

  return (
    <div className="flex flex-col items-center gap-2 group">
      {/* Simple Icon */}
      <div className="relative w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        <item.icon className="w-7 h-7 text-[#C08A3A]/80 group-hover:text-[#D39B4A]" />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#C08A3A] text-[8px] font-black text-black flex items-center justify-center">
            {badgeText}
          </span>
        )}
      </div>
      <div className="text-center antialiased">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D0B089] group-hover:text-[#E2C39A] transition-colors">
          {item.label}
        </div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[#8E6A3E]">
          {item.description}
        </div>
      </div>
    </div>
  );
}
