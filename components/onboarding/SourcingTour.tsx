'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export function SourcingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const isCompleted = localStorage.getItem('sourcing_tour_completed');
    if (!isCompleted) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateCoords = useCallback(() => {
    const element = document.querySelector('[data-tour="sourcing-network-btn"]');
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (isVisible) {
      const tryUpdate = () => {
        const found = updateCoords();
        if (!found) {
          retryRef.current = window.setTimeout(tryUpdate, 150);
        }
      };
      tryUpdate();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
      if (retryRef.current) {
        window.clearTimeout(retryRef.current);
      }
    };
  }, [isVisible, updateCoords]);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('sourcing_tour_completed', 'true');
  };

  if (!isVisible || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999999] pointer-events-none">
      {/* Small Overlay Hole */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-auto" style={{
        clipPath: `polygon(
          0% 0%, 
          0% 100%, 
          ${coords.left - 8}px 100%, 
          ${coords.left - 8}px ${coords.top - 8}px, 
          ${coords.left + coords.width + 8}px ${coords.top - 8}px, 
          ${coords.left + coords.width + 8}px ${coords.top + coords.height + 8}px, 
          ${coords.left - 8}px ${coords.top + coords.height + 8}px, 
          ${coords.left - 8}px 100%, 
          100% 100%, 
          100% 0%
        )`
      }} onClick={dismiss} />

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="absolute w-72 bg-[#0F1113]/80 border border-[#FF9900]/30 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto [backdrop-filter:brightness(1.2)_blur(3px)]"
        style={{
          top: coords.top + coords.height + 16,
          left: coords.left + coords.width / 2,
          transform: 'translateX(-50%)'
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF9900]/10 flex items-center justify-center text-[#FF9900] flex-shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-tight">Netzwerk anzapfen</h4>
            <p className="text-xs text-white/50 mt-1">Hier findest du hunderte Partner & Lagerhallen für dein Venture.</p>
          </div>
        </div>
        
        <button
          onClick={dismiss}
          className="w-full py-2 bg-[#FF9900] hover:bg-[#FF9900] text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Verstanden
        </button>

        {/* Arrow Pointer */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0F1113]/80 border-l border-t border-[#FF9900]/30 rotate-45" />
      </motion.div>
    </div>,
    document.body
  );
}
