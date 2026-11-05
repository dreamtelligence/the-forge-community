'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Sparkles, Upload, Loader2, AlertTriangle, Trash2, Download, Share2, ZoomIn } from 'lucide-react';
import { MediaLightbox } from '@/components/media/MediaLightbox';
import { CreditsTopUpModal } from '@/components/billing/CreditsTopUpModal';

interface NanoBananaStudioProps {
  ventureId: string;
}

type NanoMode = 'image-to-image' | 'text-to-image';
type NanoModel = 'google/nano-banana' | 'google/nano-banana-pro';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square' },
  { id: '4:5', label: '4:5 Portrait' },
  { id: '9:16', label: '9:16 Story' },
  { id: '16:9', label: '16:9 Wide' },
  { id: '3:2', label: '3:2 Classic' },
];

export function NanoBananaStudio({ ventureId }: NanoBananaStudioProps) {
  const [mode, setMode] = useState<NanoMode>('image-to-image');
  const [model, setModel] = useState<NanoModel>('google/nano-banana');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].id);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<
    { id?: string; url: string; isPublic?: boolean }[]
  >([]);
  const [pendingPublish, setPendingPublish] = useState<Record<string, boolean>>({});
  const [lightboxAsset, setLightboxAsset] = useState<{ url: string; type: string } | null>(null);

  const previews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).slice(0, 3);
    setImageFiles(next);
    if (files.length > 3) {
      setErrorMessage('Maximal 3 Referenzbilder erlaubt.');
    } else {
      setErrorMessage('');
    }
  };

  const clearImages = () => {
    setImageFiles([]);
  };

  const handleGenerate = async () => {
    setErrorMessage('');
    setGeneratedImages([]);

    if (mode === 'text-to-image' && !prompt.trim()) {
      setErrorMessage('Bitte gib einen Prompt an.');
      return;
    }

    if (mode === 'image-to-image' && imageFiles.length === 0) {
      setErrorMessage('Bitte lade 1-3 Referenzbilder hoch.');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('mode', mode);
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('aspectRatio', aspectRatio);

      if (mode === 'image-to-image') {
        imageFiles.forEach((file) => formData.append('images', file));
      }

      const res = await fetch(`/api/ventures/${ventureId}/marketing/nano-banana`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
          throw new Error(data?.error || 'Nicht genug Credits.');
        }
        throw new Error(data?.error || 'Generierung fehlgeschlagen.');
      }

      const assets = Array.isArray(data?.assets)
        ? data.assets
            .map((asset: any) => ({
              id: asset?.id,
              url: asset?.url,
              isPublic: asset?.isPublic,
            }))
            .filter((asset: any) => Boolean(asset.url))
        : [];

      if (!assets.length) {
        throw new Error('Kein Bild erhalten.');
      }

      setGeneratedImages(assets);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string, fallbackName: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Download fehlgeschlagen.');
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = (() => {
        try {
          const parsed = new URL(url);
          const name = parsed.pathname.split('/').pop();
          return name || fallbackName;
        } catch {
          return fallbackName;
        }
      })();
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Download fehlgeschlagen.');
    }
  };

  const handlePublishAsset = async (assetId: string | undefined, nextPublic: boolean) => {
    if (!assetId || pendingPublish[assetId]) return;
    setPendingPublish((prev) => ({ ...prev, [assetId]: true }));
    setErrorMessage('');
    try {
      const res = await fetch('/api/media/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, isPublic: nextPublic }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Veröffentlichen fehlgeschlagen.');
      }
      setGeneratedImages((prev) =>
        prev.map((asset) =>
          asset.id === assetId ? { ...asset, isPublic: data.isPublic } : asset
        )
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Veröffentlichen fehlgeschlagen.');
    } finally {
      setPendingPublish((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    }
  };

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-instrument-serif text-white">Nano Banana Studio</h3>
          <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-bold">
            Google AI Studio · Referenzbilder oder Text
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModel('google/nano-banana')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              model === 'google/nano-banana'
                ? 'bg-[#FF9900] text-black'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            Nano Banana 2.1
          </button>
          <button
            onClick={() => setModel('google/nano-banana-pro')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              model === 'google/nano-banana-pro'
                ? 'bg-[#FF9900] text-black'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            Nano Banana Pro
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('image-to-image')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'image-to-image'
                ? 'bg-[#FF9900] text-black'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            Referenzbilder
          </button>
          <button
            onClick={() => setMode('text-to-image')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'text-to-image'
                ? 'bg-[#FF9900] text-black'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            Text → Image
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="space-y-5">
          {mode === 'image-to-image' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold">
                  Referenzbilder (1-3)
                </label>
                {imageFiles.length > 0 && (
                  <button
                    onClick={clearImages}
                    className="text-xs text-white/40 hover:text-white flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Entfernen
                  </button>
                )}
              </div>
              <label className="flex flex-col items-center justify-center border border-dashed border-white/20 rounded-xl p-6 text-white/50 cursor-pointer hover:border-white/40 hover:text-white transition-all">
                <Upload className="w-5 h-5 mb-2" />
                <span className="text-xs uppercase tracking-widest font-bold">Bilder hochladen</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-white/10">
                      <img src={src} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-widest font-bold">
              Prompt
            </label>
            <textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Beschreibe den Look, Stil und das gewünschte Ergebnis..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-widest font-bold">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    aspectRatio === ratio.id
                      ? 'bg-[#FF9900]/10 border border-[#FF9900] text-white'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="relative w-full px-5 py-3 bg-[#FF9900] text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 overflow-hidden"
          >
            {isGenerating && (
              <span className="absolute inset-0 bg-gradient-to-r from-[#FF9900]/40 via-[#F6D98A]/60 to-[#FF9900]/40 animate-pulse" />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  Generiere
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-black/80 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-black/80 animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-black/80 animate-bounce" style={{ animationDelay: '240ms' }} />
                  </span>
                </span>
              ) : (
                'Nano Banana starten'
              )}
            </span>
          </button>
          {isGenerating && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#FF9900]">
              Rendering läuft
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF9900] animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF9900] animate-pulse" style={{ animationDelay: '140ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF9900] animate-pulse" style={{ animationDelay: '280ms' }} />
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-widest font-bold">
            <ImageIcon className="w-4 h-4" />
            Output
          </div>
          {generatedImages.length === 0 ? (
            isGenerating ? (
              <div className="flex flex-col items-center justify-center py-6 h-full min-h-[400px]">
                <div className="relative rounded-3xl border border-[#FF9900]/30 bg-black/40 overflow-hidden w-full max-w-xl shadow-[0_0_80px_rgba(255,153,0,0.15)] transition-all duration-700">
                  <div className={`w-full relative transition-all duration-500 ${
                    aspectRatio === '16:9' ? 'aspect-video' :
                    aspectRatio === '9:16' ? 'aspect-[9/16]' :
                    aspectRatio === '1:1' ? 'aspect-square' :
                    aspectRatio === '4:5' ? 'aspect-[4/5]' :
                    aspectRatio === '3:2' ? 'aspect-[3/2]' :
                    'aspect-square'
                  }`}>
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,153,0,0.25),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,153,0,0.2),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.12),transparent_45%)] animate-pulse" />
                    </div>
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <div className="relative scale-125">
                        <Sparkles className="w-10 h-10 text-[#FF9900] animate-pulse" />
                        <div className="absolute inset-0 animate-ping">
                          <Sparkles className="w-10 h-10 text-[#FF9900] opacity-30" />
                        </div>
                      </div>
                      <div className="text-center space-y-2 px-6">
                        <div className="text-sm font-black text-white uppercase tracking-widest">
                          Nano Banana erschafft deine Visuals...
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-3">
                          <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0s_infinite]" />
                          <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
                          <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-black/90 backdrop-blur-xl border-t border-white/10">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
                        <span className="text-white/60 uppercase tracking-widest font-black">
                          Nano Banana Pro · Detail Engine
                        </span>
                      </div>
                      <span className="text-[#FF9900] font-bold tabular-nums">
                        Est: 30-60s
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[260px] flex items-center justify-center border border-dashed border-white/10 rounded-xl text-white/30 text-sm">
                Keine Bilder generiert.
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {generatedImages.map((asset, idx) => {
                const isPublic = Boolean(asset.isPublic);
                const isPublishing = asset.id ? Boolean(pendingPublish[asset.id]) : false;
                return (
                  <div
                    key={asset.url}
                    className="relative group rounded-xl overflow-hidden border border-white/10 cursor-zoom-in"
                    onClick={() => setLightboxAsset({ url: asset.url, type: 'image' })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setLightboxAsset({ url: asset.url, type: 'image' });
                      }
                    }}
                  >
                    <img src={asset.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/70 px-2 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setLightboxAsset({ url: asset.url, type: 'image' });
                        }}
                        className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white"
                      >
                        <ZoomIn className="h-3 w-3" />
                        Ansehen
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePublishAsset(asset.id, !isPublic);
                          }}
                          disabled={!asset.id || isPublishing}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold transition-all ${
                            isPublic
                              ? 'bg-[#FF9900]/20 text-[#FF9900]'
                              : 'bg-white/10 text-white'
                          } ${isPublishing ? 'opacity-60' : ''}`}
                        >
                          <Share2 className="h-3 w-3" />
                          {isPublic ? 'Öffentlich' : 'Veröffentlichen'}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDownload(asset.url, `nano-banana-${idx + 1}.png`);
                          }}
                          className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <MediaLightbox
        open={Boolean(lightboxAsset)}
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
      />
    </div>
    </>
  );
}
