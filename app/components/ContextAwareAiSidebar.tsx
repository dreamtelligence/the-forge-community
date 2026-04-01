'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, ChevronRight, Loader2, ExternalLink, Search, Globe, CheckCircle, Factory, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIContext } from '@/app/context/AIContext';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

type ChatMode = 'chat' | 'research' | 'supplier' | 'factcheck';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mode?: ChatMode;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

const modes: { id: ChatMode; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: 'chat', 
    label: 'Chat', 
    icon: <Bot className="w-4 h-4" />, 
    description: 'Standard AI-Chat'
  },
  { 
    id: 'research', 
    label: 'Recherche', 
    icon: <Search className="w-4 h-4" />, 
    description: 'Web-Recherche mit AI'
  },
  { 
    id: 'supplier', 
    label: 'Lieferanten', 
    icon: <Factory className="w-4 h-4" />, 
    description: 'Supplier-Recherche'
  },
  { 
    id: 'factcheck', 
    label: 'Faktencheck', 
    icon: <CheckCircle className="w-4 h-4" />, 
    description: 'Aussagen überprüfen'
  },
];

export default function ContextAwareAiSidebar() {
  const { isSidebarOpen, setSidebarOpen, context } = useAIContext();
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hallo! Ich sehe, du bist im Bereich "${context}". Wie kann ich dir hier helfen?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('chat');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  // Update welcome message when context changes
  useEffect(() => {
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: `**Kontext gewechselt:** ${context}\n\nBereit zur Unterstützung.` }
    ]);
  }, [context]);

  // Close mode selector / attachment menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
        setShowModeSelector(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSidebarOpen]);

  const addAttachments = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async () => {
    if (attachments.length === 0) return [];
    const formData = new FormData();
    attachments.forEach((file) => formData.append('files', file));
    const res = await fetch('/api/chat/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Upload fehlgeschlagen.');
    }
    return Array.isArray(data?.attachments) ? data.attachments : [];
  };

  const sendMessage = async () => {
    if (isLoading) return;
    if (!input.trim() && attachments.length === 0) return;

    const attachmentNote = attachments.length
      ? `\n\nAnhänge: ${attachments.map((file) => file.name).join(', ')}`
      : '';
    const base = input.trim() || 'Anhang';
    const userMsg = `${base}${attachmentNote}`;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, mode }]);
    setIsLoading(true);

    try {
      const uploadedAttachments = await uploadAttachments();
      let endpoint = '/api/chat/contextual';
      let body: any = {
        message: userMsg,
        context: context,
        pathname: pathname,
        attachments: uploadedAttachments
      };

      // Use research API for specific modes
      if (mode === 'research' || mode === 'supplier' || mode === 'factcheck') {
        endpoint = '/api/research';
        body = {
          query: userMsg,
          type: mode,
          attachments: uploadedAttachments
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      
      // Format response with sources if available
      const responseContent = data.response || data.answer;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responseContent,
        mode,
        sources: data.sources
      }]);
      setAttachments([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler bei der Verbindung zum AI-Service.';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: message
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  const currentMode = modes.find(m => m.id === mode);

  return (
    <>
      {/* Toggle Button (only visible if sidebar is closed) */}
      {!isSidebarOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-3 px-4 py-3 bg-[#FF9900] text-black rounded-full shadow-lg hover:brightness-110 transition-all"
        >
          <Bot className="w-6 h-6" />
          <span className="font-bold text-xs uppercase tracking-widest hidden md:block">AI Assistant</span>
        </motion.button>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-80 md:w-[450px] bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF9900]/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#FF9900]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Forge AI</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest truncate max-w-[200px]">
                    {context}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${ 
                      msg.role === 'user'
                        ? 'bg-[#FF9900] text-black font-medium rounded-br-none'
                        : 'bg-white/5 border border-white/5 text-white/90 rounded-bl-none'
                    }`}
                  >
                    {/* Mode Badge for user messages */}
                    {msg.role === 'user' && msg.mode && msg.mode !== 'chat' && (
                      <div className="flex items-center gap-1 mb-2 opacity-70">
                        {modes.find(m => m.id === msg.mode)?.icon}
                        <span className="text-[10px] uppercase tracking-wider">
                          {modes.find(m => m.id === msg.mode)?.label}
                        </span>
                      </div>
                    )}
                    
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="space-y-3">
                        {/* Mode indicator for assistant */}
                        {msg.mode && msg.mode !== 'chat' && (
                          <div className="flex items-center gap-2 text-[10px] text-[#FF9900] uppercase tracking-wider mb-2">
                            <Globe className="w-3 h-3" />
                            Web-Recherche durchgeführt
                          </div>
                        )}
                        
                        <div className="prose prose-invert prose-sm max-w-none 
                          prose-headings:text-white prose-headings:font-bold prose-headings:text-sm prose-headings:mb-2 prose-headings:mt-4
                          prose-p:text-white/80 prose-p:my-2
                          prose-strong:text-[#FF9900] prose-strong:font-bold
                          prose-ul:list-disc prose-ul:pl-4 prose-ul:my-2
                          prose-ol:list-decimal prose-ol:pl-4 prose-ol:my-2
                          prose-li:text-white/70 prose-li:my-1
                          prose-a:text-[#FF9900] prose-a:underline hover:prose-a:text-white transition-colors
                        ">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ _node, ...props }) => {
                                const isInternal = props.href && props.href.startsWith('/');
                                if (isInternal) {
                                  return (
                                    <Link href={props.href as string} className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-xs no-underline hover:bg-white/20 transition-colors border border-white/5 text-[#FF9900]">
                                      <ExternalLink className="w-3 h-3" />
                                      {props.children}
                                    </Link>
                                  );
                                }
                                return <a {...props} target="_blank" rel="noopener noreferrer" />;
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/10">
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Quellen</p>
                            <div className="space-y-1">
                              {msg.sources.map((source, i) => (
                                <a
                                  key={i}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs text-white/60 hover:text-[#FF9900] transition-colors"
                                >
                                  <span className="text-[#FF9900]">[{i + 1}]</span>
                                  <span className="truncate">{source.title}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl rounded-bl-none flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-[#FF9900] animate-spin" />
                    <span className="text-xs text-white/40">
                      {mode === 'chat' ? 'Forge AI analysiert...' : 'Recherchiere im Web...'}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              {/* Mode Selector */}
              <div className="relative mb-3" ref={modeSelectorRef}>
                <button
                  onClick={() => setShowModeSelector(!showModeSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span className="text-[#FF9900]">{currentMode?.icon}</span>
                  <span>{currentMode?.label}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${showModeSelector ? 'rotate-90' : ''}`} />
                </button>

                {/* Mode Dropdown */}
                <AnimatePresence>
                  {showModeSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      {modes.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setMode(m.id);
                            setShowModeSelector(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                            mode === m.id ? 'bg-[#FF9900]/10 border-l-2 border-[#FF9900]' : ''
                          }`}
                        >
                          <span className={mode === m.id ? 'text-[#FF9900]' : 'text-white/50'}>
                            {m.icon}
                          </span>
                          <div>
                            <div className={`text-sm font-medium ${mode === m.id ? 'text-white' : 'text-white/70'}`}>
                              {m.label}
                            </div>
                            <div className="text-[10px] text-white/40">
                              {m.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={3}
                    placeholder={
                      mode === 'research' ? 'Was soll ich recherchieren?' :
                      mode === 'supplier' ? 'Welche Lieferanten suchen?' :
                      mode === 'factcheck' ? 'Welche Aussage prüfen?' :
                      'Frag mich etwas...'
                    }
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]/50 outline-none transition-all placeholder:text-white/20 resize-none"
                  />

                  <div className="absolute left-2 bottom-2 flex items-center gap-2">
                    <div className="relative" ref={attachmentMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowAttachmentMenu((prev) => !prev)}
                        className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                        title="Anhänge hinzufügen"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {showAttachmentMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden z-50"
                          >
                            <label className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-xs text-white/70 hover:bg-white/5">
                              Bild anhängen
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  addAttachments(e.target.files);
                                  e.currentTarget.value = '';
                                  setShowAttachmentMenu(false);
                                }}
                              />
                            </label>
                            <label className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-xs text-white/70 hover:bg-white/5">
                              CSV/Excel anhängen
                              <input
                                type="file"
                                accept=".csv,.xls,.xlsx"
                                className="hidden"
                                onChange={(e) => {
                                  addAttachments(e.target.files);
                                  e.currentTarget.value = '';
                                  setShowAttachmentMenu(false);
                                }}
                              />
                            </label>
                            <label className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-xs text-white/70 hover:bg-white/5">
                              Datei anhängen
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  addAttachments(e.target.files);
                                  e.currentTarget.value = '';
                                  setShowAttachmentMenu(false);
                                }}
                              />
                            </label>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && attachments.length === 0)}
                    className="absolute right-2 bottom-2 p-1.5 bg-[#FF9900] text-black rounded-lg hover:brightness-110 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <span
                      key={`${file.name}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] text-white/60"
                    >
                      {file.name}
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-white/40 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-white/30 text-center mt-3 uppercase tracking-widest font-medium">
                Shift + Enter für neue Zeile
              </p>
              <p className="text-[10px] text-white/20 text-center mt-3 uppercase tracking-widest font-medium">
                {mode === 'chat' ? 'Powered by Gemini 2.0' : 'Powered by Gemini 2.0 + Brave Search'} 
                • Admin Shield Active
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
