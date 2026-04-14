'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import ColorBends from '@/components/visual/ColorBends';

type LaunchHeroProps = {
  enableShaderBackground?: boolean;
};

export default function LaunchHero({ enableShaderBackground = false }: LaunchHeroProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { copy } = useI18n();
  const heroLines: string[] = copy?.hero?.lines ?? [];

  // 3D Tilt Effect for image card
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div id="hero" className="relative min-h-screen bg-black text-white overflow-hidden">
      {enableShaderBackground ? (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute left-[5%] right-[5%] top-0 h-[76%] overflow-hidden rounded-b-[14rem]">
            <ColorBends
              className="h-full w-full"
              colors={['#F2F2F0', '#D6DEE4', '#B8C8D4', '#121212']}
              rotation={16}
              speed={0.08}
              autoRotate={1}
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/8 via-transparent to-black/68" />
        </div>
      ) : null}

      {/* Mobile Hero */}
      <div className="lg:hidden relative z-10 min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
        {/* Stake&Scale Logo - Mobile Animation (3-Phasen wie Desktop) */}
        <motion.h3
          className="absolute left-1/2 font-black leading-none text-white whitespace-nowrap z-0"
          style={{
            x: '-50%',
            letterSpacing: '-0.08em',
          }}
          initial={{
            top: '10%',
            fontSize: '2.5rem',
            color: 'rgba(255, 255, 255, 0.2)',
          }}
          animate={{
            top: ['10%', '35%', '35%', '15%'],
            fontSize: ['2.5rem', '2.5rem', '2.5rem', '4.5rem'],
            color: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
          }}
          transition={{
            duration: 3,
            times: [0, 0.33, 0.73, 1],
            ease: ['easeInOut', 'linear', 'backOut'],
          }}
        >
          Stake&Scale
        </motion.h3>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-end w-full px-6 gap-6 pb-12 pt-[28vh]">
          {/* Video Card - erscheint beim Wup-Start */}
          <motion.div
            className="w-full max-w-[340px] aspect-square rounded-[10px] relative bg-[#E5D4C1] shadow-2xl"
            initial={{ y: 50, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{
              delay: 2.2,
              duration: 0.8,
              ease: 'backOut'
            }}
          >
            {/* Video */}
            <div className="absolute inset-0 w-full h-full overflow-hidden rounded-[10px]">
              <iframe
                src="https://player.vimeo.com/video/315891633?autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0"
                frameBorder="0"
                allow="autoplay; fullscreen"
                className="w-full h-full"
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  border: 'none',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </motion.div>

          {/* Headline - erscheint kurz nach Video */}
          <motion.div
            className="w-full text-center pt-2"
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              delay: 2.5,
              duration: 0.7,
              ease: 'backOut'
            }}
          >
            <h2 suppressHydrationWarning className="text-[2.15rem] leading-[1.18] font-medium py-1">
              {heroLines.map((line, index) => (
                <span key={line}>
                  {line}
                  {index < heroLines.length - 1 && <br />}
                </span>
              ))}
            </h2>
          </motion.div>
        </div>
      </div>

      {/* Desktop Hero */}
      <div className="hidden lg:block relative z-10">
        {/* Main Hero Content */}
        <div className="relative h-screen">
          {/* Stake&Scale Logo - Three-phase animation */}
          <motion.h3
            className="absolute left-1/2 font-black leading-none tracking-tighter text-white whitespace-nowrap"
            style={{
              x: '-50%',
              letterSpacing: '-0.05em',
            }}
            initial={{
              top: '10%',
              fontSize: '8rem',
              color: 'rgba(255, 255, 255, 0.2)',
            }}
            animate={{
              top: ['10%', '45%', '45%', '68%'],
              fontSize: ['8rem', '8rem', '8rem', '16rem'],
              color: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
            }}
            transition={{
              duration: 3,
              times: [0, 0.33, 0.73, 1], // 0-1s (Move), 1-2.2s (Hold), 2.2-3s (Wup)
              ease: ['easeInOut', 'linear', 'backOut'],
            }}
          >
            Stake&Scale
          </motion.h3>

          {/* Content Container */}
          <div className="relative h-full flex items-start justify-between pl-[12%] pr-[8%] pt-24">
            {/* Left: Headline - Appears after logo settles */}
            <motion.div
              className="max-w-[680px]"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                delay: 2.8,
                duration: 0.8,
                ease: 'backOut'
              }}
            >
              <h1 suppressHydrationWarning className="text-[4.3rem] leading-[1.18] font-medium py-1">
                <span className="lg:whitespace-nowrap">{heroLines[0]}</span>
                {heroLines.slice(1).map((line) => (
                  <span key={line}>
                    <br />
                    {line}
                  </span>
                ))}
              </h1>
            </motion.div>

            {/* Right: 3D Image Card - Syncs with the "Wup" */}
            <motion.div
              ref={cardRef}
              className="w-[480px] h-[460px] rounded-[10px] cursor-pointer relative bg-[#E5D4C1]"
              style={{
                perspective: 500,
                rotateX,
                rotateY,
                transformStyle: "preserve-3d"
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              initial={{ x: 50, opacity: 0, scale: 0.5 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{
                delay: 2.2, // Syncs with the "Wup" start (0.73 * 3s ≈ 2.2s)
                duration: 0.8,
                ease: 'backOut' // Punchy expansion
              }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Video */}
              <div className="absolute inset-0 w-full h-full overflow-hidden rounded-[10px]">
                <iframe
                  src="https://player.vimeo.com/video/315891633?autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0"
                  frameBorder="0"
                  allow="autoplay; fullscreen"
                  className="w-full h-full"
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    border: 'none'
                  }}
                />
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
