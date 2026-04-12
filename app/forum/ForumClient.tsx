'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import PageShell from '@/app/components/PageShell';
import AuthGuard from '@/app/components/AuthGuard';
import {
  MessageSquare, ArrowUp, ArrowDown, Users,
  Reply, MessageCircle, Edit2, Trash2, Image as ImageIcon, Code, X,
  Sparkles, Lightbulb, 
  TrendingUp, Trophy, Home, Zap, Bell, Info, Plus, Heart, ChevronDown, Share2
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Prism from '@/app/components/ui/Prism';
import { LinkPreview } from '@/app/components/LinkPreview';
import { RelatedPosts } from '@/app/components/RelatedPosts';
import { TrendingTopics } from '@/app/components/TrendingTopics';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { PostSkeleton } from '@/app/components/PostSkeleton';
import { ForumEditor } from '@/app/components/ForumEditor';
import { ForumTour } from '@/app/components/onboarding/ForumTour';
import OnboardingWizard from '@/app/components/onboarding/OnboardingWizard';

export interface Comment {
  id: string;
  authorId?: string | null;
  parentId?: string | null;
  author: string;
  authorImage?: string | null;
  authorSlug?: string | null;
  founderNumber?: number;
  content: string;
  time: string;
  likes: number;
  userVote?: number;
}

export interface ForumPost {
  id: string;
  authorId?: string | null;
  author: string;
  authorImage?: string | null;
  authorSlug?: string | null;
  founderNumber: number;
  content: string;
  createdTime: string;
  likes: number;
  category: string;
  userVote?: number;
  comments?: Comment[];
}

interface ForumNotification {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  href?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string | null;
    image?: string | null;
    profileSlug?: string | null;
    founderNumber?: number | null;
  } | null;
}

export interface UserProfile {
  id?: string;
  name: string | null;
  email: string;
  image?: string | null;
  role?: string;
  founderNumber?: number;
  karmaScore?: number;
  credits?: number;
  onboardingComplete?: boolean;
  hasSeenCockpitTour?: boolean;
  _count?: {
    ventures: number;
    squadMemberships: number;
    followers?: number;
    following?: number;
  };
}

interface ForumClientProps {
  initialPosts: ForumPost[];
  initialUser: UserProfile | null;
  forumVentureId?: string | null;
}

const AI_AUTHORS = new Set(['@orion', '@forge-ai']);
const META_REGEX = /<!--metadata: ({[\s\S]*}) -->$/;

function extractMetadata(content: string) {
  const match = content.match(META_REGEX);
  if (!match) return { content, meta: null };
  try {
    return {
      content: content.replace(META_REGEX, '').trim(),
      meta: JSON.parse(match[1])
    };
  } catch (_e) {
    return { content, meta: null };
  }
}

function buildProfileHref(post: ForumPost) {
  if (post.authorSlug) return `/profile/${post.authorSlug}`;
  if (post.authorId) return `/profile/${post.authorId}`;
  return null;
}

function buildAuthorHref(authorId?: string | null, authorSlug?: string | null) {
  if (authorSlug) return `/profile/${authorSlug}`;
  if (authorId) return `/profile/${authorId}`;
  return null;
}

// Helper für Markdown Komponenten
const getMeaningfulChildren = (node: any) => {
  const children = Array.isArray(node?.children) ? node.children : [];
  return children.filter((child: any) => {
    if (child?.type !== 'text') return true;
    return typeof child.value === 'string' && child.value.trim().length > 0;
  });
};

const getSingleElementChild = (node: any) => {
  const children = getMeaningfulChildren(node);
  if (children.length !== 1) return null;
  const child = children[0];
  if (child?.type !== 'element') return null;
  return child;
};

const getParagraphLinkUrl = (node: any) => {
  const child = getSingleElementChild(node);
  if (!child || child.tagName !== 'a') return null;
  const href = typeof child.properties?.href === 'string' ? child.properties.href : null;
  if (!href) return null;
  const linkChildren = Array.isArray(child.children) ? child.children : [];
  if (linkChildren.length !== 1) return null;
  const textNode = linkChildren[0];
  if (textNode?.type !== 'text') return null;
  const label = typeof textNode.value === 'string' ? textNode.value.trim() : '';
  if (!label || label !== href) return null;
  return href;
};

const isParagraphImageOnly = (node: any) => {
  const child = getSingleElementChild(node);
  return Boolean(child && child.tagName === 'img');
  };

