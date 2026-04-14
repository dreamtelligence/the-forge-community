'use client';

import { useEffect, useRef, useState } from 'react';

interface SeamlessVideoLoopProps {
  src: string;
  className?: string;
  crossfadeAt?: number; // Seconds before end to start crossfade
  fadeDuration?: number;
  objectPosition?: string; // CSS object-position (e.g., "center 30%")
  isPlaying?: boolean;
}

/**
 * Professional seamless video loop with crossfade
 *
 * Technique: Single active video + preloaded standby
 * - Only ONE video plays at a time
 * - Before it ends, we start the standby video fresh from 0
 * - Wait for 'seeked' event (guarantees ready-to-play)
 * - Crossfade opacity smoothly
 * - Pause the old video after fade
 *
 * This eliminates ALL stutter because:
 * 1. No synchronized loops (videos don't loop together)
 * 2. Fresh start = instant playback (already at frame 0)
 * 3. Seeked event = guaranteed no buffer delay
 */
export default function SeamlessVideoLoop({
  src,
  className = '',
  crossfadeAt = 1.2, // Start crossfade 1.2 seconds before video ends
  fadeDuration = 0.8,
  objectPosition = 'center',
  isPlaying = true
}: SeamlessVideoLoopProps) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A');
  const isTransitioningRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const videoA = videoARef.current;
    const videoB = videoBRef.current;

    if (!videoA || !videoB) return;

    if (!isPlaying) {
      // Pause everything if not playing
      videoA.pause();
      videoB.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    // Initialize: Start video A playing
    const init = async () => {
      // Ensure the correct video is visible and playing
      const currentActive = activeVideo === 'A' ? videoA : videoB;
      const currentStandby = activeVideo === 'A' ? videoB : videoA;
      
      currentStandby.style.opacity = '0';
      currentStandby.pause();
      
      currentActive.style.opacity = '1';
      currentActive.currentTime = 0; // Reset or continue? Resetting is safer for loop logic
      try {
        await currentActive.play();
      } catch (e) {
        console.error('Playback failed', e);
      }
      
      monitorPlayback();
    };

    const startStandbyVideo = async (video: HTMLVideoElement): Promise<void> => {
      return new Promise((resolve) => {
        // Reset to beginning
        video.currentTime = 0;

        // Wait for seek to complete (this is the key!)
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          // Now play from 0 (already seeked, so no delay)
          video.play().catch(console.error).then(() => resolve());
        };

        video.addEventListener('seeked', onSeeked);

        // If already at 0, trigger manually
        if (video.currentTime === 0) {
          video.removeEventListener('seeked', onSeeked);
          video.play().catch(console.error).then(() => resolve());
        }
      });
    };

    const monitorPlayback = () => {
      const active = activeVideo === 'A' ? videoA : videoB;
      const standby = activeVideo === 'A' ? videoB : videoA;

      if (!active.duration) {
        rafRef.current = requestAnimationFrame(monitorPlayback);
        return;
      }

      const timeRemaining = active.duration - active.currentTime;

      // Start crossfade sequence when approaching end
      if (timeRemaining <= crossfadeAt && !isTransitioningRef.current) {
        isTransitioningRef.current = true;

        (async () => {
          // Prepare standby video (wait for seeked event)
          await startStandbyVideo(standby);

          // Now both videos are playing perfectly in sync
          // Start visual crossfade
          active.style.transition = `opacity ${fadeDuration}s cubic-bezier(0.4, 0.0, 0.2, 1)`;
          standby.style.transition = `opacity ${fadeDuration}s cubic-bezier(0.4, 0.0, 0.2, 1)`;

          active.style.opacity = '0';
          standby.style.opacity = '1';

          // After fade completes
          setTimeout(() => {
            // Pause the old video to save resources
            active.pause();

            // Swap active reference
            setActiveVideo(prev => prev === 'A' ? 'B' : 'A');

            // Reset transition flag
            isTransitioningRef.current = false;
          }, fadeDuration * 1000);
        })();
      }

      rafRef.current = requestAnimationFrame(monitorPlayback);
    };

    init();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeVideo, crossfadeAt, fadeDuration, isPlaying]);

  return (
    <div className="absolute inset-0">
      <video
        ref={videoARef}
        muted
        playsInline
        preload={isPlaying ? "auto" : "none"}
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectPosition,
          opacity: 1,
          transition: 'none',
          willChange: 'opacity'
        }}
      >
        <source src={src} type="video/mp4" />
      </video>

      <video
        ref={videoBRef}
        muted
        playsInline
        preload={isPlaying ? "auto" : "none"}
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectPosition,
          opacity: 0,
          transition: 'none',
          willChange: 'opacity'
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
