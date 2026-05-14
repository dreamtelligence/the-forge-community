'use client';

import { useEffect, useState } from 'react';
import ColorBends from '@/components/visual/ColorBends';
import { cn } from '@/lib/utils';

type LandingShaderAccentProps = {
  className?: string;
  mask: string;
};

export default function LandingShaderAccent({ className, mask }: LandingShaderAccentProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  return (
    <div className={cn('pointer-events-none absolute inset-0 z-0 overflow-hidden', className)}>
      {isMobile ? (
        /* CSS-only fallback — kein WebGL auf Touch-Geräten */
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-black/30 to-black/65" />
      ) : (
        <div
          className="absolute inset-[-16%] opacity-55"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          <ColorBends
            className="h-full w-full"
            colors={['#F2F2F0', '#D6DEE4', '#B8C8D4', '#121212']}
            rotation={16}
            speed={0}
            autoRotate={0}
            scale={1.1}
            frequency={0.82}
            warpStrength={0.62}
            mouseInfluence={0}
            parallax={0}
            noise={0}
            transparent
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-black/20 to-black/70" />
          <div className="absolute inset-0 opacity-[0.11] mix-blend-soft-light [background-size:3px_3px] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.5px,transparent_0.8px)]" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
