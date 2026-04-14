'use client';

import { useEffect, useState, useCallback } from 'react';
import { toggleVote, getRoadmapItems } from '@/app/actions';
import { ArrowUp, Zap } from 'lucide-react';

interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  votes: number;
  hasVoted: boolean;
}

export function RoadmapWidget() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const data = await getRoadmapItems();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch roadmap", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleVote = async (id: string) => {
    setItems(current => 
      current.map(item => 
        item.id === id 
          ? { ...item, votes: item.hasVoted ? item.votes - 1 : item.votes + 1, hasVoted: !item.hasVoted }
          : item
      )
    );

    try {
      await toggleVote(id);
    } catch (error) {
      console.error("Vote failed", error);
      setItems(current => 
        current.map(item => 
          item.id === id 
            ? { ...item, votes: item.hasVoted ? item.votes + 1 : item.votes - 1, hasVoted: !item.hasVoted }
            : item
        )
      );
    }
  };

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center min-h-[300px]">
      <div className="w-12 h-12 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mb-6" />
      <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.4em] animate-pulse">Initialisiere Protokolle...</p>
    </div>
  );

  return (
    <div className="relative">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3 h-3 text-[var(--accent)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent)]">Live Priority System</span>
          </div>
          <h3 className="text-3xl font-instrument-serif text-white">Squad Roadmap</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
           <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Aktiv</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Keine Einträge für deinen Squad gefunden.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="group flex items-center gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[var(--accent)]/30 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <button 
                onClick={() => handleVote(item.id)}
                className={`relative z-10 flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-all duration-500 ${
                  item.hasVoted 
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:border-[var(--accent)] hover:text-white'
                }`}
              >
                <ArrowUp className={`w-5 h-5 mb-0.5 transition-transform duration-500 ${item.hasVoted ? 'scale-110' : 'group-hover:-translate-y-1'}`} />
                <span className="text-xs font-black">{item.votes}</span>
              </button>

              <div className="flex-1 relative z-10">
                <h4 className="font-instrument-serif text-xl text-white group-hover:text-[var(--accent)] transition-colors duration-500">{item.title}</h4>
                <p className="text-[10px] text-white/30 mt-1 uppercase tracking-wider leading-relaxed">{item.description}</p>
              </div>

              <div className="relative z-10">
                 <span className={`text-[8px] font-black px-3 py-1 rounded-full border uppercase tracking-[0.2em] ${
                   item.status === 'IN_PROGRESS' ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 
                   item.status === 'DONE' ? 'border-green-500/20 bg-green-500/10 text-green-500' :
                   'border-white/10 text-white/20'
                 }`}>
                   {item.status === 'IN_PROGRESS' ? 'LÄUFT' : item.status === 'DONE' ? 'FERTIG' : 'GEPLANT'}
                 </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}