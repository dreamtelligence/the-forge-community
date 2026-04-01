'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { CampaignCard } from '@/app/components/marketing/CampaignCard';
import { AddCampaignModal } from '@/app/components/marketing/AddCampaignModal';
import { TrendingUp, Plus, BarChart3, Clock, Calendar } from 'lucide-react';
import { useAIContext } from '@/app/context/AIContext';

export default function CampaignsPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setContext('Marketing Campaigns Dashboard. Hilf dem User bei der Kampagnen-Planung und Analyse.');
  }, [setContext]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/campaigns`);
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(false);
    }
  }, [ventureId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Calculated Stats
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  const totalPosts = campaigns.reduce((acc, c) => acc + (c._count?.posts || 0), 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budgetAmount || 0), 0);

  return (
    <StudioShell
      title="Kampagnen-Manager"
      description="Plane und verwalte deine Marketing-Initiativen."
      icon={<TrendingUp className="w-6 h-6 text-[#FF9900]" />}
    >
      <div className="space-y-8">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold">Aktiv</p>
              <p className="text-xl sm:text-2xl font-instrument-serif text-white">{activeCampaigns}</p>
            </div>
          </div>
          <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF9900]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF9900]" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold">Posts</p>
              <p className="text-xl sm:text-2xl font-instrument-serif text-white">{totalPosts}</p>
            </div>
          </div>
          <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10 flex items-center gap-3 sm:gap-4 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold">Budget</p>
              <p className="text-xl sm:text-2xl font-instrument-serif text-white">€{totalBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-instrument-serif text-white">Alle Kampagnen</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF9900] text-black rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Neue Kampagne
            </button>
          </div>

          {loading ? (
             <div className="flex items-center justify-center h-64 text-white/40">
                <Clock className="w-6 h-6 animate-spin mr-2" />
                Lade Kampagnen...
             </div>
          ) : campaigns.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-instrument-serif text-white">Keine Kampagnen gefunden</h3>
              <p className="text-white/40 max-w-sm mx-auto">
                Starte deine erste Marketing-Kampagne, um Posts zu planen und Ziele zu verfolgen.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF9900] text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Jetzt starten
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  id={campaign.id}
                  ventureId={ventureId}
                  name={campaign.name}
                  status={campaign.status}
                  postsCount={campaign._count?.posts || 0}
                  budget={campaign.budgetAmount}
                  startDate={campaign.startDate}
                  endDate={campaign.endDate}
                  goal={campaign.goal}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddCampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCampaigns}
        ventureId={ventureId}
      />
    </StudioShell>
  );
}
