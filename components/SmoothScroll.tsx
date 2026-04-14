'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Nur auf Desktop (kein Touch-Gerät)
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    // Verzögert initialisieren — blockiert nicht den ersten Paint
    const timer = setTimeout(() => {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      });

      lenisRef.current = lenis;

      let rafId: number;
      function raf(time: number) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      // Cleanup
      return () => {
        cancelAnimationFrame(rafId);
        lenis.destroy();
      };
    }, 1000); // 1s nach erstem Paint starten

    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}