const stripMarkdown = (value: string) => {
  return value
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?|```/gi, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '- ')
    .replace(/^\s{0,3}(\d+)\.\s+/gm, '$1. ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

function ForumImage({ src, alt }: { src?: string; alt?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src) return null;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group w-full text-left overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_24px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-white/60 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <span>Bild-Vorschau</span>
          <span className="text-white/40 group-hover:text-white/70 transition-colors">Tippen zum Laden</span>
        </div>
        <div className="relative h-44 sm:h-60 overflow-hidden">
          <div className="absolute inset-0">
            <Prism
              animationType="rotate"
              timeScale={0.55}
              height={3.4}
              baseWidth={5.4}
              scale={3.4}
              hueShift={-0.3}
              colorFrequency={1.1}
              noise={0.0}
              glow={1.15}
              bloom={1.2}
              suspendWhenOffscreen
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent opacity-70" />
          <div className="absolute -top-10 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-white/50 blur-3xl opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-300/20 via-white/40 to-cyan-200/20 opacity-70 animate-[pulse_2.8s_ease-in-out_infinite]" />
          <div className="absolute inset-0 bg-white/25 backdrop-blur-[8px]" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2 text-white/80">
            <ImageIcon className="h-6 w-6 text-white/70" />
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/70">Tap to load</div>
            <div className="text-[10px] text-white/40">Daten sparen auf Mobile</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="relative">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-white/40 bg-black/40">
          Lade Bild...
        </div>
      )}
      <img
        src={src}
        alt={alt || ''}
        className="block w-full h-auto object-cover max-h-150"
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}

const MarkdownComponents = {
  p: ({ node, children }: any) => {
    const previewUrl = getParagraphLinkUrl(node);
    if (previewUrl) {
      return (
        <div className="not-prose my-4">
          <LinkPreview url={previewUrl} />
        </div>
      );
    }

    const hasImage = node.children?.some((child: any) => child.tagName === 'img');

    if (isParagraphImageOnly(node)) {
      return (
        <figure className="my-4 overflow-hidden border border-white/10 bg-black/20 rounded-none sm:rounded-xl">
          {children}
        </figure>
      );
    }

    if (hasImage) {
      return <div className="mb-4 last:mb-0 leading-relaxed">{children}</div>;
    }

    return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
  },
  // Links inline lassen, Vorschau nur bei Link-Absatz
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#FF9900] hover:underline hover:text-white transition-colors"
    >
      {children}
    </a>
  ),
  // Bilder ohne Wrapper, damit Inline-Images valide bleiben
  img: ({ src, alt }: any) => <ForumImage src={src} alt={alt} />,
  // Blockquotes stylen
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-[#FF9900] pl-4 italic text-white/60 my-4 bg-white/5 py-2 pr-4 rounded-r-lg">
      {children}
    </blockquote>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-[#0d0d0d] border border-white/10 rounded-xl p-4 my-4 overflow-x-auto">
      {children}
    </pre>
  ),
  // Code Blöcke
  code: ({ inline, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-[#FF9900] font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="text-sm font-mono text-white/80" {...props}>
        {children}
      </code>
    );
  }
};

export default function Forum({ initialPosts, initialUser, forumVentureId }: ForumClientProps) {
  // Infinite Scroll State
  const [posts, setPosts] = useState<ForumPost[]>(initialPosts);
  const [isLoadingInitial, setIsLoadingInitial] = useState(initialPosts.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [forumVentureIdState, setForumVentureIdState] = useState<string | null>(forumVentureId ?? null);
  const [content, setContent] = useState('');
  const [activeChannel, setActiveChannel] = useState('All');
  const [sortMode, setSortMode] = useState('Hot');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<string | null>(null);
  const [commentStatus, setCommentStatus] = useState<Record<string, string>>({});
  const [commentEditingId, setCommentEditingId] = useState<string | null>(null);
  const [commentEditDrafts, setCommentEditDrafts] = useState<Record<string, string>>({});
  const [commentEditSubmitting, setCommentEditSubmitting] = useState<string | null>(null);
  const [replyTargets, setReplyTargets] = useState<Record<string, Comment | null>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [, setIsPreview] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [, setAiResult] = useState<{postId: string; content: string; action: string} | null>(null);
  const [moderationWarning, setModerationWarning] = useState<{number: number; message: string; banned: boolean} | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [] = useState(false);
  const [, setEmojiPickerSize] = useState({ width: 320, height: 400 });
  const toastTimeoutRef = useRef<number | null>(null);
  const loadMoreRef = useRef(null);
  const isInView = useInView(loadMoreRef);
  
  const FEEDS = [
    { id: 'All', name: 'Home Feed', icon: Home },
    { id: 'Popular', name: 'Popular', icon: Zap },
  ];

  const CHANNELS = [
    { id: 'General', name: 'General', icon: MessageSquare },
    { id: 'Ideas', name: 'Ideen & Feedback', icon: Lightbulb },
    { id: 'Growth', name: 'Growth & Marketing', icon: TrendingUp },
    { id: 'Tech', name: 'Tech & Tools', icon: Code },
    { id: 'Wins', name: 'Wins & Success', icon: Trophy },
    { id: 'Support', name: 'Hilfe & Support', icon: Users },
  ];

  const AI_ACTIONS = [
    { id: 'summarize', label: 'Kurzfassung' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'expand', label: 'Weiter ausführen' },
    { id: 'factCheck', label: 'Faktencheck' },
    { id: 'nextSteps', label: 'Nächste Schritte' },
  ];

  const formatRelativeTime = (value?: string | null) => {
    if (!value || !isHydrated) return '--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';
    return formatDistanceToNow(parsed, { addSuffix: true, locale: de });
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) setUser(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchForumVentureId = async () => {
    try {
      const res = await fetch('/api/forum/venture');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.id) setForumVentureIdState(data.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Reset Feed when Channel/Sort changes
  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    setIsLoadingInitial(true);
    
    // Kleines Timeout damit State sicher resettet ist bevor fetch läuft
    const timer = setTimeout(() => {
      fetchPosts({ reset: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeChannel, sortMode]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const updateEmojiPickerSize = () => {
      if (typeof window === 'undefined') return;
      const width = Math.max(260, Math.min(320, window.innerWidth - 32));
      const height = Math.max(260, Math.min(400, window.innerHeight - 260));
      setEmojiPickerSize({ width, height });
    };
    updateEmojiPickerSize();
    window.addEventListener('resize', updateEmojiPickerSize);
    return () => window.removeEventListener('resize', updateEmojiPickerSize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.orion-menu-container') && !target.closest('.orion-menu-trigger')) {
        setAiMenuOpen(null);
      }
    };
    if (aiMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [aiMenuOpen]);

  // Load More on Scroll
  useEffect(() => {
    if (isInView && hasMore && !isLoadingMore && !isLoadingInitial && posts.length > 0) {
      fetchPosts({ reset: false });
    }
  }, [isInView, hasMore, isLoadingMore, isLoadingInitial, posts.length, fetchPosts]);

  async function fetchPosts(options: { reset?: boolean, silent?: boolean } = {}) {
    const { reset = false, silent = false } = options;
    
    if (!reset && (isLoadingMore || !hasMore)) return;

    if (reset) setIsLoadingInitial(true);
    else if (!silent) setIsLoadingMore(true);

    try {
      const params = new URLSearchParams();
      // Wenn wir resetten, nutzen wir keinen Cursor. Wenn wir nachladen, nutzen wir den gespeicherten nextCursor.
      // WICHTIG: nextCursor darf nicht null sein, wenn reset=false ist, außer beim allerersten load (was durch isLoadingInitial abgefangen wird)
      if (!reset && nextCursor) params.set('cursor', nextCursor);
      
      params.set('limit', '10');
      params.set('category', activeChannel);
      params.set('sort', sortMode.toLowerCase());

      const response = await fetch(`/api/forum?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      // Prüfen ob die API die neue Struktur { items, nextCursor } zurückgibt
      // Fallback falls API noch alte Struktur liefert (array)
      const newPosts = Array.isArray(data) ? data : (data.items || []);
      const newCursor = Array.isArray(data) ? null : data.nextCursor;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewPosts = newPosts.filter((p: ForumPost) => !existingIds.has(p.id));
          return [...prev, ...uniqueNewPosts];
        });
      }

      setNextCursor(newCursor);
      // Wenn Array leer oder kein Cursor, dann sind wir am Ende
      setHasMore(newPosts.length > 0 && !!newCursor);

    } catch (error) {
      console.error(error);
      // Prevent request storms when the network/server is unstable.
      if (!reset) {
        setHasMore(false);
      }
    } finally {
      if (reset) setIsLoadingInitial(false);
      else setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!initialUser) fetchUser();
    // fetchPosts wird initial durch den useEffect([activeChannel, sortMode]) getriggert, da diese default gesetzt sind
  }, [initialUser]);

  useEffect(() => {
    if (user && !forumVentureIdState) {
      fetchForumVentureId();
    }
  }, [user?.id, forumVentureIdState]);

  useEffect(() => {
    if (user && notifications.length === 0) {
      fetchNotifications();
    }
  }, [notifications.length, user?.id]);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await fetch('/api/notifications');
      if (!response.ok) return;
      const payload = await response.json();
      setNotifications(payload.notifications || []);
      setNotificationsUnread(payload.unreadCount || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationsRead = async (ids?: string[]) => {
    if (!ids || ids.length === 0) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  };

  const markAllNotificationsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  };

  const handleToggleNotifications = async () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next) {
      await fetchNotifications();
    }
  };

  const handleChannelClick = (id: string) => {
    setActiveChannel(id);
    if (id === 'Popular') {
      setSortMode('Top');
    }
  };

  const resolvePostCategory = () => {
    return CHANNELS.some(c => c.id === activeChannel) ? activeChannel : 'General';
  };

  // Client-side Sortieren ist hinfällig da API das macht, aber wir behalten es für Optimistic Updates


  const pushToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage('');
      toastTimeoutRef.current = null;
    }, 2200);
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/forum#${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Stake & Scale Forum', url });
        pushToast('Geteilt.');
        return;
      }
      await navigator.clipboard.writeText(url);
      pushToast('Link kopiert.');
    } catch (_error) {
      pushToast('Teilen fehlgeschlagen.');
    }
  };




  const handleVote = async (id: string, delta: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const currentVote = p.userVote || 0;
      let newLikes = p.likes;
      let newUserVote = 0;
      if (currentVote === delta) { newLikes -= delta; newUserVote = 0; }
      else if (currentVote === 0) { newLikes += delta; newUserVote = delta; }
      else { newLikes += (delta * 2); newUserVote = delta; }
      return { ...p, likes: newLikes, userVote: newUserVote };
    }));
    try {
      const response = await fetch('/api/forum/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, delta }),
      });
      if (!response.ok) throw new Error('Vote failed');
      const data = await response.json();
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: data.likes, userVote: data.userVote } : p));
    } catch (e) { 
      console.error('Vote failed:', e);
      pushToast('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
      fetchPosts({ silent: true }); 
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentSubmit = async (postId: string) => {
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft || commentSubmitting) return;
    setCommentSubmitting(postId);
    try {
      const parentId = replyTargets[postId]?.id || null;
      const response = await fetch('/api/forum/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: draft, parentId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCommentStatus(prev => ({ ...prev, [postId]: data?.error || 'Kommentar fehlgeschlagen. Bitte erneut.' }));
        return;
      }
      const aiComments = data?.aiComment ? [data.aiComment] : [];
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        comments: [...(post.comments || []), data, ...aiComments],
      } : post));
      setCommentStatus(prev => ({ ...prev, [postId]: '' }));
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
      setReplyTargets(prev => ({ ...prev, [postId]: null }));
    } catch (error) {
      console.error('Comment error:', error);
      setCommentStatus(prev => ({ ...prev, [postId]: 'Kommentar fehlgeschlagen. Bitte erneut.' }));
    } finally {
      setCommentSubmitting(null);
    }
  };

  const handleCommentVote = async (postId: string, commentId: string, delta: number) => {
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      return {
        ...post,
        comments: (post.comments || []).map(comment => {
          if (comment.id !== commentId) return comment;
          const currentVote = comment.userVote || 0;
          let newLikes = comment.likes || 0;
          let newUserVote = 0;
          if (currentVote === delta) { newLikes -= delta; newUserVote = 0; }
          else if (currentVote === 0) { newLikes += delta; newUserVote = delta; }
          else { newLikes += (delta * 2); newUserVote = delta; }
          return { ...comment, likes: newLikes, userVote: newUserVote };
        })
      };
    }));
    try {
      const response = await fetch('/api/forum/comment/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId, delta }),
      });
      if (!response.ok) throw new Error('Vote failed');
      const data = await response.json();
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        comments: (post.comments || []).map(comment =>
          comment.id === commentId ? { ...comment, likes: data.likes, userVote: data.userVote } : comment
        )
      } : post));
    } catch (error) {
      console.error('Comment vote error:', error);
      pushToast('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
      fetchPosts({ silent: true });
    }
  };

  const startCommentEdit = (comment: Comment) => {
    setCommentEditingId(comment.id);
    setCommentEditDrafts(prev => ({ ...prev, [comment.id]: comment.content }));
  };

  const cancelCommentEdit = () => {
    setCommentEditingId(null);
  };

  const handleCommentEdit = async (postId: string, commentId: string) => {
    const draft = (commentEditDrafts[commentId] || '').trim();
    if (!draft || commentEditSubmitting) return;
    setCommentEditSubmitting(commentId);
    try {
      const response = await fetch('/api/forum/comment/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId, content: draft }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Edit failed');
      }
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        comments: (post.comments || []).map(comment =>
          comment.id === commentId ? { ...comment, content: data.content } : comment
        ),
      } : post));
      setCommentEditingId(null);
    } catch (error) {
      console.error('Comment edit error:', error);
      setCommentStatus(prev => ({ ...prev, [postId]: 'Kommentar-Update fehlgeschlagen. Bitte erneut.' }));
    } finally {
      setCommentEditSubmitting(null);
    }
  };

  const handleCommentDelete = async (postId: string, commentId: string) => {
    const confirmed = window.confirm('Kommentar wirklich löschen?');
    if (!confirmed) return;
    try {
      const response = await fetch('/api/forum/comment/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId }),
      });
      if (!response.ok) throw new Error('Delete failed');
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        comments: (post.comments || []).filter(comment => comment.id !== commentId),
      } : post));
    } catch (error) {
      console.error('Comment delete error:', error);
      setCommentStatus(prev => ({ ...prev, [postId]: 'Kommentar konnte nicht gelöscht werden.' }));
    }
  };

  const startEdit = (post: ForumPost) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setIsPreview(false);
    setModerationWarning(null);
  };

  const startNewPost = () => {
    setEditingPost('NEW');
    setModerationWarning(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Beitrag wirklich löschen?');
    if (!confirmed) return;
    try {
      const response = await fetch('/api/forum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Delete failed');
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
      fetchPosts({ silent: true });
    }
  };

  const handleAIAction = async (post: ForumPost, action: string, commentId?: string, commentContent?: string) => {
    setAiLoading(true);
    setAiResult(null);
    setAiMenuOpen(commentId || post.id);
    try {
      const res = await fetch('/api/forum/ai-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postId: post.id, 
          parentId: commentId,
          action, 
          postContent: commentContent || post.content, 
          category: post.category 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Orion fehlgeschlagen');
      
      setAiResult({ postId: commentId || post.id, content: data.content, action: data.action });
      
      if (data.comment) {
        setPosts(prev => prev.map(p => p.id === post.id ? {
          ...p,
          comments: [...(p.comments || []), data.comment]
        } : p));
      }
    } catch (error) {
      console.error('AI action error:', error);
      setAiResult({ postId: commentId || post.id, content: 'Orion konnte keine Antwort liefern.', action });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (event?: FormEvent) => {
    if (event && event.preventDefault) event.preventDefault();
    const isEditing = editingPost && editingPost !== 'NEW';
    const draft = (isEditing ? editContent : content).trim();
    if (!draft) return;
    setIsSubmitting(true);
    setModerationWarning(null);
    try {
      if (isEditing && editingPost) {
        const response = await fetch('/api/forum/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingPost, content: draft }),
        });
        const data = await response.json();
        if (!response.ok) {
          setStatusMessage(`❌ ${data?.error || 'Update fehlgeschlagen.'}`);
          setTimeout(() => setStatusMessage(''), 3000);
          return;
        }
        setPosts(prev => prev.map(post => post.id === editingPost ? {
          ...post,
          content: data.content,
        } : post));
        setEditContent('');
        setEditingPost(null);
      } else {
        const category = resolvePostCategory();
        const response = await fetch('/api/forum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: draft, category }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (data?.warning) {
            setModerationWarning(data.warning);
            return;
          }
          setStatusMessage(`❌ ${data?.error || 'Post fehlgeschlagen.'}`);
          setTimeout(() => setStatusMessage(''), 3000);
          return;
        }
        setContent('');
        setEditingPost(null);
        fetchPosts({ reset: true });
      }
    } catch (error) {
      console.error(error);
      setStatusMessage('❌ Beitrag fehlgeschlagen');
      setTimeout(() => setStatusMessage(''), 3000);
    }
    finally { setIsSubmitting(false); }
  };

  type CommentNode = Comment & { children: CommentNode[] };

  const buildCommentTree = (comments: Comment[]) => {
    const nodes = new Map<string, CommentNode>();
    comments.forEach(comment => {
      nodes.set(comment.id, { ...comment, children: [] });
    });

    const roots: CommentNode[] = [];
    comments.forEach(comment => {
      const node = nodes.get(comment.id);
      if (!node) return;
      if (comment.parentId && nodes.has(comment.parentId)) {
        nodes.get(comment.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return { roots, nodes };
  };

  const NavItem = ({ item, active, onClick, className = '' }: any) => {
    const Icon = item.icon;
    return (
      <button
        onClick={() => onClick(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${ 
          active 
            ? 'bg-white/10 text-white font-bold' 
            : 'text-white/50 hover:text-white hover:bg-white/5'
        } ${className}`}
      >
        <Icon className={`w-4 h-4 ${active ? 'text-[#FF9900]' : ''}`} />
        {item.name}
      </button>
    );
  };

  const NavChip = ({ item, active, onClick }: any) => {
    const Icon = item.icon;
    return (
      <button
        onClick={() => onClick(item.id)}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
          active
            ? 'border-[#FF9900]/40 bg-[#FF9900]/10 text-[#FF9900]'
            : 'border-white/10 bg-white/2 text-white/50 hover:text-white hover:border-white/20'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        {item.name}
      </button>
    );
  };

  const renderNotificationsPanel = () => (
    <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-[#FF9900]" /> Notifications
        </h4>
        {notificationsUnread > 0 && (
          <button
            onClick={async () => {
              await markAllNotificationsRead();
              setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
              setNotificationsUnread(0);
            }}
            className="text-[9px] uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            Alle gelesen
          </button>
        )}
      </div>

      {notificationsLoading ? (
        <div className="py-8 text-center text-[10px] uppercase tracking-widest text-white/30">
          Lädt ...
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-6 text-center text-[10px] uppercase tracking-widest text-white/30">
          Noch keine Benachrichtigungen.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => {
            const actor = notification.actor;
            const actorLabel = actor?.name || 'System';
            const handleClick = async () => {
              if (!notification.isRead) {
                setNotifications(prev =>
                  prev.map(item =>
                    item.id === notification.id ? { ...item, isRead: true } : item
                  )
                );
                setNotificationsUnread(prev => Math.max(0, prev - 1));
                await markNotificationsRead([notification.id]);
              }
              if (notification.href) {
                window.location.href = notification.href;
              }
            };

            return (
              <button
                key={notification.id}
                onClick={handleClick}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-all ${ 
                  notification.isRead
                    ? 'border-white/10 bg-white/2 text-white/60'
                    : 'border-[#FF9900]/30 bg-[#FF9900]/10 text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[11px] font-bold text-[#FF9900] overflow-hidden">
                    {actor?.image ? (
                      <img src={actor.image} alt={actorLabel} className="w-full h-full object-cover" />
                    ) : (
                      actorLabel.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold">{notification.title}</span>
                      <span className="text-[9px] text-white/30 uppercase tracking-widest">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/60">
                      <span className="text-white/80 font-semibold">{actorLabel}</span>
                      {notification.message ? ` · ${notification.message}` : ''}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderUserPanel = () => {
    if (!user) {
      return (
        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 text-sm text-white/40">
          Profil wird geladen...
        </div>
      );
    }

    return (
      <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl group">
        <div className="h-20 bg-linear-to-br from-[#FF9900] via-amber-600 to-black relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
        <div className="px-6 pb-6 -mt-10 relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div className="w-20 h-20 rounded-full bg-[#121212] border-4 border-[#050505] flex items-center justify-center text-3xl font-black text-[#FF9900] shadow-xl overflow-hidden">
              {user?.image ? (
                <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)
              )}
            </div>
            <div className="pb-1">
              <span className="px-2 py-1 rounded-full bg-[#FF9900]/10 text-[#FF9900] text-[9px] font-bold uppercase tracking-widest border border-[#FF9900]/20">
                {user?.role || 'FOUNDER'}
              </span>
            </div>
          </div>

          <div className="space-y-1 mb-6">
            <h3 className="text-xl font-bold text-white group-hover:text-[#FF9900] transition-colors">{user?.name}</h3>
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">
              <span>Founder #{user?.founderNumber?.toString().padStart(3, '0')}</span>
              <span>•</span>
              <span className="text-white/50">{user?.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-1">Karma</p>
              <p className="text-lg font-bold text-[#FF9900]">{user?.karmaScore || 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-1">Ventures</p>
              <p className="text-lg font-bold text-white">{(user as any)?._count?.ventures || 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-1">Squads</p>
              <p className="text-lg font-bold text-white">{(user as any)?._count?.squadMemberships || 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-1">Credits</p>
              <p className="text-lg font-bold text-blue-400">{(user as any)?.credits || 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-1">Follower</p>
              <p className="text-lg font-bold text-white">{(user as any)?._count?.followers || 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-1">Following</p>
              <p className="text-lg font-bold text-white">{(user as any)?._count?.following || 0}</p>
            </div>
          </div>

          <button
            onClick={startNewPost}
            className="w-full bg-[#FF9900] text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#FF9900]/10"
          >
            Neuen Beitrag erstellen
          </button>
        </div>
      </div>
    );
  };

  const renderTrendingPanel = () => <TrendingTopics />;

  const renderGuidelinesPanel = () => (
    <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
      <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Community-Regeln</h4>
      <ul className="space-y-3">
        {['Mehrwert liefern', 'Respektvoll bleiben', 'Kein Spam', 'Wissen teilen'].map((rule, i) => (
          <li key={i} className="flex items-center gap-3 text-xs text-white/60">
            <div className="w-1 h-1 rounded-full bg-[#FF9900]" />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <AuthGuard>
      <PageShell contentClassName="flex-1 px-4 pb-24 pt-20 sm:px-6 lg:ml-64 lg:px-6 lg:py-8 transition-all relative overflow-hidden">
        <div className="max-w-[1600px] grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start xl:grid-cols-[240px_minmax(0,1fr)_320px]">
          
          {/* LEFT SIDEBAR - Reddit Style Navigation */}
          <aside className="hidden lg:block lg:sticky lg:top-0 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto space-y-8" data-tour="forum-channels">
            <div className="space-y-1">
              {FEEDS.map(f => (
                <NavItem
                  key={f.id}
                  item={f}
                  active={activeChannel === f.id}
                  onClick={handleChannelClick}
                  className="ml-auto w-[210px]"
                />
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] px-3 mb-2">Topics</p>
              {CHANNELS.map(c => <NavItem key={c.id} item={c} active={activeChannel === c.id} onClick={handleChannelClick} />)}
            </div>

            <div className="pt-6 border-t border-white/5">
               <button
                 onClick={handleToggleNotifications}
                 className={`w-full flex items-center gap-3 px-3 py-2 transition-all text-xs ${ 
                   notificationsOpen ? 'text-white' : 'text-white/40 hover:text-white'
                 }`}
               >
                  <Bell className={`w-4 h-4 ${notificationsOpen ? 'text-[#FF9900]' : ''}`} />
                  Notifications
                  {notificationsUnread > 0 && (
                    <span className="ml-auto rounded-full bg-[#FF9900]/20 text-[#FF9900] text-[9px] font-bold px-2 py-0.5">
                      {notificationsUnread}
                    </span>
                  )}
               </button>
               <button className="w-full flex items-center gap-3 px-3 py-2 text-white/40 hover:text-white transition-all text-xs">
                  <Info className="w-4 h-4" /> Help Center
               </button>
            </div>
          </aside>

          {/* MAIN FEED */}
          <main className="min-w-0 space-y-4 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:pr-2">
            {/* Mobile Filters */}
            <div className="lg:hidden space-y-3 bg-[#121212] border border-white/10 rounded-xl p-3" data-tour="forum-mobile-filters">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Feeds</p>
                <button
                  onClick={handleToggleNotifications}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60"
                  aria-label="Benachrichtigungen"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {notificationsUnread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#FF9900]" />
                  )}
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {FEEDS.map(f => <NavChip key={f.id} item={f} active={activeChannel === f.id} onClick={handleChannelClick} />)}
              </div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Topics</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {CHANNELS.map(c => <NavChip key={c.id} item={c} active={activeChannel === c.id} onClick={handleChannelClick} />)}
              </div>
            </div>

            {notificationsOpen && (
              <div className="xl:hidden">
                {renderNotificationsPanel()}
              </div>
            )}

            <div className="xl:hidden space-y-3">
              {[
                { id: 'profile', label: 'Profil & Stats', content: renderUserPanel() },
                { id: 'trending', label: 'Trending Topics', content: renderTrendingPanel() },
                { id: 'rules', label: 'Community-Regeln', content: renderGuidelinesPanel() },
              ].map((panel) => (
                <details key={panel.id} className="group rounded-2xl border border-white/10 bg-[#121212]">
                  <summary className="flex items-center justify-between px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 cursor-pointer list-none marker:hidden">
                    {panel.label}
                    <ChevronDown className="w-4 h-4 text-white/40 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4">{panel.content}</div>
                </details>
              ))}
            </div>

            <div className="lg:sticky lg:top-0 lg:z-20 lg:space-y-3 lg:bg-[#08090A]/95 lg:backdrop-blur-sm lg:pb-3">
              {toastMessage && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  {toastMessage}
                </div>
              )}

              {/* Post Creation Trigger */}
              <div className="bg-[#121212] border border-white/10 rounded-xl p-3 flex flex-col gap-3 shadow-xl sm:flex-row sm:items-center" data-tour="forum-post-trigger">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#FF9900] to-amber-700 flex items-center justify-center text-black font-black text-sm overflow-hidden">
                    {user?.image ? (
                      <img src={user.image} alt={user?.name || 'Profilbild'} className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0)
                    )}
                  </div>
                  <div className="relative flex-1">
                    <button 
                      onClick={startNewPost}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-4 pr-20 py-2.5 text-sm text-left text-white/40 transition-all"
                    >
                      Was brennt dir auf der Seele?
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={startNewPost}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg"
                        aria-label="Bild hochladen"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={startNewPost}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg"
                        aria-label="Beitrag erstellen"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sort Bar */}
              <div className="bg-[#121212] border border-white/10 rounded-xl p-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {['Hot', 'New', 'Top'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${ 
                      sortMode === mode ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {mode === 'Hot' && <Zap className="w-3.5 h-3.5" />}
                    {mode === 'New' && <Plus className="w-3.5 h-3.5" />}
                    {mode === 'Top' && <TrendingUp className="w-3.5 h-3.5" />}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-3">
              {isLoadingInitial ? (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              ) : (
                <>
                  {posts.map(post => {
                    const profileHref = buildProfileHref(post);
                    const firstRootComment = (post.comments || []).find(comment => !comment.parentId);
                    const firstCommentPreview = firstRootComment ? stripMarkdown(firstRootComment.content) : '';

                    return (
                    <div key={post.id} id={post.id} className="bg-transparent sm:bg-[#121212] border-b border-white/10 sm:border sm:rounded-xl sm:hover:border-white/20 transition-all group">
                      {/* Post Content */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40 mb-3">
                          {profileHref ? (
                            <Link href={profileHref} className="flex items-center gap-2 hover:text-white transition-colors">
                              <div className="w-5 h-5 rounded-full bg-[#FF9900]/20 flex items-center justify-center text-[8px] text-[#FF9900] font-bold overflow-hidden">
                                {post.authorImage ? (
                                  <img src={post.authorImage} alt={post.author} className="w-full h-full object-cover" />
                                ) : (
                                  post.author.charAt(0)
                                )}
                              </div>
                              <span className="font-bold text-white/80">u/{post.author.replace(/\s/g, '').toLowerCase()}</span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-[#FF9900]/20 flex items-center justify-center text-[8px] text-[#FF9900] font-bold overflow-hidden">
                                {post.authorImage ? (
                                  <img src={post.authorImage} alt={post.author} className="w-full h-full object-cover" />
                                ) : (
                                  post.author.charAt(0)
                                )}
                              </div>
                              <span className="font-bold text-white/80">u/{post.author.replace(/\s/g, '').toLowerCase()}</span>
                            </div>
                          )}
                          <span>•</span>
                          <span>{formatRelativeTime(post.createdTime)}</span>
                          <span className="sm:ml-auto bg-white/5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">{post.category}</span>
                        </div>

                        <div className="prose prose-invert prose-sm max-w-none mb-4 group-hover:text-white transition-colors">
                          {(() => {
                            const { content: cleanContent, meta } = extractMetadata(post.content);
                            if (!meta || (!meta.bg && !meta.color && meta.align === 'left')) {
                              return (
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                                  {post.content}
                                </ReactMarkdown>
                              );
                            }
                            return (
                              <div 
                                className="rounded-2xl overflow-hidden relative min-h-[260px] flex flex-col justify-center p-6 sm:p-10 shadow-2xl border border-white/5 my-2"
                                style={{ textAlign: meta.align, color: meta.color }}
                              >
                                {meta.bg && (
                                  <div className="absolute inset-0 z-0">
                                    <img src={meta.bg} className="w-full h-full object-cover opacity-60 blur-[1px]" alt="Background" />
                                    <div className="absolute inset-0 bg-black/40" />
                                  </div>
                                )}
                                <div className={`relative z-10 prose prose-invert max-w-none !text-[inherit] ${
                                  meta.size === 'sm' ? 'prose-sm' : 
                                  meta.size === 'lg' ? 'prose-xl' : 
                                  meta.size === 'xl' ? 'prose-2xl' : 'prose-base'
                                }`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                                    {cleanContent}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {firstRootComment && (
                          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-2">
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white/60">
                                Erster Kommentar
                              </span>
                              <span className="font-bold text-white/70">
                                {firstRootComment.author.startsWith('@') ? '' : '@'}{firstRootComment.author}
                              </span>
                              <span>•</span>
                              <span>{formatRelativeTime(firstRootComment.time)}</span>
                            </div>
                            <p className="text-white/70 text-sm line-clamp-3">
                              {firstCommentPreview || '—'}
                            </p>
                            <button
                              onClick={() => toggleComments(post.id)}
                              className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
                            >
                              Kommentare öffnen
                            </button>
                          </div>
                        )}

                        <div className="hidden sm:flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                            <button 
                              onClick={() => handleVote(post.id, 1)}
                              className={`p-1 transition-all ${post.userVote === 1 ? 'text-[#FF9900]' : 'text-white/40 hover:text-white'}`}
                              aria-label="Upvote"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <span className={`text-[11px] font-bold ${post.userVote === 1 ? 'text-[#FF9900]' : post.userVote === -1 ? 'text-blue-400' : 'text-white/70'}`}>
                              {post.likes}
                            </span>
                            <button 
                              onClick={() => handleVote(post.id, -1)}
                              className={`p-1 transition-all ${post.userVote === -1 ? 'text-blue-400' : 'text-white/40 hover:text-white'}`}
                              aria-label="Downvote"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => toggleComments(post.id)}
                            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${ 
                              expandedPosts[post.id] ? 'text-white' : 'text-white/40 hover:text-white'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> {post.comments?.length || 0} Comments
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAiMenuOpen(aiMenuOpen === post.id ? null : post.id);
                              }}
                              className="flex items-center gap-2 text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-all orion-menu-trigger"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> {aiLoading && aiMenuOpen === post.id ? 'Lädt...' : 'Orion Insight'}
                            </button>
                            <AnimatePresence>
                              {aiMenuOpen === post.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute left-0 bottom-full mb-2 w-48 rounded-xl border border-[#FF9900]/20 bg-[#121212]/95 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.1)] z-20 overflow-hidden orion-menu-container"
                                >
                                  {AI_ACTIONS.map(action => (
                                    <button
                                      key={action.id}
                                      onClick={() => handleAIAction(post, action.id)}
                                      className="w-full text-left px-4 py-2.5 text-[11px] text-white/70 hover:text-white hover:bg-[#FF9900]/10 transition-colors border-b border-white/5 last:border-0"
                                    >
                                      {action.label}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {user && user.id && post.authorId === user.id && (
                            <button
                              onClick={() => startEdit(post)}
                              className="p-1.5 text-white/20 hover:text-white transition-all"
                              aria-label="Beitrag bearbeiten"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {user && (user.role === 'ADMIN' || (user.id && post.authorId === user.id)) && (
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="sm:ml-auto p-1.5 text-white/20 hover:text-white transition-all"
                              aria-label="Beitrag löschen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="sm:hidden mt-3 border-t border-white/5 pt-3 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/60">
                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                            <button 
                              onClick={() => handleVote(post.id, 1)}
                              className={`p-1 transition-all ${post.userVote === 1 ? 'text-[#FF9900]' : 'text-white/40 hover:text-white'}`}
                              aria-label="Upvote"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <span className={`text-[11px] font-bold ${post.userVote === 1 ? 'text-[#FF9900]' : post.userVote === -1 ? 'text-blue-400' : 'text-white/70'}`}>
                              {post.likes}
                            </span>
                            <button 
                              onClick={() => handleVote(post.id, -1)}
                              className={`p-1 transition-all ${post.userVote === -1 ? 'text-blue-400' : 'text-white/40 hover:text-white'}`}
                              aria-label="Downvote"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => toggleComments(post.id)}
                            className={`flex items-center gap-2 ${expandedPosts[post.id] ? 'text-white' : 'text-white/40 hover:text-white'}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                            {post.comments?.length || 0}
                          </button>
                          <button
                            onClick={() => handleShare(post.id)}
                            className="flex items-center gap-2 text-white/40 hover:text-white transition-all"
                          >
                            <Share2 className="w-4 h-4" />
                            Teilen
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAiMenuOpen(aiMenuOpen === post.id ? null : post.id);
                              }}
                              className="flex items-center gap-2 text-white/40 hover:text-white transition-all orion-menu-trigger"
                            >
                              <Sparkles className="w-4 h-4" />
                              {aiLoading && aiMenuOpen === post.id ? 'Lädt...' : 'Orion'}
                            </button>
                            <AnimatePresence>
                              {aiMenuOpen === post.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute left-0 bottom-full mb-2 w-48 rounded-xl border border-[#FF9900]/20 bg-[#121212]/95 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.1)] z-20 overflow-hidden orion-menu-container"
                                >
                                  {AI_ACTIONS.map(action => (
                                    <button
                                      key={action.id}
                                      onClick={() => handleAIAction(post, action.id)}
                                      className="w-full text-left px-4 py-2.5 text-[11px] text-white/70 hover:text-white hover:bg-[#FF9900]/10 transition-colors border-b border-white/5 last:border-0"
                                    >
                                      {action.label}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {user && user.id && post.authorId === user.id && (
                            <button
                              onClick={() => startEdit(post)}
                              className="p-1.5 text-white/40 hover:text-white transition-all"
                              aria-label="Beitrag bearbeiten"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {user && (user.role === 'ADMIN' || (user.id && post.authorId === user.id)) && (
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-1.5 text-white/40 hover:text-white transition-all"
                              aria-label="Beitrag löschen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {expandedPosts[post.id] && (
                          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
                            <div className="space-y-3">
                              {(post.comments || []).length === 0 ? (
                                <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Noch keine Kommentare.</p>
                              ) : (() => {
                                const { roots, nodes } = buildCommentTree(post.comments || []);
                                const renderCommentNode = (comment: CommentNode, depth: number) => {
                                  const isAI = AI_AUTHORS.has(comment.author);
                                  const canManage = user && (user.role === 'ADMIN' || (user.id && comment.authorId === user.id));
                                  const isEditing = commentEditingId === comment.id;
                                  const parent = comment.parentId ? nodes.get(comment.parentId) : null;
                                  const commentProfileHref = buildAuthorHref(
                                    comment.authorId,
                                    comment.authorSlug
                                  );

                                  return (
                                    <div key={comment.id} className={`relative ${depth > 0 ? 'pl-0 sm:pl-6' : ''}`}>
                                      {depth > 0 && (
                                        <>
                                          <span className="hidden sm:block absolute left-2 top-0 bottom-0 w-px bg-white/10" />
                                          <span className="hidden sm:block absolute left-1.5 top-5 w-2 h-2 rounded-full bg-white/20" />
                                        </>
                                      )}
                                      <div
                                        className={`rounded-xl border px-4 py-3 ${ 
                                          isAI
                                            ? 'bg-[#FF9900]/10 border-[#FF9900]/30'
                                            : 'bg-white/5 border-white/10'
                                        } ${depth > 0 ? `border-l-2 sm:border-l-0 ${isAI ? 'border-l-[#FF9900]/40' : 'border-l-white/10'}` : ''}`}
                                      >
                                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-2">
                                          {commentProfileHref ? (
                                            <Link href={commentProfileHref} className="flex items-center gap-2 hover:text-white transition-colors">
                                              <div className="w-5 h-5 rounded-full bg-[#FF9900]/20 flex items-center justify-center text-[8px] text-[#FF9900] font-bold overflow-hidden">
                                                {comment.authorImage ? (
                                                  <img src={comment.authorImage} alt={comment.author} className="w-full h-full object-cover" />
                                                ) : (
                                                  comment.author.charAt(0)
                                                )}
                                              </div>
                                              <span className="font-bold text-white/70">{comment.author}</span>
                                            </Link>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <div className="w-5 h-5 rounded-full bg-[#FF9900]/20 flex items-center justify-center text-[8px] text-[#FF9900] font-bold overflow-hidden">
                                                {comment.authorImage ? (
                                                  <img src={comment.authorImage} alt={comment.author} className="w-full h-full object-cover" />
                                                ) : (
                                                  comment.author.charAt(0)
                                                )}
                                              </div>
                                              <span className="font-bold text-white/70">{comment.author}</span>
                                            </div>
                                          )}
                                          {isAI && (
                                            <span className="px-2 py-0.5 rounded-full bg-[#FF9900]/20 text-[#FF9900] text-[9px] font-bold tracking-widest">
                                              ORION
                                            </span>
                                          )}
                                          <span>•</span>
                                          <span>{formatRelativeTime(comment.time)}</span>
                                        </div>

                                        {parent && (
                                          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
                                            Antwort auf <span className="text-white/60">{parent.author.startsWith('@') ? '' : '@'}{parent.author}</span>
                                          </div>
                                        )}

                                        {isEditing ? (
                                          <ForumEditor
                                            value={commentEditDrafts[comment.id] || ''}
                                            onChange={(val) =>
                                              setCommentEditDrafts((prev) => {
                                                const current = prev[comment.id] || '';
                                                const nextValue = typeof val === 'function' ? val(current) : val;
                                                return { ...prev, [comment.id]: nextValue };
                                              })
                                            }
                                            onSubmit={() => handleCommentEdit(post.id, comment.id)}
                                            isSubmitting={commentEditSubmitting === comment.id}
                                            submitLabel="Speichern"
                                            showCancel
                                            onCancel={cancelCommentEdit}
                                            minHeight="100px"
                                            mediaVentureId={forumVentureIdState}
                                            enableImageGenerator
                                            markdownComponents={MarkdownComponents}
                                          />
                                        ) : (
                                          <div className="prose prose-invert prose-sm max-w-none text-white/80">
                                            <ReactMarkdown 
                                              remarkPlugins={[remarkGfm]}
                                              components={MarkdownComponents}
                                            >{comment.content}</ReactMarkdown>
                                          </div>
                                        )}

                                        {!isEditing && (
                                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-white/40">
                                            <button
                                              onClick={() => handleCommentVote(post.id, comment.id, 1)}
                                              className={`flex items-center gap-1.5 transition-all ${ 
                                                (comment.userVote || 0) === 1 ? 'text-[#FF9900]' : 'text-white/40 hover:text-white'
                                              }`}
                                            >
                                              <Heart className={`w-3.5 h-3.5 ${(comment.userVote || 0) === 1 ? 'fill-[#FF9900]' : ''}`} />
                                              <span>{comment.likes || 0}</span>
                                            </button>
                                            <button
                                              onClick={() => setReplyTargets(prev => ({ ...prev, [post.id]: comment }))}
                                              className="flex items-center gap-1.5 text-white/40 hover:text-white transition-all"
                                            >
                                              <Reply className="w-3.5 h-3.5" /> Antworten
                                            </button>
                                            <div className="relative">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setAiMenuOpen(aiMenuOpen === comment.id ? null : comment.id);
                                                }}
                                                className="flex items-center gap-1.5 text-white/40 hover:text-white transition-all orion-menu-trigger"
                                              >
                                                <Sparkles className="w-3.5 h-3.5" /> 
                                                {aiLoading && aiMenuOpen === comment.id ? '...' : 'Orion'}
                                              </button>
                                              <AnimatePresence>
                                                {aiMenuOpen === comment.id && (
                                                  <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                                    className="absolute left-0 bottom-full mb-2 w-48 rounded-xl border border-[#FF9900]/20 bg-[#121212]/95 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.1)] z-20 overflow-hidden orion-menu-container"
                                                  >
                                                    {AI_ACTIONS.map(action => (
                                                      <button
                                                        key={action.id}
                                                        onClick={() => handleAIAction(post, action.id, comment.id, comment.content)}
                                                        className="w-full text-left px-4 py-2.5 text-[11px] text-white/70 hover:text-white hover:bg-[#FF9900]/10 transition-colors border-b border-white/5 last:border-0"
                                                      >
                                                        {action.label}
                                                      </button>
                                                    ))}
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
                                            </div>
                                            {canManage && (
                                              <>
                                                <button
                                                  onClick={() => startCommentEdit(comment)}
                                                  className="flex items-center gap-1.5 text-white/40 hover:text-white transition-all"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" /> Bearbeiten
                                                </button>
                                                <button
                                                  onClick={() => handleCommentDelete(post.id, comment.id)}
                                                  className="flex items-center gap-1.5 text-white/40 hover:text-white transition-all"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {comment.children.length > 0 && (
                                        <div className="mt-3 space-y-3">
                                          {comment.children.map(child => renderCommentNode(child, depth + 1))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                };

                                return roots.map(comment => renderCommentNode(comment, 0));
                              })()}
                            </div>

                            <div className="pt-3 border-t border-white/10 space-y-3">
                              {commentStatus[post.id] && (
                                <div className="text-[10px] uppercase tracking-widest text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                                  {commentStatus[post.id]}
                                </div>
                              )}
                              {replyTargets[post.id] && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/2 px-3 py-2 text-[10px] uppercase tracking-widest text-white/50">
                                  <span>Antwort an {replyTargets[post.id]?.author?.startsWith('@') ? '' : '@'}{replyTargets[post.id]?.author}</span>
                                  <button
                                    onClick={() => setReplyTargets(prev => ({ ...prev, [post.id]: null }))}
                                    className="text-white/40 hover:text-white transition-all"
                                  >
                                    Abbrechen
                                  </button>
                                </div>
                              )}
                              <ForumEditor
                                value={commentDrafts[post.id] || ''}
                                onChange={(val) =>
                                  setCommentDrafts((prev) => {
                                    const current = prev[post.id] || '';
                                    const nextValue = typeof val === 'function' ? val(current) : val;
                                    return { ...prev, [post.id]: nextValue };
                                  })
                                }
                                onSubmit={() => handleCommentSubmit(post.id)}
                                isSubmitting={commentSubmitting === post.id}
                                placeholder={replyTargets[post.id] ? 'Antwort schreiben...' : 'Antworte oder ergänze den Thread...'}
                                submitLabel="Kommentar senden"
                                minHeight="120px"
                                mediaVentureId={forumVentureIdState}
                                enableImageGenerator
                                markdownComponents={MarkdownComponents}
                              />
                            </div>

                            <RelatedPosts postId={post.id} content={post.content} category={post.category} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Infinite Scroll Trigger & Load More */}
                <div ref={loadMoreRef} className="py-8 text-center min-h-[100px] flex flex-col items-center justify-center">
                  {isLoadingMore && (
                    <div className="w-full max-w-2xl">
                      <PostSkeleton />
                    </div>
                  )}
                  {!hasMore && posts.length > 0 && (
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mt-4">
                      Das war's für den Moment.
                    </p>
                  )}
                </div>
              </>
              )}
            </div>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden xl:block xl:sticky xl:top-0 xl:h-[calc(100dvh-4rem)] xl:overflow-y-auto space-y-6">
            {notificationsOpen && (
              renderNotificationsPanel()
            )}
            {renderUserPanel()}
            {renderTrendingPanel()}
            {renderGuidelinesPanel()}
          </aside>

        </div>

        {/* POSTING MODAL - PRO RESTORATION */}
        <AnimatePresence>
          {editingPost && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-xl"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="bg-[#121212] border border-white/10 rounded-2xl sm:rounded-[2.5rem] w-full max-w-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col h-[calc(100dvh-16px)] sm:h-auto max-h-[calc(100dvh-16px)] sm:max-h-[90vh] overflow-hidden relative"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#FF9900] to-transparent opacity-50" />
                
                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-white/1">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {editingPost === 'NEW' ? 'Beitrag schmieden' : 'Beitrag bearbeiten'}
                    </h2>
                    <p className="text-xs text-white/30 uppercase tracking-widest font-bold">
                      {editingPost === 'NEW' ? 'Wissen teilen • Community stärken' : 'Schärfe deinen Beitrag'}
                    </p>
                  </div>
                  <button onClick={() => setEditingPost(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
                </div>

                {moderationWarning && (
                  <div className="mx-8 mt-6 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-xs text-red-200 uppercase tracking-widest">
                    <div className="font-bold text-red-300 mb-1">Moderation • Hinweis #{moderationWarning.number}</div>
                    <div className="text-red-200/90 normal-case tracking-normal">{moderationWarning.message}</div>
                  </div>
                )}

                <div
                  className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar"
                  style={{ overscrollBehavior: 'contain' }}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* Category & Tools Bar - Reduced since Editor has tools */}
                  <div className="flex flex-wrap items-center gap-4">
                    {editingPost === 'NEW' && (
                      <div className="space-y-2 w-full sm:w-auto">
                        <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Channel wählen</label>
                        <select
                          value={activeChannel === 'All' || activeChannel === 'Popular' ? 'General' : activeChannel}
                          onChange={e => setActiveChannel(e.target.value)}
                          className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-[#FF9900] transition-all cursor-pointer"
                        >
                          {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <ForumEditor
                    value={editingPost === 'NEW' ? content : editContent}
                    onChange={val => editingPost === 'NEW' ? setContent(val) : setEditContent(val)}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    placeholder="Was gibt es neues im Netzwerk? Teile deine Gedanken, Updates oder Fragen..."
                    submitLabel={editingPost === 'NEW' ? 'Beitrag posten' : 'Update speichern'}
                    minHeight="400px"
                    autoFocus
                    mediaVentureId={forumVentureIdState}
                    enableImageGenerator
                    markdownComponents={MarkdownComponents}
                  />
                </div>

                <div className="p-6 sm:p-8 border-t border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end bg-white/1">
                  {statusMessage && (
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                      {statusMessage}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button 
                      onClick={() => setEditingPost(null)}
                      className="w-full sm:w-auto px-6 py-3 text-xs font-bold text-white/20 hover:text-white uppercase tracking-widest transition-all"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onboarding Overlay */}
        {user && !user.onboardingComplete && (
          <OnboardingWizard 
            user={user as any} 
            onComplete={() => {
              setUser(prev => prev ? { ...prev, onboardingComplete: true } : null);
            }} 
          />
        )}

        {user && user.onboardingComplete && !user.hasSeenCockpitTour && (
          <ForumTour
            initialHasSeenTour={!!user.hasSeenCockpitTour}
            onComplete={() => {
              setUser(prev => prev ? { ...prev, hasSeenCockpitTour: true } : null);
            }}
          />
        )}
      </PageShell>
    </AuthGuard>
  );
}
