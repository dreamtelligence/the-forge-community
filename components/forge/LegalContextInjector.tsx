'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LegalContextInjectorProps {
  ventureId: string;
  templateName?: string;
}

export function LegalContextInjector({ ventureId, templateName }: LegalContextInjectorProps) {
  const [loading, setLoading] = useState(true);
  const [contextData, setContextData] = useState<{ 
    brandDNA: any;
    status: string;
    suggestions: string[];
  } | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await fetch(`/api/ventures/${ventureId}/brand-dna`);
        if (res.ok) {
          const brandDNA = await res.json();
          
          // Get venture status (mocking for now or extending API)
          // For now we assume a status based on BrandDNA completion
          const status = brandDNA?.brandName ? 'IDEATION' : 'PRE-SEED';

          // Call AI to get "Magic Suggestions"
          const aiRes = await fetch('/api/chat/contextual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Generiere 3 kurze, prägnante rechtliche Empfehlungen für einen "${templateName || 'Vertrag'}" basierend auf dieser Brand DNA: ${brandDNA?.brandName}, ${brandDNA?.productCategory}, Fokus: ${brandDNA?.values?.join(', ')}. Status: ${status}.`,
              context: 'Legal Studio Context Injector',
              pathname: '/legal/contracts/new'
            })
          });

          const aiData = await aiRes.json();
          const suggestions = aiData.response?.split('\n').filter((s: string) => s.trim().length > 0).slice(0, 3) || [];

          setContextData({
            brandDNA,
            status,
            suggestions
          });
        }
      } catch (err) {
        console.error('Context Injector Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [ventureId, templateName]);

  if (loading) return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl animate-pulse flex items-center gap-3">
      <Loader2 className="w-4 h-4 text-[#FF9900] animate-spin" />
      <span className="text-xs text-white/40">Analysiere Brand DNA für rechtliche Klauseln...</span>
    </div>
  );

  if (!contextData) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border border-[#FF9900]/30 bg-[#FF9900]/5 rounded-2xl p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-12 h-12 text-[#FF9900]" />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-10 h-10 bg-[#FF9900]/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-[#FF9900]" />
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              Context Injector
              <span className="text-[10px] bg-[#FF9900] text-black px-1.5 py-0.5 rounded font-black">AI ACTIVE</span>
            </h3>
            <p className="text-xs text-white/60 mt-1">
              Basierend auf deiner Brand DNA <span className="text-[#FF9900] font-bold">"{contextData.brandDNA?.brandName || 'Unbekannt'}"</span> 
              und dem Status <span className="text-white font-bold">{contextData.status}</span> schlage ich folgende Klauseln vor:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contextData.suggestions.map((suggestion, i) => (
              <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] text-white/80 leading-relaxed italic">
                {suggestion.replace(/^\d+\.\s*/, '')}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[9px] text-[#FF9900]/60 font-bold uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3 h-3" />
            Admin Shield: Klauseln werden automatisch in den Entwurf injiziert
          </div>
        </div>
      </div>
    </motion.div>
  );
}
