'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function HolographicGrid() {
  const starsNearRef = useRef<HTMLDivElement>(null);
  const starsFarRef = useRef<HTMLDivElement>(null);
  const hazeRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const animate = () => {
      const nextX = current.current.x + (target.current.x - current.current.x) * 0.06;
      const nextY = current.current.y + (target.current.y - current.current.y) * 0.06;
      current.current = { x: nextX, y: nextY };

      if (starsNearRef.current) {
        starsNearRef.current.style.transform = `translate3d(${nextX * 1.2}px, ${nextY * 1.2}px, 0)`;
      }
      if (starsFarRef.current) {
        starsFarRef.current.style.transform = `translate3d(${nextX * 0.5}px, ${nextY * 0.5}px, 0)`;
      }
      if (hazeRef.current) {
        hazeRef.current.style.transform = `translate3d(${nextX * 0.35}px, ${nextY * 0.35}px, 0)`;
      }

      if (Math.abs(target.current.x - nextX) > 0.1 || Math.abs(target.current.y - nextY) > 0.1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    const handleMove = (event: MouseEvent | PointerEvent) => {
      const relX = event.clientX / window.innerWidth - 0.5;
      const relY = event.clientY / window.innerHeight - 0.5;
      target.current = { x: relX * 18, y: relY * 18 };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleLeave = () => {
      target.current = { x: 0, y: 0 };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020204]">
      
      {/* 1. Layer: Statischer Nebel-Hintergrund (Atmosphäre) */}
      <div
        ref={hazeRef}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#050505] to-black opacity-80"
        style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
      />
      
      {/* 2. Layer: Funkelnde Sterne (CSS Animation) */}
      <div
        ref={starsNearRef}
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.1,
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
      />
      <div
        ref={starsFarRef}
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          opacity: 0.05,
          animation: 'pulse 4s infinite',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
      />

      {/* 3. Layer: Horizont-Linie & Glow */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF9900] to-transparent z-10 opacity-30" />

      {/* 4. Layer: Bewegtes 3D Gitter */}
      <div className="absolute top-0 left-0 w-full h-[50%] overflow-hidden" style={{ perspective: '800px' }}>
        <motion.div 
          initial={{ rotateX: -60, y: '20%' }}
          animate={{ backgroundPosition: ['0px 40px', '0px 0px'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-100%] opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(212,175,55,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,175,55,0.2) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
            transformOrigin: 'bottom',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
          }}
        />
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[50%] overflow-hidden" style={{ perspective: '800px' }}>
        <motion.div 
          initial={{ rotateX: 60, y: '-20%' }}
          animate={{ backgroundPosition: ['0px 0px', '0px 80px'] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-100%] opacity-30"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(to top, rgba(212,175,55,0.3) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
            transformOrigin: 'top',
            maskImage: 'radial-gradient(ellipse at 50% 0%, black 20%, transparent 90%)',
          }}
        />
      </div>
    </div>
  );
}
