'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, X, Zap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAdvisor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bereit, Operator. Wie kann ich die Effizienz deines Squads steigern?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (_error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Verbindung zum Forge-Mainframe unterbrochen. Bitte erneut versuchen.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 z-40 flex items-center gap-3 px-6 py-4 bg-white text-black rounded-2xl shadow-2xl hover:bg-[var(--accent)] transition-all duration-500 border border-white/10 group ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Zap className="w-5 h-5 text-black group-hover:fill-current" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">KI Berater</span>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] glass-card rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white/[0.03] p-6 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                  <Bot className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Forge Intelligenz</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Protokoll Aktiv</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/20 hover:text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-black/20">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${ 
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-black font-bold'
                        : 'bg-white/[0.03] border border-white/5 text-white/80'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                    ))}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                    <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 bg-white/[0.01]">
              <div className="relative flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Eingabe Protokoll-Query..."
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--accent)] outline-none transition-all placeholder:text-white/10"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-3 bg-[var(--accent)] text-black rounded-xl hover:brightness-110 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[8px] font-bold text-center text-white/10 mt-3 uppercase tracking-widest">
                KI kann Halluzinationen erzeugen. Überprüfe alle Protokolle.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
