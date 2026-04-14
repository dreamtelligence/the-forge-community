'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Radar, Loader2, Sparkles, TrendingUp, Search, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface Trend {
  title: string;
  description: string;
  matchScore: number;
  reasoning: string;
  platform: 'tiktok' | 'amazon' | 'google' | 'general';
}

interface TrendReport {
  id: string;
  createdAt: string;
  data: {
    trends: Trend[];
    sources: { title: string; url: string }[];
  };
}

export default function TrendRadar() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  
  const [reports, setReports] = useState<TrendReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/trends`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/trends/generate`, {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 402) {
          setError('Nicht genug Credits (10 benötigt).');
        } else {
          setError(data.error || 'Scan fehlgeschlagen.');
        }
        return;
      }

      // Refresh list with new report
      await fetchReports();
    } catch (_err) {
      setError('Verbindungsfehler.');
    } finally {
      setGenerating(false);
    }
  };

  // Get the latest report to display
  const latestReport = reports[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radar className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Trend Radar 2026</h2>
          </div>
          <p className="text-sm text-white/60 max-w-xl">
            Unser AI-Agent scannt TikTok, Amazon und Google nach Produkten, die zu deiner Brand DNA passen und gerade viral gehen.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-90 disabled:opacity-50 transition-all"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? 'Scanning Market...' : 'Scan New Trends'}
          </button>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Cost: 10 Credits</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          Lade Trend-Daten...
        </div>
      ) : !latestReport ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
          <TrendingUp className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Noch keine Scans. Starte den Radar!</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 uppercase tracking-widest">
              Latest Scan: {new Date(latestReport.createdAt).toLocaleDateString()}
            </span>
            <span className="text-xs text-purple-400 font-mono">
              {latestReport.data.sources?.length || 0} Sources Analyzed
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {latestReport.data.trends.map((trend, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all hover:bg-white/[0.07]"
              >
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full border border-white/10">
                  <span className={`text-xs font-bold ${trend.matchScore > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {trend.matchScore}%
                  </span>
                  <span className="text-[10px] text-white/40">MATCH</span>
                </div>

                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2 block">
                    {trend.platform} Trend
                  </span>
                  <h3 className="text-xl font-bold text-white mb-2">{trend.title}</h3>
                  <p className="text-sm text-white/60 line-clamp-3 mb-4">
                    {trend.description}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-white/5 mb-6">
                  <p className="text-xs text-white/50 italic">
                    "{trend.reasoning}"
                  </p>
                </div>

                <div className="flex gap-2 mt-auto">
                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent(trend.title + ' supplier manufacturer')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    Find Supplier
                  </a>
                  <a 
                    href={`https://www.tiktok.com/search?q=${encodeURIComponent(trend.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center w-10 bg-white/5 hover:bg-[#ff0050]/20 hover:text-[#ff0050] text-white/40 py-2 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
