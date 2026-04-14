'use client';

import { useState } from 'react';
import { Search, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface ResearchResult {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  provider: string;
}

export default function ResearchAssistant() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState('');
  const [type, setType] = useState<'general' | 'supplier' | 'factcheck'>('general');

  const handleResearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type }),
      });

      if (!response.ok) {
        throw new Error('Research failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (_err) {
      setError('Fehler bei der Recherche. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const placeholders = {
    general: 'z.B. "Aktuelle Marketing Trends 2025"',
    supplier: 'z.B. "Bio-Baumwolle Hersteller Portugal"',
    factcheck: 'z.B. "Lieferzeit China 4 Wochen"',
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-black border border-white/10 rounded-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#FF9900]/20 flex items-center justify-center">
          <Search className="w-5 h-5 text-[#FF9900]" />
        </div>
        <div>
          <h3 className="text-white font-semibold">AI Research Assistant</h3>
          <p className="text-white/50 text-sm">Powered by Brave Search + Gemini</p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="flex gap-2 mb-4">
        {(['general', 'supplier', 'factcheck'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              type === t
                ? 'bg-[#FF9900] text-black font-medium'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {t === 'general' && 'Allgemein'}
            {t === 'supplier' && 'Lieferanten'}
            {t === 'factcheck' && 'Fact Check'}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholders[type]}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#FF9900] outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
        />
        <button
          onClick={handleResearch}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-[#FF9900] text-black font-medium rounded-xl hover:bg-[#FF9900]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Recherchiere...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Suchen
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2 mb-6">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Answer */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white/50 text-sm">
                Antwort via {result.provider === 'gemini' ? 'Gemini' : 'Groq'}
              </span>
            </div>
            <div className="text-white leading-relaxed whitespace-pre-wrap">
              {result.answer}
            </div>
          </div>

          {/* Sources */}
          <div>
            <h4 className="text-white/50 text-sm font-medium mb-3">Quellen</h4>
            <div className="space-y-2">
              {result.sources.map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-[#FF9900] font-mono text-sm">[{i + 1}]</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate group-hover:text-[#FF9900] transition-colors">
                      {source.title}
                    </div>
                    <div className="text-white/40 text-sm truncate">{source.url}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/30 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
