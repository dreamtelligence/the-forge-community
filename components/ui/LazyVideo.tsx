'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  className?: string;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onEnded?: () => void;
}

export default function LazyVideo({
  src,
  className,
  loop = true,
  muted = true,
  playsInline = true,
  onEnded,
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // 200px vor Viewport anfangen zu laden
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    if (!shouldLoad) return;

    const el = videoRef.current;
    if (!el) return;

    const playVideo = () => {
      const playPromise = el.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    };

    if (el.readyState >= 2) {
      playVideo();
      return;
    }

    el.load();
    el.addEventListener('loadeddata', playVideo, { once: true });
    return () => el.removeEventListener('loadeddata', playVideo);
  }, [shouldLoad, src]);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      className={className}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      autoPlay={shouldLoad}
      preload={shouldLoad ? 'metadata' : 'none'}
      onEnded={onEnded}
    />
  );
}
