'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function StakeScaleHero() {
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt Effect (like Framer)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  // Perspective transforms (Tilt Limit: 6 from Framer)
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
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6">
        <h1 className="text-xl font-medium">Stake & Scale</h1>
        <div className="flex gap-8 text-sm">
          <a href="#home" className="hover:text-gray-400 transition-colors">Home</a>
          <a href="#gallery" className="hover:text-gray-400 transition-colors">Gallery</a>
          <a href="#work" className="hover:text-gray-400 transition-colors">Work</a>
          <a href="#contact" className="hover:text-gray-400 transition-colors">Contact</a>
        </div>
        <div className="text-right text-xs">
          <div className="font-medium">Based in Dortmund</div>
          <div className="text-gray-400">Art Director + Framer Developer</div>
        </div>
      </nav>

      {/* Main Hero Content */}
      <div className="relative h-screen flex items-center justify-center px-8">
        {/* Left: Headline */}
        <div className="absolute left-[10%] top-1/2 -translate-y-1/2 max-w-[540px]">
          <motion.h2
            className="text-[3.5rem] leading-[1.1] font-medium"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Starte dein Buisness alleine oder mit einem Team.
            <br />
            Profitiere von unserem
            <br />
            Netzwerk an B2B
            <br />
            Händlern.
          </motion.h2>
        </div>

        {/* Center: Scroll Indicator */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-2 h-2 rounded-full bg-white" />
        </motion.div>

        {/* Right: 3D Image Card */}
        <motion.div
          ref={cardRef}
          className="absolute right-[10%] top-1/2 -translate-y-1/2 w-[390px] h-[379px] rounded-[10px] overflow-hidden cursor-pointer"
          style={{
            perspective: 500,
            rotateX,
            rotateY,
            transformStyle: "preserve-3d"
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
        >
          {/* THE FORGE Text Overlay */}
          <div className="absolute top-0 left-0 z-10 p-4">
            <div
              className="text-[4rem] font-black leading-[0.9] tracking-tighter"
              style={{
                writingMode: 'vertical-lr',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)'
              }}
            >
              THE FORGE
            </div>
          </div>

          {/* Image */}
          <div className="relative w-full h-full bg-[#E5D4C1]">
            {/* Placeholder - Replace with your actual image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-black/20 text-sm">Your Image Here</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom: Large Logo */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
        <motion.h3
          className="text-[12rem] font-black leading-none tracking-tight px-8"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          Stake&Scale
        </motion.h3>
      </div>
    </div>
  );
}
