'use client';

import { useState } from 'react';
import { Copy, Trash2, Check } from 'lucide-react';
import type { ApiKeyListItem } from '@/lib/api-keys/types';

interface ApiKeyCardProps {
  apiKey: ApiKeyListItem;
  onRevoke: (id: string) => Promise<void>;
  onUpdate?: (updatedKey: ApiKeyListItem) => void;
}

export default function ApiKeyCard({ apiKey, onRevoke }: ApiKeyCardProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.keyPrefix + '...');
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!confirm('Bist du sicher? Dieser Key wird sofort deaktiviert.')) return;
    setIsRevoking(true);
    try {
      await onRevoke(apiKey.id);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#FF9900]/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-white">{apiKey.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded ${apiKey.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {apiKey.isActive ? 'Aktiv' : 'Deaktiviert'}
            </span>
          </div>
          
          <code className="text-sm text-white/50 font-mono bg-black/30 px-2 py-1 rounded">
            {apiKey.keyPrefix}...
          </code>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {apiKey.scopes.map((scope) => (
              <span key={scope} className="text-[9px] px-2 py-1 rounded-full bg-white/5 text-white/40">
                {scope}
              </span>
            ))}
          </div>
          
          <p className="text-[10px] text-white/30 mt-3">
            Zuletzt verwendet: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString() : 'Nie'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
            title="Kopieren"
          >
            {showCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleRevoke}
            disabled={isRevoking || !apiKey.isActive}
            className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all disabled:opacity-30"
            title="Deaktivieren"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
