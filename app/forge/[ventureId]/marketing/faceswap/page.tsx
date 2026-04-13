'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { AIInfluencerNav } from '@/app/components/marketing/AIInfluencerNav';
import { ArrowLeft, Upload, Video, User, Zap, CheckCircle2, AlertCircle, Loader2, Play, Download } from 'lucide-react';
import { FACESWAP_MODELS } from '@/lib/media-models';
import { useAIContext } from '@/app/context/AIContext';
import { cn } from '@/lib/utils';
import { CreditsTopUpModal } from '@/app/components/billing/CreditsTopUpModal';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'succeeded' | 'failed';

export default function FaceSwapPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();

  const [tierLabel, setTierLabel] = useState<'Free' | 'Pro' | 'Enterprise'>('Pro');
  const [tierReady, setTierReady] = useState(false);

  const [model, setModel] = useState('live-portrait');
  const [swapCondition, setSwapCondition] = useState<'all' | 'first'>('all');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);

  const [status, setStatus] = useState<JobStatus>('idle');
  const [, setPredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContext('AI Avatar Studio - Hybrid Character & Background Swap.');
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [setContext]);

  useEffect(() => {
    let mounted = true;
    const loadTier = async () => {
      try {
        const billingRes = await fetch('/api/billing/summary')
          .then(res => (res.ok ? res.json() : null))
          .catch(() => null);

        if (!mounted) return;
        const tier = billingRes?.effectiveSubscriptionTier ?? billingRes?.subscriptionTier;
        if (tier === 'enterprise') {
          setTierLabel('Enterprise');
        } else if (tier === 'pro') {
          setTierLabel('Pro');
        } else {
          setTierLabel('Free');
        }
      } finally {
        if (mounted) setTierReady(true);
      }
    };

    loadTier();
    return () => {
      mounted = false;
    };
  }, []);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('Video ist zu groß (max 50MB)');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleFaceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Bild ist zu groß (max 10MB)');
      return;
    }

    setFaceFile(file);
    setFacePreview(URL.createObjectURL(file));
    setError(null);
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
      setError(err?.message || 'Download fehlgeschlagen.');
    }
  };

  const startFaceSwap = async () => {
    if (!faceFile || !videoFile) {
      setError('Bitte lade Video und Referenzbild hoch');
      return;
    }

    setStatus('uploading');
    setError(null);
    setOutputUrl(null);
    setPredictionId(null);

    try {
      const formData = new FormData();
      if (videoFile) formData.append('video', videoFile);
      formData.append('face', faceFile);
      formData.append('model', model);
      formData.append('swapCondition', swapCondition);

      const res = await fetch(`/api/ventures/${ventureId}/marketing/faceswap`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
        }
        throw new Error(data?.error || 'Avatar fehlgeschlagen');
      }

      if (data.outputUrl) {
        setOutputUrl(data.outputUrl);
        setStatus('succeeded');
        return;
      }

      if (data.predictionId) {
        setPredictionId(data.predictionId);
        setStatus('processing');
        startPolling(data.predictionId);
        return;
      }

      throw new Error('Kein Ergebnis erhalten');
    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'Avatar fehlgeschlagen');
    }
  };

  const startPolling = (id: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ventures/${ventureId}/marketing/faceswap?predictionId=${id}`);
        const data = await res.json();

        if (data.status === 'succeeded') {
          setStatus('succeeded');
          setOutputUrl(data.outputUrl);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else if (data.status === 'failed' || data.status === 'canceled') {
          setStatus('failed');
          setError(data.error || 'Avatar fehlgeschlagen');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  const reset = () => {
    setVideoFile(null);
    setFaceFile(null);
    setVideoPreview(null);
    setFacePreview(null);
    setStatus('idle');
    setPredictionId(null);
    setOutputUrl(null);
    setError(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const modelConfig = FACESWAP_MODELS[model];
  const canStart = Boolean(faceFile && videoFile && status === 'idle' && tierReady);

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing/faceswap`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
    <StudioShell
      title="AI Avatar & Character Studio"
      description="Animate characters or swap faces mit Replicate-Modellen."
      icon={<User className="w-5 h-5" />}
    >
      {/* Back Navigation */}
      <div className="mb-8">
        <Link
          href={`/forge/${ventureId}/marketing`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Marketing Studio
        </Link>
      </div>

      <AIInfluencerNav ventureId={ventureId} />

      {/* Model Selection */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Engine</h3>
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF9900]">{tierLabel} Tier</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {Object.entries(FACESWAP_MODELS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setModel(key)}
              disabled={status !== 'idle'}
              className={cn(
                'rounded-2xl border p-6 text-left transition-all',
                model === key
                  ? 'border-[#FF9900] bg-[#FF9900]/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10',
                status !== 'idle' && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-base font-bold text-white">{config.label}</div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#FF9900]">
                  <Zap className="w-3.5 h-3.5" />
                  {config.cost}
                </div>
              </div>
              <p className="text-sm text-white/50">{config.description}</p>
            </button>
          ))}
        </div>

        {model === 'lucataco-faceswap' && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Swap Mode</label>
            <div className="flex gap-3">
              <button
                onClick={() => setSwapCondition('all')}
                disabled={status !== 'idle'}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  swapCondition === 'all'
                    ? 'bg-[#FF9900] text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10',
                  status !== 'idle' && 'opacity-50 cursor-not-allowed'
                )}
              >
                Alle Faces
              </button>
              <button
                onClick={() => setSwapCondition('first')}
                disabled={status !== 'idle'}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  swapCondition === 'first'
                    ? 'bg-[#FF9900] text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10',
                  status !== 'idle' && 'opacity-50 cursor-not-allowed'
                )}
              >
                Nur erste Person
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Video Upload */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Video className="w-4 h-4" />
            {model === 'live-portrait' ? 'Motion Video (Driving)' : 'Target Video'}
          </h3>
          <div
            onClick={() => status === 'idle' && videoInputRef.current?.click()}
            className={cn(
              'relative rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-8 text-center transition-all cursor-pointer hover:border-[#FF9900]/50 hover:bg-white/10',
              videoPreview && 'border-solid border-[#FF9900]/30',
              status !== 'idle' && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={handleVideoSelect}
              className="hidden"
              disabled={status !== 'idle'}
            />
            {videoPreview ? (
              <video src={videoPreview} controls className="w-full rounded-xl" />
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-white/40" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Video hochladen</div>
                  <div className="text-sm text-white/40">MP4 oder MOV (max 50MB)</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Face Upload */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
            <User className="w-4 h-4" />
            {model === 'live-portrait' ? 'Model Image (Source Portrait)' : 'Reference Image'}
          </h3>
          <div
            onClick={() => status === 'idle' && faceInputRef.current?.click()}
            className={cn(
              'relative rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-8 text-center transition-all cursor-pointer hover:border-[#FF9900]/50 hover:bg-white/10',
              facePreview && 'border-solid border-[#FF9900]/30',
              status !== 'idle' && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              ref={faceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFaceSelect}
              className="hidden"
              disabled={status !== 'idle'}
            />
            {facePreview ? (
              <img src={facePreview} alt="Face preview" className="w-full rounded-xl" />
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-white/40" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Referenzbild hochladen</div>
                  <div className="text-sm text-white/40">JPG, PNG oder WebP (max 10MB)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">{error}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={startFaceSwap}
          disabled={!canStart}
          className={cn(
            'flex items-center gap-2 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all',
            canStart
              ? 'bg-[#FF9900] text-black hover:bg-[#FF9900] shadow-lg shadow-[#FF9900]/20'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          )}
        >
          {status === 'uploading' || status === 'processing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {status === 'uploading' ? 'Lade hoch...' : 'Verarbeite...'}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {`Avatar Swap starten (${modelConfig?.cost ?? 0} Credits)`}
            </>
          )}
        </button>

        {status !== 'idle' && (
          <button
            onClick={reset}
            className="px-6 py-4 rounded-full text-sm font-semibold text-white/60 hover:text-white transition-colors"
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {/* Status Progress */}
      {status !== 'idle' && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-4">
            {status === 'uploading' && (
              <>
                <Loader2 className="w-5 h-5 text-[#FF9900] animate-spin" />
                <span className="text-white font-semibold">Dateien werden hochgeladen...</span>
              </>
            )}
            {status === 'processing' && (
              <>
                <Loader2 className="w-5 h-5 text-[#FF9900] animate-spin" />
                <span className="text-white font-semibold">Avatar wird verarbeitet... (kann bis zu 5 Minuten dauern)</span>
              </>
            )}
            {status === 'succeeded' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-white font-semibold">Avatar erfolgreich erstellt!</span>
              </>
            )}
            {status === 'failed' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-white font-semibold">Avatar fehlgeschlagen</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Output Video */}
      {outputUrl && (
        <div className="rounded-2xl border border-[#FF9900]/30 bg-[#FF9900]/5 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Ergebnis</h3>
            <button
              onClick={() => handleDownload(outputUrl, 'faceswap-result.mp4')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF9900] text-black font-semibold text-sm hover:bg-[#FF9900] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
          <video src={outputUrl} controls className="w-full rounded-xl" />
        </div>
      )}

      {/* Info Box */}
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Tipps für beste Ergebnisse</h3>
        <ul className="space-y-2 text-sm text-white/60">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <span>Nutze ein scharfes Referenzbild (Person + Umgebung klar sichtbar)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <span>Verwende ruhige, gut beleuchtete Videos (min. 720p)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <span>Bei mehreren Personen: "Nur erste Person" für gezieltes Swapping (PRO)</span>
          </li>
        </ul>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Demo</h3>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
          <iframe
            src="https://www.youtube.com/embed/xAICmrzPJjA?si=q8b0Yj7ZUv3gxy8k"
            title="YouTube video player"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </StudioShell>
    </>
  );
}
