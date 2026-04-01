'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Eye, ShieldAlert, Loader2, RefreshCw, Globe, ExternalLink, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScanResult {
  competitorName: string;
  competitorUrl: string;
  changesDetected: boolean;
  changeSummary: string | null;
  scannedAt: string;
  data: {
    prices: number[];
    title: string;
  };
}

export default function CompetitorWatchdog() {
  const params = useParams();
  const ventureId = params.ventureId as string;

  const [snapshots, setSnapshots] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/watchdog/latest`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [ventureId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleManualScan = async () => {
    setScanning(true);
    setError('');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/watchdog/scan`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Scan fehlgeschlagen.');
        return;
      }

      await fetchSnapshots();
    } catch (_err) {
      setError('Verbindungsfehler.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FF9900]/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-[#FF9900]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Competitor Watchdog</h2>
            <p className="text-sm text-white/40 italic">Monitoring Active · Weekly Auto-Scan</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleManualScan}
            disabled={scanning}
            className="flex items-center gap-2 bg-[#FF9900] hover:brightness-110 text-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {scanning ? 'Scanning...' : 'Scan Now (5 Credits)'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          Synchronisiere Spion-Daten...
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
          <ShieldAlert className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Noch keine Analysen. Füge Konkurrenten in der Brand DNA hinzu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {snapshots.map((snap, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-2xl border transition-all ${
                snap.changesDetected ? 'bg-orange-500/5 border-orange-500/30' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{snap.competitorName}</h3>
                    {snap.changesDetected && (
                      <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                        CHANGE DETECTED
                      </span>
                    )}
                  </div>
                  <a 
                    href={snap.competitorUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-[#FF9900] hover:underline flex items-center gap-1 mb-4"
                  >
                    <Globe className="w-3 h-3" />
                    {snap.competitorUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {snap.changeSummary ? (
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                      {snap.changeSummary}
                    </div>
                  ) : (
                    <p className="text-sm text-white/40">Keine signifikanten Änderungen seit dem letzten Scan.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-8 min-w-[200px]">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Avg. Price</p>
                    <p className="text-xl font-mono text-white">
                      {snap.data.prices.length > 0 
                        ? `${(snap.data.prices.reduce((a, b) => a + b, 0) / snap.data.prices.length).toFixed(2)} €`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Last Scan</p>
                    <p className="text-sm text-white/60">
                      {new Date(snap.scannedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
