'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, Factory, Globe, Plus, AlertCircle } from 'lucide-react';

interface AISuggestion {
  companyName: string;
  country: string;
  category: string;
  specialization: string;
  moq: string;
  notes: string;
}

interface AISourcingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ventureId: string;
  onSuccess: () => void;
}

export function AISourcingModal({ isOpen, onClose, ventureId, onSuccess }: AISourcingModalProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const startAISearch = async () => {
    setLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/ai-search`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.suppliers);
        setExplanation(data.explanation || null);
      } else {
        setError(data.error || 'KI-Recherche fehlgeschlagen');
      }
    } catch (_err) {
      setError('Netzwerkfehler bei der KI-Suche');
    } finally {
      setLoading(false);
    }
  };

  const saveSupplier = async (suggestion: AISuggestion) => {
    setSaving(suggestion.companyName);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: suggestion.companyName,
          country: suggestion.country,
          category: suggestion.category,
          specialization: suggestion.specialization,
          notes: suggestion.notes,
          moq: parseInt(suggestion.moq) || 0,
          tags: ['AI-Suggested']
        }),
      });

      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.companyName !== suggestion.companyName));
        onSuccess();
      }
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-3xl max-h-[95vh] sm:max-h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col"
        >
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-5 sm:p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#FF9900]/10 to-transparent rounded-t-[2rem] sm:rounded-t-[2.5rem]">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF9900] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF9900]/20 flex-shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-instrument-serif text-white truncate">Sourcing Match</h2>
                <p className="text-xs sm:text-sm text-white/40 truncate">Matcht echte Lieferanten aus deiner Datenbank</p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="flex-shrink-0 p-2 sm:p-2.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
              aria-label="Modal schließen"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white/60 hover:text-white" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div
            className="flex-1 overflow-y-auto modal-scroll-container custom-scrollbar p-5 sm:p-8"
            style={{ overscrollBehavior: 'contain' }}
            onWheel={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#FF9900] animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-white">Analysiere globale Märkte...</p>
                  <p className="text-sm text-white/40 italic">Wir suchen nach Herstellern, die zu deiner Brand DNA passen.</p>
                </div>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="grid gap-4">
                {suggestions.map((s, idx) => (
                  <motion.div
                    key={s.companyName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-[#FF9900]/30 transition-all flex justify-between items-center"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white group-hover:text-[#FF9900] transition-colors">{s.companyName}</h3>
                        <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold uppercase tracking-widest text-white/40">{s.category}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-white/60">
                        <div className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-[#FF9900]" /> {s.country}</div>
                        <div className="flex items-center gap-1.5"><Factory className="w-4 h-4 text-[#FF9900]" /> MOQ: {s.moq}</div>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed">{s.notes}</p>
                    </div>
                    <button
                      onClick={() => saveSupplier(s)}
                      disabled={saving === s.companyName}
                      className="ml-4 sm:ml-6 px-4 sm:px-6 py-2 sm:py-3 bg-white text-black rounded-xl font-bold text-xs sm:text-sm hover:bg-[#FF9900] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving === s.companyName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span className="hidden sm:inline">Übernehmen</span>
                      <span className="sm:hidden">+</span>
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-10 h-10 text-white/20" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-medium text-white mb-2">Bereit für die KI-Suche?</h3>
                  <p className="text-white/40 text-sm">
                    Wir matchen deine Brand DNA (Kategorie, Zielmarkt, Werte) mit echten Lieferanten aus deinem Netzwerk.
                  </p>
                </div>
                {error && (
                  <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm justify-center mx-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  onClick={startAISearch}
                  className="px-8 sm:px-10 py-3 sm:py-4 bg-[#FF9900] text-black rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:shadow-lg hover:shadow-[#FF9900]/20 active:scale-95 transition-all flex items-center gap-3 mx-auto group"
                >
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Matching starten
                </button>
              </div>
            )}
          </div>

          {/* Footer Info - Fixed */}
          {suggestions.length > 0 && (
            <div className="flex-shrink-0 p-4 sm:p-6 bg-white/[0.02] border-t border-white/5 text-center rounded-b-[2rem] sm:rounded-b-[2.5rem]">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/20">
                {explanation || 'Ergebnisse basieren auf deinem Forge Lieferanten-Directory.'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
