'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const locations = [
  { name: 'Cairo', image: '/images/location-1.jpg', size: 'w-80 sm:w-[28rem] h-48 sm:h-64' },
  { name: 'Manila', image: '/images/location-2.jpg', size: 'w-64 sm:w-80 h-56 sm:h-72' },
  { name: 'Zurich', image: '/images/location-3.jpg', size: 'w-72 sm:w-96 h-48 sm:h-64' },
  { name: 'Oslo', image: '/images/location-4.jpg', size: 'w-60 sm:w-80 h-56 sm:h-72' },
];

const tracks = [
  {
    start: { x: 0, y: 0, z: 120, ry: -8, rz: 4 },
    end: { x: -260, y: -320, z: -120, ry: -24, rz: -8 },
  },
  {
    start: { x: 140, y: 260, z: 80, ry: -10, rz: 6 },
    end: { x: -220, y: -300, z: -140, ry: -20, rz: -6 },
  },
  {
    start: { x: 80, y: 220, z: 60, ry: -6, rz: 5 },
    end: { x: -240, y: -340, z: -120, ry: -18, rz: -6 },
  },
  {
    start: { x: 180, y: 300, z: 40, ry: -12, rz: 7 },
    end: { x: -200, y: -280, z: -160, ry: -22, rz: -7 },
  },
];

export default function Locations() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section ref={containerRef} className="relative bg-black" style={{ height: '520vh' }}>
      <div className="sticky top-0 h-screen w-full bg-black flex items-center justify-center overflow-hidden">
        <div
          className="relative w-full h-full"
          style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
        >
          {locations.map((location, index) => (
            <ScrollCard
              key={location.name}
              location={location}
              track={tracks[index % tracks.length]}
              index={index}
              total={locations.length}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ScrollCardProps {
  location: { name: string; image: string; size: string };
  track: {
    start: { x: number; y: number; z: number; ry: number; rz: number };
    end: { x: number; y: number; z: number; ry: number; rz: number };
  };
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'];
}

function ScrollCard({ location, track, index, total, scrollYProgress }: ScrollCardProps) {
  const segment = 0.8 / total;
  const start = index === 0 ? 0 : 0.08 + index * segment;
  const end = start + segment * 1.05;

  const x = useTransform(scrollYProgress, [start, end], [track.start.x, track.end.x]);
  const y = useTransform(
    scrollYProgress,
    [start, end],
    [index === 0 ? 0 : track.start.y + 180, track.end.y]
  );
  const z = useTransform(scrollYProgress, [start, end], [track.start.z, track.end.z]);
  const rotateY = useTransform(scrollYProgress, [start, end], [track.start.ry, track.end.ry]);
  const rotateZ = useTransform(scrollYProgress, [start, end], [track.start.rz, track.end.rz]);

  const opacity = useTransform(
    scrollYProgress,
    [start, start + 0.06, end - 0.06, end],
    [index === 0 ? 1 : 0, 1, 1, 0]
  );

  return (
    <motion.div
      style={{
        x,
        y,
        z,
        rotateY,
        rotateZ,
        opacity,
        transformStyle: 'preserve-3d',
      }}
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${location.size} will-change-transform`}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_30px_70px_-50px_rgba(0,0,0,0.9)]">
        <img src={location.image} alt={location.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-5">
          <p className="text-white text-xl sm:text-2xl font-semibold tracking-tight">{location.name}</p>
        </div>
      </div>
    </motion.div>
  );
}
