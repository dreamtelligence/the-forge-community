'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Search, Music, AudioWaveform, RefreshCw } from 'lucide-react';

interface MusicStudioProps {
  ventureId: string;
}

interface SoundstripeItem {
  id: string;
  type: 'song' | 'sound_effect';
  title: string;
  artist?: string;
  bpm?: number;
  duration?: number;
  tags?: string[];
  description?: string;
  previewUrl?: string;
  category?: string;
  subcategory?: string;
}

const formatDuration = (value?: number) => {
  if (!value || !Number.isFinite(value)) return undefined;
  const total = Math.max(0, Math.round(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function MusicStudio({ ventureId }: MusicStudioProps) {
  const [mode, setMode] = useState<'songs' | 'sound_effects'>('songs');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SoundstripeItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeRef = useRef(mode);
  const queryRef = useRef(query);
  const pageRef = useRef(page);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const loadItems = useCallback(
    async ({
      reset = false,
      overrideQuery,
      overrideMode,
    }: {
      reset?: boolean;
      overrideQuery?: string;
      overrideMode?: 'songs' | 'sound_effects';
    } = {}) => {
      setLoading(true);
      setError(null);

      const nextPage = reset ? 1 : pageRef.current + 1;
      const activeQuery = typeof overrideQuery === 'string' ? overrideQuery : queryRef.current;
      const activeMode = overrideMode ?? modeRef.current;
      try {
        const params = new URLSearchParams({
          type: activeMode,
          page: String(nextPage),
          size: '12'
        });
        if (activeQuery.trim()) params.set('q', activeQuery.trim());

        const res = await fetch(`/api/ventures/${ventureId}/music/soundstripe?${params.toString()}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || 'Soundstripe konnte nicht geladen werden.');
        }

        const received = Array.isArray(data?.items) ? data.items : [];
        setItems((prev) => (reset ? received : [...prev, ...received]));
        setPage(nextPage);
        pageRef.current = nextPage;
        setTotal(typeof data?.meta?.total === 'number' ? data.meta.total : undefined);
      } catch (err: any) {
        setError(err?.message || 'Unbekannter Fehler.');
      } finally {
        setLoading(false);
      }
    },
    [ventureId]
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    pageRef.current = 1;
    loadItems({ reset: true });
  }, [loadItems]);

  const handleSearch = () => {
    setPage(1);
    pageRef.current = 1;
    loadItems({ reset: true });
  };

  const handleReset = () => {
    setQuery('');
    setItems([]);
    setPage(1);
    loadItems({ reset: true, overrideQuery: '' });
  };

  const handleModeChange = (nextMode: 'songs' | 'sound_effects') => {
    setMode(nextMode);
    setItems([]);
    setPage(1);
    pageRef.current = 1;
    loadItems({ reset: true, overrideMode: nextMode });
  };

  const infoText = mode === 'songs'
    ? 'Lizenzierte Tracks für Background-Music und Video-Scoring.'
    : 'Soundeffekte für Übergänge, UI, B-Roll und SFX-Design.';

  const canLoadMore = useMemo(() => {
    if (typeof total !== 'number') return items.length > 0 && items.length % 12 === 0;
    return items.length < total;
  }, [items.length, total]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Katalog</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleModeChange('songs')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  mode === 'songs'
                    ? 'bg-[#FF9900] text-black'
                    : 'border border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5 inline-block mr-2" />
                Music
              </button>
              <button
                onClick={() => handleModeChange('sound_effects')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  mode === 'sound_effects'
                    ? 'bg-[#FF9900] text-black'
                    : 'border border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <AudioWaveform className="w-3.5 h-3.5 inline-block mr-2" />
                Sounds
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
                placeholder="Suche nach Mood, Genre, Tag..."
                className="pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white w-[240px] focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-white/20 transition"
            >
              Suchen
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition"
              title="Zurücksetzen"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-white/50 text-sm">{infoText}</p>
      </div>

      {error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/30 text-sm text-red-200">
          {error}
        </div>
      )}

      {items.length === 0 && !loading && !error && (
        <div className="glass-card p-8 rounded-2xl border border-white/10 text-center text-white/50 text-sm">
          Noch keine Ergebnisse. Starte eine Suche oder lade den Katalog.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => {
          const duration = formatDuration(item.duration);
          return (
            <div key={`${item.type}-${item.id}`} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  {item.artist && <p className="text-white/50 text-xs">{item.artist}</p>}
                </div>
                {item.bpm && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">
                    {item.bpm} BPM
                  </span>
                )}
              </div>

              {(item.category || item.subcategory || duration) && (
                <div className="flex flex-wrap gap-3 text-[11px] text-white/50">
                  {item.category && <span>{item.category}</span>}
                  {item.subcategory && <span>· {item.subcategory}</span>}
                  {duration && <span>· {duration}</span>}
                </div>
              )}

              {item.description && (
                <p className="text-white/60 text-xs line-clamp-2">{item.description}</p>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.tags.slice(0, 6).map((tag) => (
                    <span
                      key={`${item.id}-${tag}`}
                      className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-white/10 text-white/40"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {item.previewUrl ? (
                <audio controls preload="none" className="w-full">
                  <source src={item.previewUrl} type="audio/mpeg" />
                </audio>
              ) : (
                <div className="text-xs text-white/40">Kein Preview verfügbar.</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => loadItems({ reset: items.length === 0 })}
          disabled={loading}
          className="px-5 py-2 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/30 disabled:opacity-50 transition"
        >
          {items.length === 0 ? 'Katalog laden' : 'Mehr laden'}
        </button>
        {canLoadMore ? null : (
          items.length > 0 && (
            <span className="text-xs text-white/40">Ende der Liste erreicht.</span>
          )
        )}
      </div>
    </div>
  );
}
