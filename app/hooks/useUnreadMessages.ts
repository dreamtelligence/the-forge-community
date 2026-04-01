'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playGtaMenuSound, primeGtaMenuSound } from '@/lib/ui-sound';

let globalUnreadCount: number | null = null;
let lastNotifyAt = 0;
let primeBound = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let inFlightFetch: Promise<void> | null = null;
let focusHandlerAttached = false;

type Subscriber = (count: number) => void;
type HookConfig = { pollMs: number; enableSound: boolean };

const subscribers = new Set<Subscriber>();
const hookConfigs = new Map<symbol, HookConfig>();

const notifySubscribers = (count: number) => {
  subscribers.forEach((listener) => listener(count));
};

const getMergedConfig = () => {
  const allConfigs = Array.from(hookConfigs.values());
  const minPollMs = allConfigs.length > 0 ? Math.min(...allConfigs.map((cfg) => cfg.pollMs)) : 30000;
  const enableSound = allConfigs.some((cfg) => cfg.enableSound);
  return { pollMs: minPollMs, enableSound };
};

const fetchUnreadShared = async () => {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const response = await fetch('/api/messages/unread');
      if (!response.ok) return;
      const payload = await response.json();
      const total = Number(payload?.total ?? 0);
      const safeTotal = Number.isFinite(total) ? total : 0;

      const { enableSound } = getMergedConfig();
      if (enableSound && globalUnreadCount !== null && safeTotal > globalUnreadCount) {
        const now = Date.now();
        if (now - lastNotifyAt > 1500) {
          playGtaMenuSound();
          lastNotifyAt = now;
        }
      }

      globalUnreadCount = safeTotal;
      notifySubscribers(safeTotal);
    } catch (error) {
      console.error('Failed to fetch unread messages', error);
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
};

const refreshPolling = () => {
  if (typeof window === 'undefined') return;

  const hasSubscribers = hookConfigs.size > 0;
  if (!hasSubscribers) {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (focusHandlerAttached) {
      window.removeEventListener('focus', onWindowFocus);
      focusHandlerAttached = false;
    }
    return;
  }

  const { pollMs, enableSound } = getMergedConfig();
  if (enableSound && !primeBound) {
    primeBound = true;
    window.addEventListener('pointerdown', primeGtaMenuSound, { once: true });
  }

  if (pollInterval) {
    clearInterval(pollInterval);
  }

  const tick = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    void fetchUnreadShared();
  };

  pollInterval = setInterval(tick, pollMs);
  tick();

  if (!focusHandlerAttached) {
    window.addEventListener('focus', onWindowFocus);
    focusHandlerAttached = true;
  }
};

const onWindowFocus = () => {
  if (typeof document !== 'undefined' && document.hidden) return;
  void fetchUnreadShared();
};

export function useUnreadMessages(pollMs = 30000, options?: { enableSound?: boolean }) {
  const [unreadCount, setUnreadCount] = useState(globalUnreadCount ?? 0);
  const hookIdRef = useRef<symbol>(Symbol('unread-hook'));
  const enableSound = options?.enableSound ?? false;

  useEffect(() => {
    const hookId = hookIdRef.current;
    subscribers.add(setUnreadCount);
    hookConfigs.set(hookId, { pollMs, enableSound });
    setUnreadCount(globalUnreadCount ?? 0);
    refreshPolling();

    return () => {
      subscribers.delete(setUnreadCount);
      hookConfigs.delete(hookId);
      refreshPolling();
    };
  }, [pollMs, enableSound]);

  const refresh = useCallback(async () => {
    await fetchUnreadShared();
  }, []);

  return { unreadCount, refresh };
}
