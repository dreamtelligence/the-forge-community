'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Flame, Activity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Topic {
  topic: string;
  description: string;
  heat: number; // 0-100
  posts_count: number;
  category: string;
}

interface TrendingData {
  topics: Topic[];
  analyzed_posts: number;
  period: string;
  provider?: string;
  generated_at: string;
}

function getHeatColor(heat: number) {
  if (heat >= 80) return 'from-red-500 to-orange-500';
  if (heat >= 60) return 'from-orange-500 to-yellow-500';
  if (heat >= 40) return 'from-yellow-500 to-green-500';
  return 'from-green-500 to-blue-500';
}

function getHeatIcon(heat: number) {
  if (heat >= 80) return <Flame className="w-4 h-4 text-red-400" />;
  if (heat >= 60) return <TrendingUp className="w-4 h-4 text-orange-400" />;
  return <Activity className="w-4 h-4 text-yellow-400" />;
}

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
    {children}
  </div>
);

export function TrendingTopics() {
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;
    type IdleOptions = { timeout: number };
    const win = window as Window & {
      requestIdleCallback?: (cb: IdleCallback, options?: IdleOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const start = () => {
      if (cancelled) return;
      setHasStarted(true);
      loadTrends();
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(start, { timeout: 2000 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(start, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  async function loadTrends(forceRefresh = false) {
    try {
      setLoading(true);
      setError(null);

      const url = forceRefresh ? '/api/forum/trending?refresh=1' : '/api/forum/trending';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load trends');

      const data = await response.json();
      setData(data);
    } catch (err: any) {
      console.error('Trending topics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const LoadingView = (
    <Wrapper>
      <div className="flex items-center justify-center gap-3 py-8">
        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        <span className="text-sm text-white/40">Analysiere Trends mit AI...</span>
      </div>
    </Wrapper>
  );

  const ErrorView = (
    <Wrapper>
      <div className="text-center py-8">
        <p className="text-sm text-white/40">Trends konnten nicht geladen werden</p>
        <button
          onClick={() => loadTrends()}
          className="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    </Wrapper>
  );

  if (!hasStarted) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center gap-3 py-8">
          <span className="text-xs text-white/40 uppercase tracking-widest">Trends werden geladen...</span>
        </div>
      </Wrapper>
    );
  }
  if (loading) return LoadingView;
  if (error || !data) return ErrorView;

  return (
    <Wrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-none">Trending Topics</h3>
            <p className="text-[11px] text-white/40">
              {data.analyzed_posts} Posts analysiert{data.provider && ` · AI: ${data.provider}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => loadTrends(true)}
          disabled={loading}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors disabled:opacity-50"
        >
          Aktualisieren
        </button>
      </div>

      {/* Topics List */}
      {data.topics.length === 0 ? (
        <div className="text-sm text-white/40 py-6 text-center">
          Noch nicht genug Daten für Trend-Analyse
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {data.topics.map((topic, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 py-3"
            >
              {/* Heat stripe */}
              <div
                className={`w-1 rounded-full bg-gradient-to-b ${getHeatColor(topic.heat)}`}
                aria-hidden
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold text-white/50">#{index + 1}</span>
                    <span className="text-sm font-semibold text-white truncate">{topic.topic}</span>
                  </div>
                  <span className="text-[11px] text-white/50 whitespace-nowrap">
                    {topic.posts_count} Posts
                  </span>
                </div>

                <p className="text-xs text-white/60 leading-relaxed mb-2 line-clamp-2">
                  {topic.description}
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {getHeatIcon(topic.heat)}
                    <span className="text-[11px] font-bold text-white/60">{topic.heat}%</span>
                  </div>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getHeatColor(topic.heat)}`}
                      style={{ width: `${topic.heat}%` }}
                    />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 uppercase tracking-[0.12em]">
                    {topic.category}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <p className="text-[10px] text-white/35">
          Letzte Aktualisierung: {new Date(data.generated_at).toLocaleString('de-DE')}
        </p>
      </div>
    </Wrapper>
  );
}
