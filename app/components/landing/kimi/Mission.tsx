'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { TextGradientScroll } from '@/shared/ui/text-gradient-scroll';
import { useI18n } from '@/app/components/i18n/I18nProvider';

export default function Mission() {
  const { copy } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const y3 = useTransform(scrollYProgress, [0, 1], [150, -150]);

  return (
    <section ref={sectionRef} className="py-16 lg:py-32 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="relative min-h-[80vh] flex items-center isolate">
          <motion.div style={{ y: y1 }} className="absolute left-0 top-0 w-48 sm:w-64 lg:w-80 z-10">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden relative">
              <Image 
                src="/images/b2b-sneakers.jpg" 
                alt="Mission 1" 
                fill 
                sizes="(max-width: 768px) 192px, 320px"
                className="object-cover" 
              />
            </div>
          </motion.div>

          <motion.div style={{ y: y2 }} className="absolute right-0 top-1/4 w-40 sm:w-56 lg:w-72 z-20">
            <div className="aspect-square rounded-2xl overflow-hidden relative">
              <Image
                src="/irene-kredenets-dwKiHoqqxk8-unsplash.webp"
                alt="Wir verbinden Founder"
                fill
                sizes="(max-width: 768px) 160px, 280px"
                className="object-cover"
              />
            </div>
          </motion.div>

          <motion.div style={{ y: y3 }} className="absolute left-[20%] bottom-0 w-36 sm:w-48 lg:w-64 z-10">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden relative">
              <Image 
                src="/images/mission-3.jpg" 
                alt="Mission 3" 
                fill 
                sizes="(max-width: 768px) 144px, 256px"
                className="object-cover" 
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-30 max-w-3xl mx-auto text-center py-24"
          >
            <TextGradientScroll
              text={copy.mission.text}
              type="word"
              textOpacity="none"
              className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-8 [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
