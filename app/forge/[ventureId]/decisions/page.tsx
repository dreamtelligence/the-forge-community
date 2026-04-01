'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { CreateDecisionModal } from '@/app/components/forge/CreateDecisionModal';
import { Gavel, Clock, User as UserIcon, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAIContext } from '@/app/context/AIContext';

interface Decision {
  id: string;
  question: string;
  description?: string;
  type: string;
  status: string;
  options: string[];
  deadline?: string;
  responses: any[];
  createdBy?: {
    name: string;
    image: string;
  };
  createdAt: string;
}

export default function DecisionsPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();
  
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/decisions`);
      if (res.ok) {
        setDecisions(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch decisions', err);
    } finally {
      setLoading(false);
    }
  }, [ventureId]);

  useEffect(() => {
    setContext('Decision Hall - Abstimmungen, Roadmap-Entscheide und Team-Votes.');
  }, [setContext]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const handleVote = async (decisionId: string, choice: string) => {
    setVotingFor(decisionId);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/decisions/${decisionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice })
      });
      
      if (res.ok) {
        await fetchDecisions(); // Refresh to show new results
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      console.error('Failed to vote', err);
      alert('Fehler beim Abstimmen');
    } finally {
      setVotingFor(null);
    }
  };

  const calculatePercentage = (decision: Decision, option: string) => {
    if (decision.responses.length === 0) return 0;
    const count = decision.responses.filter(r => r.choice === option).length;
    return Math.round((count / decision.responses.length) * 100);
  };

  const getVoteCount = (decision: Decision, option: string) => {
    return decision.responses.filter(r => r.choice === option).length;
  };

  return (
    <StudioShell
      title="Decision Hall"
      description="Demokratische Abstimmungen für dein Squad"
      icon={<Gavel className="w-6 h-6 text-[#FF9900]" />}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
           <h2 className="text-2xl font-instrument-serif text-white">Aktuelle Abstimmungen</h2>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-[#FF9900] text-black rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
           >
             <Plus className="w-4 h-4" />
             Neue Abstimmung
           </button>
        </div>

        {loading ? (
          <div className="text-white/40 text-center py-12">Lade Abstimmungen...</div>
        ) : decisions.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Gavel className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-instrument-serif text-white">Keine offenen Abstimmungen</h3>
            <p className="text-white/40 max-w-sm mx-auto">
              Starte eine neue Abstimmung, um Entscheidungen im Team zu treffen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decisions.map((decision) => (
              <div key={decision.id} className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col h-full relative group hover:border-[#FF9900]/30 transition-all">
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {decision.status === 'open' ? (
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                      Offen
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-white/10 text-white/40">
                      Geschlossen
                    </span>
                  )}
                </div>

                {/* Author & Time */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                     {decision.createdBy?.image ? (
                        <img src={decision.createdBy.image} alt={decision.createdBy.name} className="w-full h-full object-cover" />
                     ) : (
                        <UserIcon className="w-4 h-4 text-white/40" />
                     )}
                  </div>
                  <div>
                    <p className="text-xs text-white font-bold">{decision.createdBy?.name || 'Unbekannt'}</p>
                    <p className="text-[10px] text-white/40">
                      vor {formatDistanceToNow(new Date(decision.createdAt), { addSuffix: false, locale: de })}
                    </p>
                  </div>
                </div>

                {/* Question */}
                <h3 className="text-lg font-bold text-white mb-2">{decision.question}</h3>
                {decision.description && (
                  <p className="text-sm text-white/60 mb-6 line-clamp-2">{decision.description}</p>
                )}

                {/* Deadline Info */}
                {decision.deadline && (
                  <div className="flex items-center gap-2 text-xs text-[#FF9900] mb-4 bg-[#FF9900]/5 px-3 py-2 rounded-lg w-fit">
                    <Clock className="w-3 h-3" />
                    <span>Endet {formatDistanceToNow(new Date(decision.deadline), { addSuffix: true, locale: de })}</span>
                  </div>
                )}

                {/* Options / Results */}
                <div className="space-y-3 flex-1">
                  {decision.type === 'YES_NO' ? (
                     // Transform Yes/No to options if not already
                     ['Ja', 'Nein'].map(opt => (
                        <VoteOption 
                           key={opt}
                           decision={decision} 
                           option={opt} 
                           onVote={() => handleVote(decision.id, opt)}
                           loading={votingFor === decision.id}
                           percentage={calculatePercentage(decision, opt)}
                           count={getVoteCount(decision, opt)}
                        />
                     ))
                  ) : (
                     decision.options.map(opt => (
                        <VoteOption 
                           key={opt}
                           decision={decision} 
                           option={opt} 
                           onVote={() => handleVote(decision.id, opt)}
                           loading={votingFor === decision.id}
                           percentage={calculatePercentage(decision, opt)}
                           count={getVoteCount(decision, opt)}
                        />
                     ))
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-white/40">
                   <span>{decision.responses.length} Stimmen</span>
                   <span>Quorum: 50%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateDecisionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDecisions}
        ventureId={ventureId}
      />
    </StudioShell>
  );
}

function VoteOption({ decision, option, onVote, loading, percentage }: any) {
   
   return (
      <div className="relative group/option">
         {/* Background Bar */}
         <div 
            className="absolute inset-0 bg-white/5 rounded-lg overflow-hidden"
         >
            <div 
               className="h-full bg-[#FF9900]/20 transition-all duration-500"
               style={{ width: `${percentage}%` }}
            />
         </div>

         <button
            onClick={onVote}
            disabled={decision.status !== 'open' || loading}
            className="relative w-full flex justify-between items-center px-4 py-3 text-sm z-10 hover:bg-white/5 transition-colors rounded-lg"
         >
            <span className="font-medium text-white">{option}</span>
            <div className="flex items-center gap-2">
               <span className="text-white/60 text-xs">{percentage}%</span>
               {/* {isVoted && <CheckCircle2 className="w-3 h-3 text-[#FF9900]" />} */}
            </div>
         </button>
      </div>
   );
}
