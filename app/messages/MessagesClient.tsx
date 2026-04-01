'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageShell from '@/app/components/PageShell';
import AuthGuard from '@/app/components/AuthGuard';
import { MessageCircle, Search, Send, Loader2, UserPlus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface ThreadParticipant {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  profileSlug: string | null;
  founderNumber: number | null;
}

interface ThreadSummary {
  id: string;
  lastMessageAt: string | null;
  lastReadAt: string | null;
  participants: ThreadParticipant[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
}

interface ThreadMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
    profileSlug: string | null;
    founderNumber: number | null;
  };
}

interface UserResult {
  id: string;
  name: string | null;
  image: string | null;
  profileSlug: string | null;
  founderNumber: number | null;
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function formatHeaderStamp(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const day = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  return `${day} · ${formatTime(value)}`;
}

function initialsFromName(name?: string | null) {
  if (!name) return 'OP';
  return name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function MessagesClient() {
  const searchParams = useSearchParams();
  const preferredThreadId = searchParams.get('thread');
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeParticipants, setActiveParticipants] = useState<ThreadParticipant[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showThreadList, setShowThreadList] = useState(true);
  const [clearingInbox, setClearingInbox] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(
    () => threads.find(thread => thread.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const activePeer = useMemo(() => {
    if (!viewerId) return null;
    return activeParticipants.find(participant => participant.userId !== viewerId) || activeParticipants[0] || null;
  }, [activeParticipants, viewerId]);

  const loadThreads = useCallback(async (selectThread = true) => {
    setLoadingThreads(true);
    try {
      const response = await fetch('/api/messages/threads');
      if (!response.ok) throw new Error('Failed to load threads');
      const payload = await response.json();
      setThreads(payload.threads || []);
      setViewerId(payload.viewerId || null);

      if (selectThread) {
        const hasPreferred = preferredThreadId && payload.threads?.some((thread: ThreadSummary) => thread.id === preferredThreadId);
        const nextThreadId = hasPreferred ? preferredThreadId : (payload.threads?.[0]?.id || null);
        setActiveThreadId(prev => prev || nextThreadId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingThreads(false);
    }
  }, [preferredThreadId]);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/threads/${threadId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      const payload = await response.json();
      setMessages(payload.messages || []);
      setActiveParticipants(payload.participants || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!preferredThreadId || threads.length === 0) return;
    const exists = threads.some((thread) => thread.id === preferredThreadId);
    if (exists) {
      setActiveThreadId(preferredThreadId);
      setShowThreadList(false);
    }
  }, [preferredThreadId, threads]);

  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId);
    }
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/messages/search?q=${encodeURIComponent(search.trim())}`);
        if (!response.ok) throw new Error('Failed to search users');
        const payload = await response.json();
        setSearchResults(payload.results || []);
      } catch (error) {
        console.error(error);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setShowThreadList(false);
  };

  const handleStartThread = async (recipientId: string) => {
    try {
      const response = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId })
      });

      if (!response.ok) throw new Error('Failed to create thread');
      const payload = await response.json();

      await loadThreads(false);
      setActiveThreadId(payload.threadId);
      setSearch('');
      setSearchResults([]);
      setShowThreadList(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSend = async () => {
    if (!activeThreadId || !composer.trim()) return;

    setSending(true);
    setSendError('');
    try {
      const response = await fetch(`/api/messages/threads/${activeThreadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: composer.trim() })
      });

      const payload = await response.json();
      if (!response.ok) {
        setSendError(payload?.warning?.message || payload?.reason || payload?.error || 'Nachricht konnte nicht gesendet werden.');
        return;
      }
      setMessages(prev => [...prev, payload]);
      setComposer('');
      await loadThreads(false);
    } catch (error) {
      console.error(error);
      setSendError('Nachricht konnte nicht gesendet werden.');
    } finally {
      setSending(false);
    }
  };

  const handleClearInbox = async () => {
    if (threads.length === 0 || clearingInbox) return;
    const confirmed = window.confirm('Willst du wirklich deine komplette Inbox löschen?');
    if (!confirmed) return;

    setClearingInbox(true);
    try {
      const response = await fetch('/api/messages/threads', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear inbox');

      setThreads([]);
      setMessages([]);
      setActiveThreadId(null);
      setActiveParticipants([]);
      setShowThreadList(true);
    } catch (error) {
      console.error(error);
    } finally {
      setClearingInbox(false);
    }
  };

  return (
    <AuthGuard>
      <PageShell>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Private Inbox</p>
              <h1 className="text-3xl font-instrument-serif text-white">Direct Messages</h1>
              <p className="text-sm text-white/40">Diskret, schnell, direkt im Forge OS.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearInbox}
                disabled={threads.length === 0 || clearingInbox}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4 text-white/60" />
                {clearingInbox ? 'Lösche...' : 'Inbox löschen'}
              </button>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
                Secure Channel
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:min-h-[calc(100vh-220px)] lg:grid-cols-[340px,1fr]">
            <div className={`glass-card flex min-h-[60vh] lg:min-h-[620px] flex-col overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.4)] ${showThreadList ? 'block' : 'hidden'} lg:block`}>
              <div className="border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Inbox</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    {loadingThreads ? '--' : `${threads.length} Chats`}
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Founder suchen..."
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  />
                  {searching && (
                    <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Matches</div>
                    <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/60 p-2">
                      {searchResults.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleStartThread(result.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10"
                        >
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs font-bold text-[var(--accent)]">
                            {result.image ? (
                              <img src={result.image} alt={result.name || 'Founder'} className="h-full w-full object-cover" />
                            ) : (
                              initialsFromName(result.name)
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{result.name || 'Anonymous Founder'}</div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                              Founder #{String(result.founderNumber || 0).padStart(3, '0')}
                            </div>
                          </div>
                          <UserPlus className="h-4 w-4 text-[var(--accent)]" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Conversations</div>
                {loadingThreads ? (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Lade Threads...
                  </div>
                ) : threads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                    Noch keine Nachrichten. Starte links eine Konversation.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threads.map(thread => {
                      const peer = thread.participants.find(participant => participant.userId !== viewerId) || thread.participants[0];
                      const isActive = thread.id === activeThreadId;
                      const hasUnread = thread.lastMessage && (!thread.lastReadAt || new Date(thread.lastMessage.createdAt) > new Date(thread.lastReadAt));

                      return (
                        <button
                          key={thread.id}
                          onClick={() => handleSelectThread(thread.id)}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${isActive ? 'border-[var(--accent)]/60 bg-white/10' : 'border-white/5 bg-black/30 hover:border-white/20 hover:bg-white/5'}`}
                        >
                          <div className="relative">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs font-bold text-[var(--accent)]">
                              {peer?.image ? (
                                <img src={peer.image} alt={peer?.name || 'Founder'} className="h-full w-full object-cover" />
                              ) : (
                                initialsFromName(peer?.name)
                              )}
                            </div>
                            {hasUnread && (
                              <span className="absolute -right-1 top-0 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-white">{peer?.name || 'Anonymous Founder'}</div>
                              <div className={`text-[10px] uppercase tracking-[0.2em] ${isActive ? 'text-[var(--accent)]/80' : 'text-white/40'}`}>
                                {thread.lastMessageAt ? formatShortDate(thread.lastMessageAt) : ''}
                              </div>
                            </div>
                            <div className="mt-1 truncate text-xs text-white/40">
                              {thread.lastMessage?.content || 'Noch keine Nachricht'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={`glass-card flex min-h-[60vh] lg:min-h-[620px] flex-col rounded-3xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] ${showThreadList ? 'hidden' : 'block'} lg:block`}>
              <div className="border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent px-6 py-4">
                {activePeer ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center justify-between gap-3 lg:hidden">
                      <button
                        onClick={() => setShowThreadList(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60"
                      >
                        Zur Inbox
                      </button>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        {activeThread?.lastMessageAt ? formatShortDate(activeThread.lastMessageAt) : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs font-bold text-[var(--accent)]">
                        {activePeer.image ? (
                          <img src={activePeer.image} alt={activePeer.name || 'Founder'} className="h-full w-full object-cover" />
                        ) : (
                          initialsFromName(activePeer.name)
                        )}
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">{activePeer.name || 'Anonymous Founder'}</div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                          Founder #{String(activePeer.founderNumber || 0).padStart(3, '0')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-[0.2em] text-white/30">
                      <div>Last Activity</div>
                      <div className="mt-1 text-xs normal-case text-white/60">
                        {activeThread?.lastMessageAt ? formatHeaderStamp(activeThread.lastMessageAt) : 'New channel'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/50">Wähle eine Konversation aus.</div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto bg-black/10 px-6 py-6">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/40">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Lade Nachrichten...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-sm text-white/40">
                    <MessageCircle className="mb-3 h-8 w-8 text-white/20" />
                    Sag hallo und starte den Austausch.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => {
                      const isSelf = message.senderId === viewerId;
                      return (
                        <div key={message.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-lg ${isSelf ? 'bg-[var(--accent)] text-black rounded-br-[6px] shadow-[0_12px_30px_rgba(212,175,55,0.18)]' : 'bg-white/5 text-white border border-white/10 rounded-bl-[6px]'}`}>
                            {!isSelf && (
                              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                                {message.sender?.name || 'Founder'}
                              </div>
                            )}
                            <div className="mt-1 whitespace-pre-wrap leading-relaxed">
                              {message.content}
                            </div>
                            <div className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${isSelf ? 'text-black/60' : 'text-white/40'}`}>
                              {formatTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 px-6 py-4">
                {sendError && (
                  <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">
                    {sendError}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={activeThreadId ? 'Nachricht schreiben...' : 'Wähle zuerst eine Konversation'}
                    lang="de"
                    spellCheck
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    rows={2}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                    disabled={!activeThreadId || sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!activeThreadId || !composer.trim() || sending}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
