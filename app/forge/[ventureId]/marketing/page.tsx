'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { CreditsTopUpModal } from '@/app/components/billing/CreditsTopUpModal';
import { AIGenerator } from '@/app/components/forge/AIGenerator';
import { MediaStudio } from '@/app/components/forge/MediaStudio'; // NEW
import { DocumentExport } from '@/app/components/forge/DocumentExport';
import { Megaphone, Share2, LayoutTemplate, Mail, TrendingUp, PenTool, Image as ImageIcon, Eye } from 'lucide-react';
import type { BrandDNA } from '@prisma/client';
import { useAIContext } from '@/app/context/AIContext';
import CompetitorWatchdog from '@/app/components/marketing/CompetitorWatchdog';

const CONTENT_TYPES = [
  { id: 'instagram', name: 'Instagram Post', icon: <Share2 className="w-4 h-4" /> },
  { id: 'linkedin', name: 'LinkedIn Beitrag', icon: <Share2 className="w-4 h-4" /> },
  { id: 'twitter', name: 'X / Twitter Thread', icon: <Share2 className="w-4 h-4" /> },
  { id: 'blog', name: 'Blog Artikel', icon: <LayoutTemplate className="w-4 h-4" /> },
  { id: 'email', name: 'Newsletter / E-Mail', icon: <Mail className="w-4 h-4" /> },
  { id: 'ad_google', name: 'Google Ad', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'ad_meta', name: 'Meta (FB/Insta) Ad', icon: <Megaphone className="w-4 h-4" /> },
];

export default function MarketingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const ventureId = params.ventureId as string;
  const campaignId = searchParams.get('campaignId');
  const initialMediaTab = searchParams.get('tab');
  const { setContext } = useAIContext();

  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Workspace Mode: 'media' (Images/Video), 'copy' (Text) or 'intelligence' (Competitors)
  const [workspace, setWorkspace] = useState<'copy' | 'media' | 'intelligence'>('media');

  // Text Generation State
  const [contentType, setContentType] = useState(CONTENT_TYPES[0].id);
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  useEffect(() => {
    setContext('Marketing Studio - Content Generator.');
  }, [setContext]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandRes, campaignRes] = await Promise.all([
          fetch(`/api/ventures/${ventureId}/brand-dna`),
          campaignId ? fetch(`/api/ventures/${ventureId}/marketing/campaigns/${campaignId}`) : Promise.resolve(null)
        ]);

        if (brandRes.ok) {
          const data = await brandRes.json();
          setBrandDNA(data);
        }

        if (campaignRes && campaignRes.ok) {
          const campaignData = await campaignRes.json();
          setActiveCampaign(campaignData);
          setTopic(campaignData.name + (campaignData.goal ? ` - Ziel: ${campaignData.goal}` : '')); 
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ventureId, campaignId]);

  const handleGenerateCopy = async (): Promise<string> => {
    if (!topic) {
      alert('Bitte gib ein Thema an.');
      return '';
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          topic,
          additionalInstructions: instructions
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGeneratedContent(data.content);
        if (campaignId) await saveToCampaign(data.content);
        return data.content;
      } else {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
        }
        alert('Fehler: ' + (data?.error || 'Generierung fehlgeschlagen.'));
        return '';
      }
    } catch (error) {
      console.error('Generation failed', error);
      alert('Ein Fehler ist aufgetreten.');
      return '';
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToCampaign = async (content: string) => {
    try {
      await fetch(`/api/ventures/${ventureId}/marketing/campaigns/${campaignId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic,
          content: content,
          contentType: contentType,
          status: 'DRAFT'
        })
      });
    } catch (err) {
      console.error('Failed to save to campaign', err);
    }
  };

  if (loading) return <div className="text-white p-8">Lade Studio...</div>;

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
    <StudioShell
      title="Marketing Studio"
      description="Deine Kommandozentrale für Content & Media."
      icon={<Megaphone className="w-6 h-6 text-[#FF9900]" />}
      brandDNA={brandDNA}
      aiProvider="gemini"
      headerAction={
        <Link
          href={`/forge/${ventureId}/marketing/campaigns`}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#FF9900] text-black rounded-lg text-xs sm:text-sm font-bold hover:opacity-90 active:scale-95 transition-all w-full sm:w-auto whitespace-nowrap"
        >
          <TrendingUp className="w-4 h-4 flex-shrink-0" />
          <span className="hidden xs:inline">Kampagnen Manager</span>
          <span className="xs:hidden">Kampagnen</span>
        </Link>
      }
    >
      {/* Workspace Switcher */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="bg-white/5 rounded-full p-1 flex items-center border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setWorkspace('media')}
            className={`px-3 sm:px-6 py-2 rounded-full text-[10px] sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${
              workspace === 'media' 
                ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Media
          </button>
          <button
            onClick={() => setWorkspace('copy')}
            className={`px-3 sm:px-6 py-2 rounded-full text-[10px] sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${
              workspace === 'copy' 
                ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Copywriter
          </button>
          <button
            onClick={() => setWorkspace('intelligence')}
            className={`px-3 sm:px-6 py-2 rounded-full text-[10px] sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${
              workspace === 'intelligence' 
                ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20' 
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Intel
          </button>
        </div>
      </div>

      {workspace === 'media' ? (
        <MediaStudio ventureId={ventureId} brandDNA={brandDNA} initialTab={initialMediaTab} />
      ) : workspace === 'intelligence' ? (
        <CompetitorWatchdog />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left: Configuration */}
          <div className="glass-card p-5 sm:p-6 rounded-xl border border-white/10 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
               <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Text Konfiguration</h2>
               {activeCampaign && (
                  <span className="text-[10px] sm:text-xs font-bold text-[#FF9900] bg-[#FF9900]/10 px-2 py-1 rounded border border-[#FF9900]/30 truncate max-w-full">
                     Kampagne: {activeCampaign.name}
                  </span>
               )}
            </div>

            {/* Content Type Selector */}
            <div>
              <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-2 sm:mb-3">
                Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id)}
                    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-[10px] sm:text-sm transition-all ${
                      contentType === type.id
                        ? 'bg-[#FF9900]/10 border-[#FF9900] text-white'
                        : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className={contentType === type.id ? 'text-[#FF9900]' : ''}>
                      {type.icon}
                    </div>
                    <span className="truncate">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Input */}
            <div>
              <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
                Thema
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Worüber willst du schreiben?"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
                Details
              </label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Besondere Wünsche? Tonalität? Keywords?"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Right: Output */}
          <div className="space-y-4">
            <AIGenerator
              onGenerate={handleGenerateCopy}
              isGenerating={isGenerating}
              generatedContent={generatedContent}
              brandContext={brandDNA ? {
                brandName: brandDNA.brandName,
                toneOfVoice: brandDNA.toneOfVoice || undefined
              } : undefined}
              buttonText="Text Generieren"
              placeholder="Wähle links ein Format, um zu starten..."
            />

            {generatedContent && (
              <div className="flex justify-end">
                 <DocumentExport 
                   content={generatedContent} 
                   filename={`marketing-${contentType}-${new Date().toISOString().split('T')[0]}`} 
                   format="txt"
                 />
              </div>
            )}
          </div>
        </div>
      )}
    </StudioShell>
    </>
  );
}
