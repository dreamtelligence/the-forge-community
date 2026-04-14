'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const images = [
  { src: '/images/fruits.webp', label: 'FOOD', aspectRatio: 'aspect-[3/4]', width: 'w-[200px] sm:w-[260px]' },
  { src: '/images/supplements-v2.webp', label: 'SUPPLEMENTS', aspectRatio: 'aspect-[4/3]', width: 'w-[240px] sm:w-[320px]' },
  { src: '/vans.webp', label: 'SHOES', aspectRatio: 'aspect-[2/3]', width: 'w-[180px] sm:w-[240px]' },
  { src: '/parfum.jpg', label: 'BEAUTY', aspectRatio: 'aspect-[16/9]', width: 'w-[280px] sm:w-[360px]' },
  { src: '/fashion.webp', label: 'FASHION', aspectRatio: 'aspect-square', width: 'w-[200px] sm:w-[260px]' },
  { src: '/images/stuhl.webp', label: 'HOME & LIVING', aspectRatio: 'aspect-[3/5]', width: 'w-[220px] sm:w-[280px]' },
  { src: '/electronics.webp', label: 'ELECTRONICS', aspectRatio: 'aspect-[3/2]', width: 'w-[260px] sm:w-[340px]' },
];

export default function InfiniteImageLoop() {
  // Duplicate images for seamless loop
  const duplicatedImages = [...images, ...images, ...images];

  return (
    <div className="relative w-full overflow-hidden bg-black py-20">
      {/* Gradient masks for smooth fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-6 sm:gap-8 items-center w-max"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{
          duration: 30,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        {duplicatedImages.map((img, index) => (
          <div
            key={index}
            className={cn(
              'relative overflow-hidden rounded-lg sm:rounded-xl grayscale hover:grayscale-0 transition-all duration-500 cursor-pointer border border-white/10 hover:border-white/30',
              img.aspectRatio,
              img.width,
              // Add vertical offset/stagger effect
              index % 2 === 0 ? '-translate-y-4 sm:-translate-y-8' : 'translate-y-4 sm:translate-y-8',
              index % 3 === 0 && 'scale-90',
              index % 5 === 0 && 'scale-105'
            )}
          >
            <img
              src={img.src}
              alt={img.label}
              className="object-contain w-full h-full"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              {img.label}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
