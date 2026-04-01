'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Brain,
  Search,
  Factory,
  CheckCircle,
  Paperclip,
  ArrowUpIcon,
  User,
  Bot,
  Globe,
  ExternalLink,
  ImageIcon,
  Plus,
  Trash2,
  Loader2,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

// --- Types ---

type ChatMode = 'chat' | 'research' | 'supplier' | 'factcheck';

type ProviderOption = {
  id: ChatMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'disabled';
};

const providerOptions: ProviderOption[] = [
  {
    id: 'chat',
    label: 'Orion Chat',
    description: 'Dein persönlicher Assistent.',
    icon: <Brain className="w-4 h-4" />,
    status: 'active',
  },
  {
    id: 'research',
    label: 'Web Recherche',
    description: 'Suche mit aktuellen Ergebnissen.',
    icon: <Search className="w-4 h-4" />,
    status: 'active',
  },
  {
    id: 'supplier',
    label: 'Lieferanten',
    description: 'Finde Hersteller & Supplier.',
    icon: <Factory className="w-4 h-4" />,
    status: 'active',
  },
  {
    id: 'factcheck',
    label: 'Faktencheck',
    description: 'Überprüfe Aussagen.',
    icon: <CheckCircle className="w-4 h-4" />,
    status: 'active',
  },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: ChatMode;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  attachments?: Array<{
    name: string;
    type: string;
    url: string;
    size?: number;
    isLocal?: boolean;
    failed?: boolean;
  }>;
}

interface ChatThread {
  id: string;
  title: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
}

type MessageAttachment = NonNullable<Message['attachments']>[number];

type StoredAttachment = {
  name: string;
  type: string;
  url: string;
  size?: number;
};

type StoredSource = {
  title: string;
  url: string;
  snippet: string;
  published?: string | null;
};

