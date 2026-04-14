'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import PageShell from '@/components/PageShell';
import { Heart, Image as ImageIcon, Loader2, Play, Share2, Trash2 } from 'lucide-react';
import { VideoPreview } from '@/components/media/VideoPreview';
import { MediaLightbox } from '@/components/media/MediaLightbox';

export type MediaFeedItem = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  type: 'IMAGE' | 'VIDEO';
  prompt: string | null;
  model: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  likes: number;
  userLiked: boolean;
  owner: {
    id: string | null;
    name: string;
    image: string | null;
    profileSlug: string | null;
    founderNumber: number;
  };
};

type FeedFilter = 'all' | 'image' | 'video';
type FeedSort = 'new' | 'top';

interface MediaFeedClientProps {
  initialItems: MediaFeedItem[];
  initialCursor: string | null;
  viewerRole: string | null;
}

const FILTERS: { id: FeedFilter; label: string; hint: string }[] = [
  { id: 'all', label: 'Alles', hint: 'Alle Generationen' },
  { id: 'image', label: 'Images', hint: 'Visuals only' },
  { id: 'video', label: 'Videos', hint: 'Motion only' },
];

const SORTS: { id: FeedSort; label: string }[] = [
  { id: 'new', label: 'Neueste' },
  { id: 'top', label: 'Top' },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value));

