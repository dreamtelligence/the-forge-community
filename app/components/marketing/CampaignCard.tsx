'use client';

import Link from 'next/link';
import { Calendar, Target, ArrowRight, FileText } from 'lucide-react';

interface CampaignCardProps {
  id: string;
  ventureId: string;
  name: string;
  status: string;
  postsCount: number;
  budget?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  goal?: string | null;
}

export function CampaignCard({ id, ventureId, name, status, postsCount, budget, startDate, endDate, goal }: CampaignCardProps) {
  
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'COMPLETED': return 'text-[#FF9900] border-[#FF9900]/30 bg-[#FF9900]/10';
      case 'PAUSED': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      default: return 'text-white/60 border-white/10 bg-white/5';
    }
  };

  return (
    <Link href={`/forge/${ventureId}/marketing/campaigns/${id}`}>
      <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10 hover:border-[#FF9900]/50 transition-all group h-full flex flex-col justify-between">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase border ${getStatusColor(status)}`}>
                {status}
              </span>
              {goal && (
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1">
                  <Target className="w-3 h-3" /> {goal}
                </span>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg sm:text-xl font-instrument-serif text-white group-hover:text-[#FF9900] transition-colors line-clamp-2 leading-tight">
              {name}
            </h3>
            
            <div className="mt-3 sm:mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-white/60">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF9900]" />
                {postsCount} Posts
              </div>
              {budget && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-white/40">Budget:</span>
                  €{budget.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/40">
            <Calendar className="w-3 h-3" />
            <span className="truncate">
              {startDate ? new Date(startDate).toLocaleDateString() : 'TBD'} 
              {' - '}
              {endDate ? new Date(endDate).toLocaleDateString() : 'TBD'}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
