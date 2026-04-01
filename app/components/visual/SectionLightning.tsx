'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import Lightning from './Lightning';

type SectionLightningProps = {
  className?: string;
  activeClassName?: string;
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
};

export default function SectionLightning({
  className,
  activeClassName = 'opacity-70',
  hue = 24,
  xOffset = 0.15,
  speed = 0.7,
  intensity = 1.05,
  size = 1.15
}: SectionLightningProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { threshold: 0.2, rootMargin: '0px 0px -15% 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute inset-0 pointer-events-none transition-opacity duration-[1200ms] ease-out',
        active ? activeClassName : 'opacity-0',
        className
      )}
    >
      <Lightning
        hue={hue}
        xOffset={xOffset}
        speed={speed}
        intensity={intensity}
        size={size}
        className="absolute inset-0"
      />
    </div>
  );
}