// --- Hooks ---

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`; // reset first
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

// --- Components ---

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function QuickAction({ icon, label, active, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border-neutral-700 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-all",
        active && "bg-royal/20 text-royal border-royal/40 shadow-[0_0_15px_rgba(255,153,0,0.2)]"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}

// --- Main Client ---

export default function CommunicationClient() {
  const [mode, setMode] = useState<ChatMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isThreadsLoading, setIsThreadsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const hasInitialized = useRef(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  const closeSidebarOnMobile = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const isLoadingState = isLoading;
  const isBusy = isLoadingState || isThreadLoading;

  const createThreadTitle = (value: string) => {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'Neuer Chat';
    return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
  };

  const formatThreadDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  const loadThread = useCallback(async (threadId: string) => {
    if (isLoadingState) return;
    setIsThreadLoading(true);
    try {
      const res = await fetch(`/api/communication/threads/${threadId}`);
      if (!res.ok) throw new Error('Thread load failed');
      const data = await res.json();
      const loadedMessages = Array.isArray(data?.messages) ? data.messages : [];
      const normalized = loadedMessages.map((msg: {
        id?: string;
        role?: string;
        content?: string;
        mode?: string | null;
        attachments?: unknown;
        sources?: unknown;
      }) => ({
        id: String(msg.id),
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : '',
        mode: typeof msg.mode === 'string' ? msg.mode : undefined,
        attachments: Array.isArray(msg.attachments) ? msg.attachments as StoredAttachment[] : undefined,
        sources: Array.isArray(msg.sources) ? msg.sources as StoredSource[] : undefined
      })) as Message[];
      setMessages(normalized);
      setActiveThreadId(threadId);
      closeSidebarOnMobile();
    } finally {
      setIsThreadLoading(false);
    }
  }, [closeSidebarOnMobile, isLoadingState]);

  const fetchThreads = useCallback(async () => {
    setIsThreadsLoading(true);
    try {
      const res = await fetch('/api/communication/threads');
      if (!res.ok) throw new Error('Failed to load threads');
      const data = await res.json();
      const list = Array.isArray(data?.threads) ? data.threads : [];
      setThreads(list);
      
      if (!hasInitialized.current && list.length > 0) {
        await loadThread(list[0].id);
        hasInitialized.current = true;
      }
    } catch (error) {
      console.error('Thread list failed:', error);
    } finally {
      setIsThreadsLoading(false);
    }
  }, [loadThread]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const addAttachments = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (files: File[]): Promise<StoredAttachment[]> => {
    if (files.length === 0) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res = await fetch('/api/chat/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Upload fehlgeschlagen.');
    }
    return Array.isArray(data?.attachments) ? (data.attachments as StoredAttachment[]) : [];
  };

  const isImageType = (type: string) => type.startsWith('image/');

  const formatBytes = (size?: number) => {
    if (!size || size <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const createThread = async (titleSource: string) => {
    const res = await fetch('/api/communication/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: createThreadTitle(titleSource) })
    });
    if (!res.ok) {
      throw new Error('Thread create failed');
    }
    const data = await res.json();
    if (data?.thread?.id) {
      setThreads((prev) => [data.thread, ...prev.filter((t) => t.id !== data.thread.id)]);
      setActiveThreadId(data.thread.id);
      return data.thread as ChatThread;
    }
    throw new Error('Thread create failed');
  };

  const persistMessages = async (threadId: string, items: Array<{
    role: 'user' | 'assistant';
    content: string;
    mode?: string;
    attachments?: StoredAttachment[];
    sources?: StoredSource[];
  }>) => {
    const res = await fetch(`/api/communication/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: items })
    });
    if (!res.ok) {
      throw new Error('Persist failed');
    }
    const data = await res.json();
    if (data?.thread?.id) {
      setThreads((prev) => [data.thread, ...prev.filter((t) => t.id !== data.thread.id)]);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (isBusy) return;
    const res = await fetch(`/api/communication/threads/${threadId}`, { method: 'DELETE' });
    if (!res.ok) return;
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      setMessages([]);
    }
  };

  const startNewChat = () => {
    if (isBusy) return;
    setActiveThreadId(null);
    setMessages([]);
    closeSidebarOnMobile();
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (isBusy) return;
    if (!input.trim() && attachments.length === 0) return;

    const currentInput = input.trim() || 'Bitte analysiere die angehängten Dateien.';
    const currentMode = mode;
    const currentAttachments = attachments;
    setInput('');
    adjustHeight(true);
    setAttachments([]);

    let threadId = activeThreadId;
    try {
      if (!threadId) {
        const newThread = await createThread(currentInput);
        threadId = newThread.id;
      }
    } catch (error) {
      console.error('Thread create failed:', error);
    }

    const localAttachments = currentAttachments.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      return {
        name: file.name,
        type: file.type || 'application/octet-stream',
        url,
        size: file.size,
        isLocal: true
      };
    });

    const messageId = Date.now().toString();
    const userMsg: Message = {
      id: messageId,
      role: 'user',
      content: currentInput,
      mode: currentMode,
      attachments: localAttachments.length > 0 ? localAttachments : undefined
    };
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);
    try {
      const uploadedAttachments = await uploadAttachments(currentAttachments);

      if (uploadedAttachments.length > 0) {
        setMessages(prev => prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const updatedAttachments = uploadedAttachments.map((attachment: StoredAttachment, index: number) => {
            const localAttachment = msg.attachments?.[index];
            if (localAttachment?.isLocal) {
              URL.revokeObjectURL(localAttachment.url);
              objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== localAttachment.url);
            }
            return {
              ...attachment,
              isLocal: false
            };
          });
          return { ...msg, attachments: updatedAttachments };
        }));
      }
      let endpoint = '/api/chat/contextual';
      let body: any = {
        message: currentInput,
        context: 'AI Kommunikation',
        pathname: '/communication',
        attachments: uploadedAttachments,
        threadId
      };

      if (currentMode !== 'chat') {
        endpoint = '/api/research';
        body = {
          query: currentInput,
          type: currentMode,
          attachments: uploadedAttachments,
          threadId
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      const assistantContent = data.response || data.answer || 'Keine Antwort erhalten.';
      const assistantSources = Array.isArray(data?.sources) ? data.sources as StoredSource[] : undefined;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        mode: currentMode,
        sources: assistantSources
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (threadId) {
        await persistMessages(threadId, [
          {
            role: 'user',
            content: currentInput,
            mode: currentMode,
            attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
          },
          {
            role: 'assistant',
            content: assistantContent,
            mode: currentMode,
            sources: assistantSources
          }
        ]);
      }
    } catch (_error) {
      setMessages(prev => prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        if (!msg.attachments?.length) return msg;
        return {
          ...msg,
          attachments: msg.attachments.map((attachment: MessageAttachment) => ({
            ...attachment,
            failed: true
          }))
        };
      }));
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Fehler bei der Anfrage.',
        mode: currentMode
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const hasMessages = messages.length > 0;
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;
  const sidebarContent = (
    <>
      <div className="flex items-center justify-between pl-8 pr-4 py-6 border-b border-white/10">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Chats</div>
          <div className="text-sm font-semibold text-white">Orion Archiv</div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={startNewChat}
            disabled={isBusy}
            className="text-white/50 hover:text-white hover:bg-white/5 rounded-full"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="text-white/50 hover:text-white hover:bg-white/5 rounded-full md:hidden"
          >
            <PanelRightClose className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pl-6 pr-4 py-3 space-y-2 custom-scrollbar">
        {isThreadsLoading && (
          <div className="flex items-center gap-2 text-xs text-white/50 px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Lade Chats...
          </div>
        )}
        {!isThreadsLoading && threads.length === 0 && (
          <div className="text-xs text-white/40 px-3 py-2">
            Noch keine Chats gespeichert.
          </div>
        )}
        {threads.map((thread) => (
          <div
            key={thread.id}
            role="button"
            tabIndex={0}
            onClick={() => !isBusy && loadThread(thread.id)}
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-4 py-3 transition cursor-pointer",
              thread.id === activeThreadId
                ? "bg-royal/20 border-royal/40 text-white"
                : "border-transparent bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">
                {thread.title || 'Neuer Chat'}
              </div>
              <div className="text-[10px] text-white/40">
                {formatThreadDate(thread.lastMessageAt || thread.createdAt)}
              </div>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteThread(thread.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-300 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="relative w-full h-screen bg-[#181818] text-white overflow-hidden">

        <div className="relative z-10 w-full h-full flex">
          {/* Main Chat Area */}
          <div className="flex-1 relative flex flex-col items-center md:pr-80">
          {/* Centered Title (Only when empty) */}
          {!hasMessages && (
            <div className="flex-1 w-full flex flex-col items-center justify-center">
              <div className="text-center animate-in fade-in zoom-in-95 duration-1000">
                <h1 className="text-5xl sm:text-6xl font-semibold text-white drop-shadow-2xl tracking-tighter">
                  Orion AI
                </h1>
                <p className="mt-4 text-royal/80 text-xl max-w-md mx-auto">
                  Build something amazing — start typing below.
                </p>
              </div>
            </div>
          )}

          {/* Messages Area */}
          {hasMessages && (
            <div 
              ref={scrollRef}
              className="w-full max-w-3xl flex-1 overflow-y-auto px-4 pt-24 pb-64 space-y-8 custom-scrollbar scroll-smooth"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-4 group transition-all duration-500 animate-in fade-in slide-in-from-bottom-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-[#2a2b2e] border border-[#3a3b3d] flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-royal" />
                    </div>
                  )}
                  
                  <div className={cn(
                    'max-w-[85%] text-white/90',
                    message.role === 'user' ? 'text-right' : 'text-left'
                  )}>
                    {message.mode && message.mode !== 'chat' && (
                      <div className={cn(
                        "mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase",
                        message.role === 'user' ? "text-royal/90" : "text-royal"
                      )}>
                        <Globe className="w-3 h-3" />
                        {message.mode}
                      </div>
                    )}

                    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/40">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {message.attachments.some((attachment: MessageAttachment) => isImageType(attachment.type)) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {message.attachments
                              .filter((attachment: MessageAttachment) => isImageType(attachment.type))
                              .map((attachment: MessageAttachment, index) => (
                                <a
                                  key={`${attachment.url}-${index}`}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative block overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:border-royal/60 transition"
                                >
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="h-28 w-full object-cover"
                                  />
                                  {attachment.failed && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[11px] text-red-300">
                                      Upload fehlgeschlagen
                                    </div>
                                  )}
                                </a>
                              ))}
                          </div>
                        )}

                        {message.attachments.some((attachment: MessageAttachment) => !isImageType(attachment.type)) && (
                          <div className="flex flex-wrap gap-2">
                            {message.attachments
                              .filter((attachment: MessageAttachment) => !isImageType(attachment.type))
                              .map((attachment: MessageAttachment, index) => (
                                <a
                                  key={`${attachment.name}-${index}`}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] transition",
                                    attachment.failed
                                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                                  )}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span className="truncate max-w-[160px]">{attachment.name}</span>
                                  {attachment.size && (
                                    <span className="text-white/40">{formatBytes(attachment.size)}</span>
                                  )}
                                  {attachment.failed && (
                                    <span className="text-red-300">×</span>
                                  )}
                                </a>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                        {message.sources.map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-white/40 hover:text-royal transition-colors"
                          >
                            <span className="text-royal/60">[{i + 1}]</span>
                            <span className="truncate">{source.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-[#2a2b2e] border border-[#3a3b3d] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white/40" />
                  </div>
                  )}
                </div>
              ))}
              {isLoadingState && (
                <div className="flex gap-4 justify-start animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#2a2b2e] border border-[#3a3b3d] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-royal" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-royal rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-royal rounded-full animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 bg-royal rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Section */}
          <div className={cn(
            "w-full max-w-3xl px-4 z-20 transition-all duration-700 ease-in-out",
            hasMessages ? "fixed bottom-10" : "mb-[15vh]"
          )}>
            <div className="relative bg-[#2b2d31] rounded-[2rem] border border-[#3a3b3d] shadow-2xl overflow-hidden group focus-within:border-white/40 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'chat' ? "Frage Orion..." :
                  mode === 'research' ? "Was soll ich recherchieren?" :
                  "Schreib mir..."
                }
                className="w-full px-6 py-6 resize-none border-none bg-transparent text-white text-base focus-visible:ring-0 placeholder:text-white/30 min-h-[60px]"
                style={{ overflow: "hidden" }}
              />

              <div className="flex items-center justify-between px-4 pb-4">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-white/40 hover:text-white hover:bg-white/5 rounded-full"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => imageInputRef.current?.click()}
                    className="text-white/40 hover:text-white hover:bg-white/5 rounded-full"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.txt,.csv,.json,.doc,.docx,.xls,.xlsx,.mp4,.mov,.webm"
                    onChange={(event) => addAttachments(event.target.files)}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,video/*"
                    onChange={(event) => addAttachments(event.target.files)}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Mode:</span>
                    <span className="text-[10px] font-bold text-royal uppercase">{mode}</span>
                  </div>
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={(!input.trim() && attachments.length === 0) || isBusy}
                    className={cn(
                      "h-12 w-12 rounded-full transition-all duration-300",
                      (!input.trim() && attachments.length === 0) || isBusy
                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                        : "bg-royal text-white hover:bg-royal/80 shadow-[0_0_20px_rgba(255,153,0,0.4)] scale-105 active:scale-95"
                    )}
                  >
                    <ArrowUpIcon className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <button
                    key={`${file.name}-${index}`}
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:border-white/30 hover:text-white transition"
                  >
                    <span className="truncate max-w-[160px]">{file.name}</span>
                    <span className="text-white/40">×</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Actions (Mode Selectors) */}
            {!hasMessages && (
              <div className="flex items-center justify-center flex-wrap gap-3 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {providerOptions.map((option) => (
                  <QuickAction
                    key={option.id}
                    icon={option.icon}
                    label={option.label}
                    active={mode === option.id}
                    onClick={() => setMode(option.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar (Desktop Right) */}
        <aside className="hidden md:flex fixed top-0 right-0 h-full w-80 shrink-0 flex-col bg-[#08090A] border-l border-white/5 z-40">
          {sidebarContent}
        </aside>

        {/* Sidebar (Mobile Left) */}
        <aside className={cn(
          "fixed top-16 left-0 h-[calc(100%-4rem)] w-[88%] max-w-sm shrink-0 flex flex-col bg-[#08090A] border-r border-white/5 transition-transform duration-300 z-40 md:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {sidebarContent}
        </aside>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed bottom-24 left-4 z-50 px-3 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-lg md:hidden flex items-center gap-2"
        >
          {isSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          <span className="text-[11px] font-bold uppercase tracking-widest">
            {activeThread?.title || 'Chats'}
          </span>
        </button>
      </div>
    </div>
  );
}
