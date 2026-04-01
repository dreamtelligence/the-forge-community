'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { PostCard } from '@/app/components/marketing/PostCard';
import { TrendingUp, Target, DollarSign, Plus, ArrowLeft, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import { useAIContext } from '@/app/context/AIContext';

type TabType = 'overview' | 'content';

export default function CampaignDetailPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const campaignId = params.campaignId as string;
  const { setContext } = useAIContext();

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (campaign) {
      setContext(`Kampagne "${campaign.name}" - ${activeTab}. Hilf beim Optimieren der Kampagne.`);
    } else {
      setContext('Lade Kampagne...');
    }
  }, [campaign, activeTab, setContext]);

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ventures/${ventureId}/marketing/campaigns/${campaignId}`);
        if (res.ok) {
          setCampaign(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch campaign', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [ventureId, campaignId]);

  if (loading) return <div className="text-white p-8">Lade Kampagne...</div>;
  if (!campaign) return <div className="text-white p-8">Kampagne nicht gefunden.</div>;

  return (
    <StudioShell
      title={campaign.name}
      description="Kampagnen-Details & Content-Planung"
      icon={<TrendingUp className="w-6 h-6 text-[#FF9900]" />}
      headerAction={
         <Link 
           href={`/forge/${ventureId}/marketing/campaigns`}
           className="px-4 py-2 bg-white/5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
         >
            <ArrowLeft className="w-4 h-4" />
            Zurück
         </Link>
      }
    >
      <div className="space-y-8">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          {[
            { id: 'overview', label: 'Übersicht', icon: Target },
            { id: 'content', label: 'Content Posts', icon: LayoutTemplate },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-[#FF9900] text-black font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
           {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Main Info */}
                 <div className="col-span-2 glass-card p-8 rounded-2xl border border-white/10 space-y-6">
                    <div>
                       <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">Beschreibung</h3>
                       <p className="text-white/80 leading-relaxed">{campaign.description || 'Keine Beschreibung vorhanden.'}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                       <div>
                          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-1">Zielsetzung</h3>
                          <div className="flex items-center gap-2 text-white text-lg">
                             <Target className="w-5 h-5 text-[#FF9900]" />
                             {campaign.goal || 'Nicht definiert'}
                          </div>
                       </div>
                       <div>
                          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-1">Status</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/10 text-white">
                             {campaign.status}
                          </span>
                       </div>
                    </div>
                 </div>

                 {/* Sidebar Stats */}
                 <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl border border-white/10">
                       <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Zeitraum</h3>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-white/60">Start</span>
                             <span className="text-white font-mono">
                                {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : '-'}
                             </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-white/60">Ende</span>
                             <span className="text-white font-mono">
                                {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : '-'}
                             </span>
                          </div>
                       </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-white/10">
                       <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Budget</h3>
                       <div className="flex items-center gap-2 text-3xl font-instrument-serif text-white">
                          <DollarSign className="w-6 h-6 text-[#FF9900]" />
                          {campaign.budgetAmount ? campaign.budgetAmount.toLocaleString() : '0'}
                       </div>
                       <div className="mt-2 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FF9900] w-[45%]" />
                       </div>
                       <p className="text-xs text-white/40 mt-2 text-right">45% verbraucht (Simuliert)</p>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'content' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xl font-instrument-serif text-white">Geplanter Content</h3>
                    <Link 
                       href={`/forge/${ventureId}/marketing?campaignId=${campaignId}`}
                       className="flex items-center gap-2 px-4 py-2 bg-[#FF9900] text-black rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                       <Plus className="w-4 h-4" />
                       Content Generieren
                    </Link>
                 </div>

                 {(!campaign.posts || campaign.posts.length === 0) ? (
                    <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-4">
                       <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                          <LayoutTemplate className="w-8 h-8 text-white/20" />
                       </div>
                       <p className="text-white/40">Noch keine Posts für diese Kampagne erstellt.</p>
                       <Link 
                          href={`/forge/${ventureId}/marketing?campaignId=${campaignId}`}
                          className="text-[#FF9900] hover:underline text-sm font-bold"
                       >
                          Jetzt Content erstellen &rarr;
                       </Link>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 gap-4">
                       {campaign.posts.map((post: any) => (
                          <PostCard key={post.id} post={post} />
                       ))}
                    </div>
                 )}
              </div>
           )}

        </div>
      </div>
    </StudioShell>
  );
}
