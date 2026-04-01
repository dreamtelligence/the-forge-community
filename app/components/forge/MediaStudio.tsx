'use client';

import { useState, useEffect, useCallback } from 'react';
import { MediaAsset } from '@prisma/client';
import { MediaGeneratorModal } from '@/app/components/marketing/MediaGeneratorModal';
import { MediaAssetGrid } from '@/app/components/marketing/MediaAssetGrid';
import { VoiceGeneratorPanel } from '@/app/components/marketing/VoiceGeneratorPanel';
import { deleteAsset, getVentureMedia } from '@/app/actions/media';
import {
  LayoutGrid,
  Sparkles,
  Zap,
  User,
  Mic,
  BookOpen
} from 'lucide-react';
import { VeoStudio } from '@/app/components/marketing/VeoStudio';
import { NanoBananaStudio } from '@/app/components/marketing/NanoBananaStudio';
import { ForgeLab } from '@/app/components/marketing/ForgeLab';
import { AvatarStudio } from '@/app/components/marketing/AvatarStudio';
import { CameraPromptsTab } from '@/app/components/forge/CameraPromptsTab';

interface MediaStudioProps {
  ventureId: string;
  brandDNA?: any;
  initialTab?: string | null;
}

type Tab = 'library' | 'prompts' | 'generate' | 'veo' | 'voice' | 'lab' | 'avatar';
const TAB_VALUES: Tab[] = ['library', 'prompts', 'generate', 'veo', 'voice', 'lab', 'avatar'];

const resolveTab = (tab: string | null | undefined): Tab =>
  TAB_VALUES.includes(tab as Tab) ? (tab as Tab) : 'avatar';

export function MediaStudio({ ventureId, brandDNA, initialTab }: MediaStudioProps) {
  const [activeTab, setActiveTab] = useState<Tab>(() => resolveTab(initialTab));
  const [generatorPrefillPrompt, setGeneratorPrefillPrompt] = useState('');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [retentionInfo, setRetentionInfo] = useState<{
    currentTier: string;
    currentRetentionDays: number | null;
    tiers: { free: number; pro: number; enterprise: number };
  } | null>(null);

  const loadAssets = useCallback(async () => {
    try {
      const data = await getVentureMedia(ventureId);
      setAssets(data);
    } catch (e) {
      console.error('Failed to load assets', e);
    } finally {
      setLoading(false);
    }
  }, [ventureId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    const loadRetention = async () => {
      try {
        const res = await fetch('/api/media/retention');
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setRetentionInfo(data);
        }
      } catch {
        setRetentionInfo(null);
      }
    };
    loadRetention();
  }, []);

  const handleAssetCreated = () => {
    // Refresh assets to show new one
    loadAssets();
    // Optional: Switch to library to see it?
    // setActiveTab('library');
  };

  const handleUsePromptInGenerator = (prompt: string) => {
    setGeneratorPrefillPrompt(prompt);
    setActiveTab('generate');
  };

  const handleTogglePublic = async (assetId: string, nextPublic: boolean) => {
    try {
      const res = await fetch('/api/media/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, isPublic: nextPublic }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Aktion fehlgeschlagen.');
      }
      setAssets((prev) =>
        prev.map((asset) => (asset.id === assetId ? { ...asset, isPublic: data.isPublic } : asset))
      );
    } catch (error) {
      console.error('Failed to update visibility', error);
      alert('Sichtbarkeit konnte nicht geändert werden.');
    }
  };

  const handleToggleFavorite = async (assetId: string, nextFavorite: boolean) => {
    try {
      const res = await fetch('/api/media/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, isFavorite: nextFavorite }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Aktion fehlgeschlagen.');
      }
      setAssets((prev) =>
        prev.map((asset) => (asset.id === assetId ? { ...asset, isFavorite: data.isFavorite } : asset))
      );
    } catch (error) {
      console.error('Failed to update favorite', error);
      alert('Pin konnte nicht geändert werden.');
    }
  };

  if (loading) return <div className="p-12 text-center text-white/40">Lade Studio...</div>;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'library'
              ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Library
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'prompts'
              ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Prompts
        </button>
        <button
          onClick={() => setActiveTab('avatar')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'avatar'
              ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          Avatar Studio
        </button>
        <button
          onClick={() => setActiveTab('veo')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'veo'
              ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          Veo 3.1
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'generate'
              ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Generator
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'voice'
              ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Mic className="w-4 h-4" />
          AI Voice
        </button>
        <div className="w-px h-6 bg-white/10 mx-2" />
        <button
          onClick={() => setActiveTab('lab')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'lab'
              ? 'bg-[#FF9900] text-black shadow-lg shadow-[#FF9900]/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Forge Lab
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
              {retentionInfo?.currentRetentionDays === null ? (
                <span>
                  Deine Assets bleiben dauerhaft gespeichert. Pin schützt außerdem vor Cleanup.
                </span>
              ) : (
                <span>
                  Ungepinnte Assets werden nach {retentionInfo?.currentRetentionDays ?? 'X'} Tagen gelöscht.
                  {' '}Pin schützt dauerhaft.
                </span>
              )}
            </div>
            <MediaAssetGrid
              assets={assets}
              onDelete={async (id) => {
                try {
                  await deleteAsset(id);
                  await loadAssets();
                } catch (error) {
                  console.error('Failed to delete asset', error);
                  alert('Löschen fehlgeschlagen.');
                }
              }}
              onTogglePublic={handleTogglePublic}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        )}

        {activeTab === 'prompts' && (
          <CameraPromptsTab onUsePrompt={handleUsePromptInGenerator} />
        )}

        {activeTab === 'veo' && (
          <div className="space-y-8">
            <VeoStudio ventureId={ventureId} brandDNA={brandDNA} />
            <NanoBananaStudio ventureId={ventureId} />
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="h-[800px] border border-white/10 rounded-xl overflow-hidden">
            <MediaGeneratorModal
              isOpen={true}
              ventureId={ventureId}
              brandDNA={brandDNA}
              inline={true}
              initialPrompt={generatorPrefillPrompt}
              onAssetCreated={handleAssetCreated}
            />
          </div>
        )}

        {activeTab === 'voice' && (
          <VoiceGeneratorPanel
            ventureId={ventureId}
            brandDNA={brandDNA}
            onAssetCreated={handleAssetCreated}
          />
        )}

        {activeTab === 'lab' && (
          <ForgeLab ventureId={ventureId} brandDNA={brandDNA} />
        )}

        {activeTab === 'avatar' && (
          <AvatarStudio ventureId={ventureId} />
        )}
      </div>
    </div>
  );
}
