'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function ScrollHeroAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress within this section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Logo Animation Phases
  // 0.0 - 0.3: Move from top to center, fade from dark to white
  // 0.3 - 0.5: Stay centered
  // 0.5 - 1.0: Move to bottom + scale up HUGE (zoom in effect)

  const logoY = useTransform(scrollYProgress,
    [0, 0.3, 0.5, 1.0],
    ['-30%', '0%', '0%', '50%']
  );

  const logoScale = useTransform(scrollYProgress,
    [0, 0.5, 1.0],
    [0.8, 1, 2.5] // Gets GIGANTIC
  );

  const logoOpacity = useTransform(scrollYProgress,
    [0, 0.3, 0.5],
    [0.3, 1, 1] // From dark/transparent to fully white
  );

  // Side Content (appears when logo starts moving down)
  // Headline left + Video right
  const sideContentOpacity = useTransform(scrollYProgress,
    [0.4, 0.6],
    [0, 1]
  );

  const headlineX = useTransform(scrollYProgress,
    [0.4, 0.7],
    [-100, 0]
  );

  const videoX = useTransform(scrollYProgress,
    [0.4, 0.7],
    [100, 0]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[300vh] bg-black" // 3x viewport height for scroll
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">

        {/* Main Logo - Center */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            y: logoY,
            scale: logoScale,
            opacity: logoOpacity
          }}
        >
          <h1 className="text-[8rem] md:text-[12rem] font-black text-white leading-none tracking-tight whitespace-nowrap">
            Stake&Scale
          </h1>
        </motion.div>

        {/* Left: Headline (appears when logo moves down) */}
        <motion.div
          className="absolute left-[8%] top-1/2 -translate-y-1/2 max-w-[500px]"
          style={{
            opacity: sideContentOpacity,
            x: headlineX
          }}
        >
          <h2 className="text-[3rem] md:text-[3.5rem] font-medium text-white leading-[1.1]">
            Starte dein Buisness alleine oder mit einem Team.
            <br />
            Profitiere von unserem
            <br />
            Netzwerk an B2B
            <br />
            Händlern.
          </h2>
        </motion.div>

        {/* Right: Video Card (appears when logo moves down) */}
        <motion.div
          className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[400px] h-[380px] rounded-[10px] overflow-hidden bg-[#E5D4C1]"
          style={{
            opacity: sideContentOpacity,
            x: videoX
          }}
        >
          {/* Placeholder for video/image */}
          <div className="relative w-full h-full flex items-center justify-center">
            <span className="text-black/30 text-sm">Video / Image</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
