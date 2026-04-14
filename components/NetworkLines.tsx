'use client';

import { motion } from 'framer-motion';

export default function NetworkLines() {
  // Generate random lines
  const lines = [
    // Diagonal lines from different corners
    { x1: '0%', y1: '0%', x2: '60%', y2: '40%', delay: 0 },
    { x1: '100%', y1: '10%', x2: '40%', y2: '50%', delay: 0.5 },
    { x1: '20%', y1: '100%', x2: '70%', y2: '30%', delay: 1 },
    { x1: '80%', y1: '0%', x2: '30%', y2: '80%', delay: 1.5 },
    { x1: '10%', y1: '50%', x2: '90%', y2: '20%', delay: 2 },
    { x1: '100%', y1: '70%', x2: '20%', y2: '10%', delay: 2.5 },
    { x1: '50%', y1: '100%', x2: '80%', y2: '0%', delay: 3 },
    { x1: '0%', y1: '80%', x2: '100%', y2: '50%', delay: 3.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          {/* Neon glow filter */}
          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {lines.map((line, i) => (
          <g key={i}>
            {/* Glow line underneath */}
            <motion.line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#neon-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 0],
                opacity: [0, 0.6, 0.6, 0],
              }}
              transition={{
                duration: 4,
                delay: line.delay,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut',
              }}
            />

            {/* Main bright line */}
            <motion.line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(96, 165, 250, 0.8)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 0],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 4,
                delay: line.delay,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut',
              }}
            />

            {/* Traveling dot */}
            <motion.circle
              r="3"
              fill="rgba(147, 197, 253, 1)"
              filter="url(#neon-glow)"
              initial={{
                offsetDistance: '0%',
                opacity: 0,
              }}
              animate={{
                offsetDistance: ['0%', '100%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 4,
                delay: line.delay,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut',
              }}
              style={{
                offsetPath: `path('M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}')`,
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
