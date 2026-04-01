'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type RollingTextProps = {
  text: string;
  className?: string;
  color?: string;
  hoverColor?: string;
};

export default function RollingText({
  text,
  className,
  color = 'currentColor',
  hoverColor,
}: RollingTextProps) {
  const [isHovered, setIsHovered] = useState(false);
  const words = useMemo(() => text.split(' '), [text]);
  const letters = useMemo(() => text.replace(/ /g, '').length, [text]);
  const hoverFill = hoverColor ?? color;

  let globalIndex = 0;
  return (
    <span
      className={cn('inline-flex flex-wrap items-start', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {words.map((word, wordIndex) => {
        const chars = Array.from(word);
        return (
          <span key={`${word}-${wordIndex}`} className="inline-flex">
            {chars.map((char, charIndex) => {
              const midpoint = (letters - 1) / 2 || 0;
              const distance = midpoint === 0 ? 0 : Math.abs(globalIndex - midpoint) / midpoint;
              const delay = 0.02 + distance * 0.06;
              globalIndex += 1;

              return (
                <motion.span
                  key={`${char}-${wordIndex}-${charIndex}`}
                  className="inline-block h-[1em] overflow-hidden leading-[1em]"
                  animate={{ y: isHovered ? '-100%' : '0%' }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay }}
                  aria-hidden="true"
                >
                  <span className="block h-[1em] leading-[1em]" style={{ color }}>
                    {char}
                  </span>
                  <span className="block h-[1em] leading-[1em]" style={{ color: hoverFill }}>
                    {char}
                  </span>
                </motion.span>
              );
            })}
            {wordIndex < words.length - 1 && (
              <span className="inline-block w-[0.35em]" aria-hidden="true" />
            )}
          </span>
        );
      })}
    </span>
  );
}
