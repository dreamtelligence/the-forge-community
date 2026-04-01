'use client';

import { useState } from 'react';
import { Copy, Check, AlertTriangle, X } from 'lucide-react';

interface ShowApiKeyModalProps {
  apiKey: string;
  keyName: string;
  onClose: () => void;
}

export default function ShowApiKeyModal({ apiKey, keyName, onClose }: ShowApiKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-[#FF9900]/30 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF9900]/10 border border-[#FF9900]/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#FF9900]" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">API Key erstellt</h3>
              <p className="text-xs text-white/40">Dieser Key wird nur einmal angezeigt</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Speichere diesen Key jetzt. Aus Sicherheitsgründen können wir ihn nicht erneut anzeigen.
          </p>
        </div>

        <div className="bg-black/50 rounded-xl border border-white/10 p-4 mb-6">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">{keyName}</div>
          <code className="block text-sm text-[#FF9900] font-mono break-all">{apiKey}</code>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-4 rounded-xl bg-[#FF9900] text-black font-bold text-sm uppercase tracking-wider hover:bg-[#FF9900] transition-all flex items-center justify-center gap-2 mb-4"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Kopiert!' : 'Key kopieren'}
        </button>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5"
          />
          <span className="text-sm text-white/60">Ich habe den Key gespeichert</span>
        </label>

        <button
          onClick={onClose}
          disabled={!confirmed}
          className="w-full mt-6 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-all disabled:opacity-30"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}
