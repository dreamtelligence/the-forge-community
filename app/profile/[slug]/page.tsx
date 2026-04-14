'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import { Award, MessageCircle, MessageSquare, Rocket, Loader2, UserPlus, UserCheck } from 'lucide-react';

type Achievement = {
  key: string;
  title: string;
  description: string;
  category: 'LAUNCH' | 'COMMUNITY' | 'EXPERTISE';
  icon: string;
  tier: number;
  earnedAt: string | null;
};

type ProfileData = {
  id: string;
  name: string;
  profileSlug: string;
  viewerId?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  isFollowing?: boolean;
  image?: string | null;
  role?: string;
  founderNumber?: number;
  bio?: string | null;
  goal?: string | null;
  skills?: string[];
  instagram?: string | null;
  linkedin?: string | null;
  createdAt?: string;
  achievements: Achievement[];
  ventures: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  stats: {
    ventures: number;
    squads: number;
    forumPosts: number;
    forumLikes: number;
  };
};

const iconMap: Record<string, ElementType> = {
  rocket: Rocket,
  'message-square': MessageSquare,
  award: Award,
};

const categoryTone: Record<Achievement['category'], string> = {
  LAUNCH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  COMMUNITY: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  EXPERTISE: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = useMemo(() => {
    const raw = params?.slug;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingThread, setCreatingThread] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [followState, setFollowState] = useState<{ isFollowing: boolean; followersCount: number | null; followingCount: number | null }>({
    isFollowing: false,
    followersCount: null,
    followingCount: null
  });
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/profile/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Profil nicht gefunden');
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const earnedBadges = profile?.achievements?.filter((badge) => badge.earnedAt) || [];
  const canMessage = Boolean(profile?.viewerId && profile.viewerId !== profile.id);
  const canFollow = Boolean(profile?.viewerId && profile.viewerId !== profile.id);

  useEffect(() => {
    if (!profile) return;
    setFollowState({
      isFollowing: Boolean(profile.isFollowing),
      followersCount: profile.followersCount ?? null,
      followingCount: profile.followingCount ?? null,
    });
  }, [profile]);

  const handleStartThread = async () => {
    if (!profile) return;
    setActionError(null);
    setCreatingThread(true);
    try {
      const response = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: profile.id })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Thread konnte nicht erstellt werden');
      }
      const payload = await response.json();
      router.push(`/messages?thread=${payload.threadId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Thread konnte nicht erstellt werden';
      setActionError(message);
    } finally {
      setCreatingThread(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile) return;
    setFollowError(null);
    setFollowBusy(true);
    try {
      const method = followState.isFollowing ? 'DELETE' : 'POST';
      const response = await fetch('/api/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: profile.id })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Follow fehlgeschlagen');
      }
      const payload = await response.json();
      setFollowState(prev => ({
        isFollowing: payload.isFollowing,
        followersCount: prev.followersCount === null ? null : (payload.followersCount ?? prev.followersCount),
        followingCount: prev.followingCount === null ? null : (payload.followingCount ?? prev.followingCount),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Follow fehlgeschlagen';
      setFollowError(message);
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-white/40">
        Profil wird geladen...
      </div>
    );
  }

  if (!profile || error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-white/40">
        {error || 'Profil nicht gefunden'}
      </div>
    );
  }

  return (
    <AuthGuard>
      <PageShell>
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
          <section className="glass-card rounded-3xl border border-white/10 p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-3xl font-black text-[#FF9900]">
              {profile.image ? (
                <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0)
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-instrument-serif text-white">{profile.name}</h1>
                {profile.role && (
                  <span className="px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
                    {profile.role}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 font-bold uppercase tracking-widest">
                <span>Founder #{profile.founderNumber?.toString().padStart(3, '0') || '000'}</span>
                <span>•</span>
                <span>@{profile.profileSlug}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-white/60">
                {profile.instagram && (
                  <Link href={profile.instagram} className="hover:text-white transition-colors" target="_blank">
                    Instagram
                  </Link>
                )}
                {profile.linkedin && (
                  <Link href={profile.linkedin} className="hover:text-white transition-colors" target="_blank">
                    LinkedIn
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto md:items-end">
              {(canFollow || canMessage) && (
                <div className="flex flex-col items-start md:items-end gap-2 w-full">
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {canFollow && (
                      <button
                        onClick={handleToggleFollow}
                        disabled={followBusy}
                        className={`w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition disabled:opacity-60 ${
                          followState.isFollowing
                          ? 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20'
                            : 'border-[#FF9900]/40 bg-[#FF9900]/10 text-[#FF9900] hover:bg-[#FF9900]/20'
                        }`}
                      >
                        {followBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : followState.isFollowing ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        {followState.isFollowing ? 'Gefolgt' : 'Folgen'}
                      </button>
                    )}
                    {canMessage && (
                      <button
                        onClick={handleStartThread}
                        disabled={creatingThread}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                      >
                        {creatingThread ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        Nachricht
                      </button>
                    )}
                  </div>
                  {followError && <span className="text-[10px] text-red-400">{followError}</span>}
                  {actionError && <span className="text-[10px] text-red-400">{actionError}</span>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-center w-full md:w-auto">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">Ventures</div>
                  <div className="text-2xl font-bold text-white">{profile.stats.ventures}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">Forum</div>
                  <div className="text-2xl font-bold text-white">{profile.stats.forumPosts}</div>
                </div>
                {followState.followersCount !== null && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest">Follower</div>
                    <div className="text-2xl font-bold text-white">{followState.followersCount}</div>
                  </div>
                )}
                {followState.followingCount !== null && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest">Following</div>
                    <div className="text-2xl font-bold text-white">{followState.followingCount}</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="grid lg:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-8">
              <div className="glass-card rounded-3xl border border-white/10 p-8 space-y-4">
                <h2 className="text-lg font-instrument-serif text-white uppercase tracking-wider">Bio</h2>
                <p className="text-sm text-white/60 leading-relaxed">
                  {profile.bio || 'Keine Bio hinterlegt.'}
                </p>
                {profile.goal && (
                  <div className="pt-4 border-t border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Ziel</div>
                    <p className="text-sm text-white/70">{profile.goal}</p>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-3xl border border-white/10 p-8 space-y-4">
                <h2 className="text-lg font-instrument-serif text-white uppercase tracking-wider">Badges</h2>
                {earnedBadges.length === 0 ? (
                  <p className="text-sm text-white/40">Noch keine Abzeichen freigeschaltet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {earnedBadges.map((badge) => {
                      const IconComponent = (iconMap[badge.icon] || Award) as React.ComponentType<{ className?: string }>;
                      return (
                        <div
                          key={badge.key}
                          className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${categoryTone[badge.category]}`}
                        >
                          <div className="mt-0.5">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-widest">{badge.title}</div>
                            <div className="text-[11px] text-white/70">{badge.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="glass-card rounded-3xl border border-white/10 p-6 space-y-4">
                <h2 className="text-lg font-instrument-serif text-white uppercase tracking-wider">Skills</h2>
                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">Keine Skills hinterlegt.</p>
                )}
              </div>

              <div className="glass-card rounded-3xl border border-white/10 p-6 space-y-4">
                <h2 className="text-lg font-instrument-serif text-white uppercase tracking-wider">Ventures</h2>
                {profile.ventures.length === 0 ? (
                  <p className="text-sm text-white/40">Keine Ventures sichtbar.</p>
                ) : (
                  <div className="space-y-3">
                    {profile.ventures.map((venture) => (
                      <div
                        key={venture.id}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div className="text-sm font-semibold text-white">{venture.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40">{venture.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