export default function MediaFeedClient({ initialItems, initialCursor, viewerRole }: MediaFeedClientProps) {
  const [items, setItems] = useState<MediaFeedItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [sort, setSort] = useState<FeedSort>('new');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLikes, setPendingLikes] = useState<Record<string, boolean>>({});
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<MediaFeedItem | null>(null);
  const isAdmin = viewerRole === 'ADMIN';

  const feedStats = useMemo(() => {
    const totalLikes = items.reduce((sum, item) => sum + item.likes, 0);
    return {
      count: items.length,
      likes: totalLikes,
    };
  }, [items]);

  const buildParams = (
    cursorValue: string | null | undefined,
    filterValue: FeedFilter,
    sortValue: FeedSort
  ) => {
    const params = new URLSearchParams();
    params.set('limit', '24');
    if (filterValue !== 'all') params.set('type', filterValue);
    if (sortValue !== 'new') params.set('sort', sortValue);
    if (cursorValue) params.set('cursor', cursorValue);
    return params.toString();
  };

  const fetchFeed = async (
    cursorValue: string | null | undefined,
    filterValue: FeedFilter,
    sortValue: FeedSort
  ) => {
    const res = await fetch(`/api/media?${buildParams(cursorValue, filterValue, sortValue)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Feed konnte nicht geladen werden.');
    }
    return data as { items: MediaFeedItem[]; nextCursor: string | null };
  };

  const refreshFeed = async (nextFilter: FeedFilter, nextSort: FeedSort) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(null, nextFilter, nextSort);
      setItems(data.items || []);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feed konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (nextFilter: FeedFilter) => {
    if (loading) return;
    setFilter(nextFilter);
    await refreshFeed(nextFilter, sort);
  };

  const handleSortChange = async (nextSort: FeedSort) => {
    if (loading) return;
    setSort(nextSort);
    await refreshFeed(filter, nextSort);
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchFeed(nextCursor, filter, sort);
      setItems((prev) => [...prev, ...(data.items || [])]);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Weitere Medien konnten nicht geladen werden.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLike = async (assetId: string) => {
    if (pendingLikes[assetId]) return;
    const snapshot = items.find((item) => item.id === assetId);
    if (!snapshot) return;

    setPendingLikes((prev) => ({ ...prev, [assetId]: true }));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== assetId) return item;
        const nextLiked = !item.userLiked;
        const delta = nextLiked ? 1 : -1;
        return {
          ...item,
          userLiked: nextLiked,
          likes: Math.max(0, item.likes + delta),
        };
      })
    );

    try {
      const res = await fetch('/api/media/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Like fehlgeschlagen.');
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === assetId
            ? { ...item, likes: data.likes ?? item.likes, userLiked: data.userLiked ?? item.userLiked }
            : item
        )
      );
    } catch (err) {
      setItems((prev) => prev.map((item) => (item.id === assetId ? snapshot : item)));
      setError(err instanceof Error ? err.message : 'Like fehlgeschlagen.');
    } finally {
      setPendingLikes((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    }
  };

  const handleShare = async (assetId: string) => {
    const shareUrl = `${window.location.origin}/media#${assetId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Stake & Scale Media',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setToast('Link kopiert.');
      setTimeout(() => setToast(null), 2200);
    } catch {
      setError('Teilen fehlgeschlagen.');
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!isAdmin || pendingDeletes[assetId]) return;
    const target = items.find((item) => item.id === assetId);
    if (!target) return;

    const confirmed = window.confirm('Dieses Media-Asset wirklich löschen?');
    if (!confirmed) return;

    setPendingDeletes((prev) => ({ ...prev, [assetId]: true }));
    try {
      const res = await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Löschen fehlgeschlagen.');
      }
      setItems((prev) => prev.filter((item) => item.id !== assetId));
      if (lightboxItem?.id === assetId) {
        setLightboxItem(null);
      }
      setToast('Asset gelöscht.');
      setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    } finally {
      setPendingDeletes((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    }
  };

  return (
    <AuthGuard>
      <PageShell>
        <div className="space-y-8">
          <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-black/50 to-black p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FF9900]/10 blur-[90px]" />
            <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-black/70 to-transparent" />
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Community Media</span>
                <span className="text-white/20">Live Feed</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-instrument-serif text-white">Public Media Wall</h1>
              <p className="max-w-2xl text-sm text-white/60">
                Alle generierten Visuals & Videos der Community. Like, teile und entdecke neue Styles in Echtzeit.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70">
                  {feedStats.count} Assets
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70">
                  {feedStats.likes} Likes
                </div>
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleFilterChange(option.id)}
                  className={`group rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] transition-all ${
                    filter === option.id
                      ? 'border-[#FF9900] bg-[#FF9900]/20 text-[#FF9900]'
                      : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="ml-3 text-[9px] text-white/30 group-hover:text-white/50">{option.hint}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {SORTS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSortChange(option.id)}
                  className={`rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] transition-all ${
                    sort === option.id
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-white/10 bg-transparent text-white/40 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {toast && (
            <div className="rounded-2xl border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-[#FF9900]">
              {toast}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-sm text-white/40">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Media Feed laedt...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-sm text-white/40">
              <ImageIcon className="mb-3 h-8 w-8 text-white/20" />
              Noch keine Medien. Starte eine neue Generation im Studio.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const isVideo = item.type === 'VIDEO';
                const isPending = Boolean(pendingLikes[item.id]);
                const isDeleting = Boolean(pendingDeletes[item.id]);
                const profileHref = item.owner.profileSlug ? `/profile/${item.owner.profileSlug}` : null;
                const ownerInitial = item.owner.name?.trim()?.[0]?.toUpperCase() || 'F';
                return (
                  <div
                    key={item.id}
                    id={item.id}
                    className="group relative scroll-mt-28 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-[0_0_40px_rgba(0,0,0,0.2)] transition-all hover:border-white/30"
                  >
                    <div
                      className="relative aspect-[4/5] w-full overflow-hidden cursor-pointer"
                      onClick={() => setLightboxItem(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setLightboxItem(item);
                        }
                      }}
                    >
                      {isVideo ? (
                        <VideoPreview
                          src={item.url}
                          poster={item.thumbnailUrl}
                          className="h-full w-full"
                          mediaClassName="h-full w-full object-cover"
                          enableHover={false}
                          allowClick={false}
                          showOverlay={true}
                          onOpen={() => setLightboxItem(item)}
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.prompt || 'Generated asset'}
                          className="h-full w-full object-cover cursor-pointer"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>

                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white/80 backdrop-blur">
                      {isVideo ? <Play className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                      {isVideo ? 'Video' : 'Image'}
                    </div>
                    <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      {formatDate(item.createdAt)}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-4 pt-10">
                      <div className="flex items-center justify-between gap-3">
                        {profileHref ? (
                          <Link href={profileHref} className="flex items-center gap-2 text-xs font-bold text-white">
                            {item.owner.image ? (
                              <img
                                src={item.owner.image}
                                alt={item.owner.name}
                                className="h-8 w-8 rounded-full object-cover border border-white/20"
                              />
                            ) : (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-bold text-white/80">
                                {ownerInitial}
                              </span>
                            )}
                            <span className="truncate">{item.owner.name}</span>
                            {item.owner.founderNumber > 0 && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/50">
                                #{item.owner.founderNumber}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-bold text-white/80">
                              {ownerInitial}
                            </span>
                            <span className="truncate">{item.owner.name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleLike(item.id);
                            }}
                            disabled={isPending}
                            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] transition-all ${
                              item.userLiked
                                ? 'border-[#FF9900]/50 bg-[#FF9900]/20 text-[#FF9900]'
                                : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
                            } ${isPending ? 'opacity-60' : ''}`}
                            aria-pressed={item.userLiked}
                          >
                            <Heart className={`h-3 w-3 ${item.userLiked ? 'fill-[#FF9900] text-[#FF9900]' : 'text-white/60'}`} />
                            {item.likes}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleShare(item.id);
                            }}
                            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition-all hover:text-white"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(item.id);
                              }}
                              disabled={isDeleting}
                              className={`rounded-full border border-red-500/30 bg-red-500/10 p-2 text-red-200/80 transition-all hover:text-red-100 ${
                                isDeleting ? 'opacity-60' : ''
                              }`}
                              aria-label="Asset löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {item.model && (
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/40">
                            Model
                          </span>
                          <span className="truncate text-white/70">{item.model}</span>
                        </div>
                      )}
                      {item.prompt && (
                        <p className="mt-2 text-xs text-white/60 line-clamp-3 cursor-pointer group-hover:text-white/80 transition-colors" onClick={() => setLightboxItem(item)}>
                          {item.prompt}
                          {item.prompt.length > 120 && (
                            <span className="ml-1 text-[#FF9900] font-bold">... [mehr]</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {nextCursor && !loading && (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white/70 transition-all hover:text-white disabled:opacity-60"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Laedt...
                  </span>
                ) : (
                  'Mehr laden'
                )}
              </button>
            </div>
          )}
        </div>
        <MediaLightbox
          open={Boolean(lightboxItem)}
          asset={lightboxItem}
          onClose={() => setLightboxItem(null)}
        />
      </PageShell>
    </AuthGuard>
  );
}
