'use client';

import { useEffect, useState } from 'react';
import { Zap, Plus } from 'lucide-react';
import Link from 'next/link';

export function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Poll credits or fetch once. For now fetch once on mount.
    // In a real app, you might want to use SWR or React Query.
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (data.credits !== undefined) setCredits(data.credits);
        if (data.role === 'ADMIN') setIsAdmin(true);
      })
      .catch(err => console.error('Failed to load credits', err));
  }, []);

  if (credits === null && !isAdmin) return null;

  const displayCredits = isAdmin ? '∞' : credits ?? 0;
  const progress = isAdmin ? 100 : Math.min(((credits ?? 0) / 50) * 100, 100);
  const isLow = !isAdmin && (credits ?? 0) < 20;

  return (
    <div className="mx-6 mb-4 space-y-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">
          <div className="flex items-center gap-2">
            <Zap className={`w-3.5 h-3.5 ${isLow ? 'text-red-400' : 'text-[#FF9900]'}`} />
            <span>Energy</span>
          </div>
          <span className={`tracking-widest ${isLow ? 'text-red-400' : 'text-white/80'}`}>
            {displayCredits} <span className="text-white/30">/ ∞</span>
          </span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full ${isLow ? 'bg-red-400' : 'bg-[#FF9900]'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!isAdmin && (
        <Link
          href="/pricing"
          className="flex items-center justify-center gap-2 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.3em] text-[#FF9900] transition hover:bg-[#FF9900]/10 hover:border-[#FF9900]/30"
        >
          <Plus className="w-3 h-3" />
          Credits aufladen
        </Link>
      )}
    </div>
  );
}
