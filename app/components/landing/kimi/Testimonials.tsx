'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import CtaButton from '@/app/components/landing/kimi/CtaButton';
import { useI18n } from '@/app/components/i18n/I18nProvider';

const cardPositions = [
  { x: '8%', rotate: -2 },
  { x: '62%', rotate: 1.5 },
  { x: '30%', rotate: -1 },
  { x: '70%', rotate: 2 },
  { x: '15%', rotate: -1.5 },
];

export default function Testimonials() {
  const { copy } = useI18n();
  const testimonials = copy.testimonials.items as Array<{
    id: number;
    quote: string;
    name: string;
    title: string;
    avatar: string;
  }>;
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section ref={containerRef} className="relative overflow-visible">
      {/* Mobile View: Horizontal Scroll */}
      <div className="lg:hidden bg-black py-16 px-6">
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">{copy.testimonials.label}</p>
          <h2 className="text-4xl font-bold text-white tracking-tight">{copy.testimonials.title}</h2>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id}
              className="min-w-[85vw] snap-center p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl"
            >
              <p className="text-white/80 text-lg leading-relaxed mb-8">"{testimonial.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 relative flex-shrink-0">
                  <Image 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    fill
                    sizes="48px"
                    className="object-cover" 
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold">{testimonial.name}</p>
                    <VerifiedBadge />
                  </div>
                  <p className="text-white/60 text-xs">{testimonial.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
          <CtaButton href="#start" label={copy.testimonials.cta} variant="outline" size="md" className="w-full" />
        </div>
      </div>

      {/* Desktop View: Flying Cards Effect */}
      <div className="hidden lg:block relative" style={{ height: `${220 + testimonials.length * 70}vh` }}>
        <div className="sticky top-0 h-screen w-full bg-black flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-full overflow-hidden">
              <div className="marquee-track text-white/95 font-bold tracking-tight">
                <span className="marquee-text">{copy.testimonials.marquee} — {copy.testimonials.marquee}</span>
                <span className="marquee-text">{copy.testimonials.marquee}  —</span>
                <span className="marquee-text">{copy.testimonials.marquee}  —</span>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-6xl mx-auto h-[65vh] z-10">
            {testimonials.map((testimonial, index) => (
              <FlyingTestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                index={index}
                position={cardPositions[index % cardPositions.length]}
                scrollYProgress={scrollYProgress}
                totalCards={testimonials.length}
              />
            ))}
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-6">
            <CtaButton href="#start" label={copy.testimonials.cta} variant="outline" size="md" />
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <ScrollIndicator key={index} index={index} scrollYProgress={scrollYProgress} total={testimonials.length} />
              ))}
            </div>
          </div>

          <style jsx>{`
            .marquee-track {
              display: flex;
              gap: 6rem;
              width: max-content;
              font-size: clamp(3rem, 12vw, 9rem);
              white-space: nowrap;
              animation: marquee 16s linear infinite;
            }
            .marquee-text {
              display: inline-flex;
              align-items: center;
            }
            @keyframes marquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-33%); }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}

interface FlyingTestimonialCardProps {
  testimonial: {
    id: number;
    quote: string;
    name: string;
    title: string;
    avatar: string;
  };
  index: number;
  position: { x: string; rotate: number };
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'];
  totalCards: number;
}

function FlyingTestimonialCard({ 
  testimonial, 
  index, 
  position, 
  scrollYProgress,
  totalCards 
}: FlyingTestimonialCardProps) {
  const segment = 0.9 / totalCards;
  const start = 0.05 + index * segment;
  const mid = start + segment * 0.5;
  const end = start + segment * 1.1;

  const translateY = useTransform(scrollYProgress, [start, mid, end], ['140%', '0%', '-140%']);

  const opacity = useTransform(
    scrollYProgress,
    [start, start + 0.03, end - 0.03, end],
    [0, 1, 1, 0]
  );

  const scale = useTransform(scrollYProgress, [start, mid, end], [1, 1, 1]);

  return (
    <motion.div 
      style={{ 
        y: translateY,
        opacity, 
        scale,
        left: position.x,
        top: '50%',
        zIndex: 10 + index,
      }} 
      className="absolute w-72 sm:w-80 -translate-y-1/2 will-change-transform"
    >
      <div className="p-6 rounded-2xl border border-white/15 bg-black shadow-[0_30px_70px_-50px_rgba(0,0,0,0.9)] transition-colors duration-300">
        <p className="text-white/90 text-sm leading-relaxed mb-6">{testimonial.quote}</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 relative">
            <Image 
              src={testimonial.avatar} 
              alt={testimonial.name} 
              fill
              sizes="48px"
              className="object-cover" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white text-sm font-semibold">{testimonial.name}</p>
              <VerifiedBadge />
            </div>
            <p className="text-white/60 text-xs">{testimonial.title}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center justify-center">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" fill="#2F73FF" />
        <path
          d="M8.6 12.4l2.2 2.2 4.6-4.8"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ScrollIndicator({ 
  index, 
  scrollYProgress, 
  total 
}: { 
  index: number; 
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'];
  total: number;
}) {
  const segmentSize = 1 / total;
  const start = index * segmentSize;
  const end = (index + 1) * segmentSize;
  
  const opacity = useTransform(
    scrollYProgress,
    [start - 0.05, start, end, end + 0.05],
    [0.3, 1, 1, 0.3]
  );
  
  const scale = useTransform(
    scrollYProgress,
    [start, start + 0.05, end - 0.05, end],
    [1, 1.2, 1.2, 1]
  );

  return (
    <motion.div 
      style={{ opacity, scale }}
      className="w-2 h-2 rounded-full bg-white/70"
    />
  );
}
