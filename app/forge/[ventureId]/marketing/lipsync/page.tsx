'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { AIInfluencerNav } from '@/app/components/marketing/AIInfluencerNav';
import { ArrowLeft, Upload, Video, Mic2, CheckCircle2, AlertCircle, Loader2, Play, Download, Zap, Sparkles } from 'lucide-react';
import { LIPSYNC_MODELS } from '@/lib/media-models';
import { useAIContext } from '@/app/context/AIContext';
import { cn } from '@/lib/utils';
import { CreditsTopUpModal } from '@/app/components/billing/CreditsTopUpModal';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'succeeded' | 'failed';
type LipSyncMode = 'preview' | 'final';

type ElevenVoice = {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
};

type ElevenModel = {
  model_id?: string;
  modelId?: string;
  id?: string;
  name?: string;
  description?: string;
};

export default function LipSyncPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();

  const [isPaid, setIsPaid] = useState(false);
  const [tierLabel, setTierLabel] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');
  const [tierReady, setTierReady] = useState(false);

  const [mode, setMode] = useState<LipSyncMode>('preview');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');

  const [voices, setVoices] = useState<ElevenVoice[]>([]);
  const [models, setModels] = useState<ElevenModel[]>([]);
  const [voiceId, setVoiceId] = useState('');
  const [modelId, setModelId] = useState('');
  const [script, setScript] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState('');

  const [status, setStatus] = useState<JobStatus>('idle');
  const [, setPredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContext('AI Influencer Studio - Lip Sync.');
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
        const paid = Boolean(billingRes?.hasPlatformAccess);

        setIsPaid(paid);
        if (!paid) {
          setTierLabel('Free');
        } else if (tier === 'enterprise') {
          setTierLabel('Enterprise');
        } else {
          setTierLabel('Pro');
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

  useEffect(() => {
    if (mode === 'final' && !isPaid) {
      setMode('preview');
    }
  }, [mode, isPaid]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 120 * 1024 * 1024) {
      setError('Video ist zu groß (max 120MB)');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('Audio ist zu groß (max 20MB)');
      return;
    }

    setAudioFile(file);
    setAudioUrl('');
    setAudioPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleDownload = async (url: string, fallbackName: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download fehlgeschlagen.');
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

  const loadVoiceMeta = async () => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Stimmen konnten nicht geladen werden.');
      setVoices(Array.isArray(data?.voices) ? data.voices : []);
      setModels(Array.isArray(data?.models) ? data.models : []);

      const profileRes = await fetch(`/api/ventures/${ventureId}/marketing/voice/profile`, { method: 'GET' });
      const profile = await profileRes.json().catch(() => ({}));
      if (profileRes.ok && profile?.profile) {
        if (profile.profile.voiceId) setVoiceId(profile.profile.voiceId);
        if (profile.profile.modelId) setModelId(profile.profile.modelId);
      }
    } catch (err: any) {
      setTtsError(err.message || 'Stimmen konnten nicht geladen werden.');
    }
  };

  const generateTts = async () => {
    if (!script.trim()) {
      setTtsError('Bitte gib ein Script ein.');
      return;
    }
    setTtsError('');
    setTtsLoading(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script.trim(),
          voiceId: voiceId || undefined,
          modelId: modelId || undefined,
          originTag: 'lipsync'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'TTS fehlgeschlagen.');
      setAudioUrl(data?.asset?.url || '');
      setAudioFile(null);
      setAudioPreviewUrl(data?.asset?.url || null);
    } catch (err: any) {
      setTtsError(err.message || 'TTS fehlgeschlagen.');
    } finally {
      setTtsLoading(false);
    }
  };

  const startLipSync = async () => {
    if (!videoFile) {
      setError('Bitte lade ein Target Video hoch');
      return;
    }
    if (!audioFile && !audioUrl) {
      setError('Bitte lade Audio hoch oder generiere Voice.');
      return;
    }

    setStatus('uploading');
    setError(null);
    setOutputUrl(null);
    setPredictionId(null);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      if (audioFile) formData.append('audio', audioFile);
      if (audioUrl) formData.append('audioUrl', audioUrl);
      formData.append('mode', mode);

      const res = await fetch(`/api/ventures/${ventureId}/marketing/lipsync`, {
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
        throw new Error(data?.error || 'Lip-Sync fehlgeschlagen');
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
      setError(err.message || 'Lip-Sync fehlgeschlagen');
    }
  };

  const startPolling = (id: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ventures/${ventureId}/marketing/lipsync?predictionId=${id}`);
        const data = await res.json();

        if (data.status === 'succeeded') {
          setStatus('succeeded');
          setOutputUrl(data.outputUrl);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else if (data.status === 'failed' || data.status === 'canceled') {
          setStatus('failed');
          setError(data.error || 'Lip-Sync fehlgeschlagen');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 3000);
  };

  const reset = () => {
    setVideoFile(null);
    setAudioFile(null);
    setAudioUrl('');
    setVideoPreview(null);
    setAudioPreviewUrl(null);
    setStatus('idle');
    setPredictionId(null);
    setOutputUrl(null);
    setError(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const canStart = Boolean(videoFile && (audioFile || audioUrl) && status === 'idle' && tierReady);
  const modelConfig = LIPSYNC_MODELS[mode];

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing/lipsync`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
    <StudioShell
      title="AI Influencer Studio"
      description="Lip-Sync für UGC, Ads & Talking-Head Content."
      icon={<Mic2 className="w-5 h-5" />}
    >
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

      <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Best Practice</h3>
        <ul className="space-y-2 text-sm text-white/60">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <span>Nutze ein ruhiges Talking-Head Video mit klarer Gesichtsdarstellung.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <span>Audio sauber aufnehmen (kein Echo, moderates Sprechtempo).</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <span>Base-Video kannst du im Media Studio (Image → Video) erzeugen.</span>
          </li>
        </ul>
      </div>

      {/* Mode Selection */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Qualität</h3>
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF9900]">{tierLabel} Tier</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {(['preview', 'final'] as LipSyncMode[]).map((key) => {
            const cfg = LIPSYNC_MODELS[key];
            const disabled = key === 'final' && !isPaid;
            return (
              <button
                key={key}
                onClick={() => !disabled && setMode(key)}
                disabled={disabled || status !== 'idle'}
                className={cn(
                  'rounded-2xl border p-6 text-left transition-all',
                  mode === key
                    ? 'border-[#FF9900] bg-[#FF9900]/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10',
                  (disabled || status !== 'idle') && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-base font-bold text-white">{cfg.label}</div>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#FF9900]">
                    <Zap className="w-3.5 h-3.5" />
                    {cfg.cost}
                  </div>
                </div>
                <p className="text-sm text-white/50">{cfg.description}</p>
                {disabled && <p className="text-xs text-white/40 mt-3">Pro erforderlich</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Video className="w-4 h-4" />
            Target Video
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
                  <div className="text-sm text-white/40">MP4 oder MOV (max 120MB)</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Mic2 className="w-4 h-4" />
            Audio / Script
          </h3>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">Audio Upload</label>
              <div
                onClick={() => status === 'idle' && audioInputRef.current?.click()}
                className={cn(
                  'mt-2 rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-sm text-white/70 cursor-pointer hover:border-[#FF9900]/50',
                  status !== 'idle' && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/webm,audio/x-wav"
                  onChange={handleAudioSelect}
                  className="hidden"
                  disabled={status !== 'idle'}
                />
                {audioFile ? audioFile.name : 'Audio auswählen (MP3/WAV/OGG/M4A)'}
              </div>
            </div>

            <div className="text-xs text-white/40 uppercase tracking-widest">oder TTS</div>

            <div className="space-y-3">
              <button
                onClick={loadVoiceMeta}
                className="text-xs text-white/60 hover:text-white inline-flex items-center gap-2"
              >
                <Sparkles className="w-3 h-3" />
                Stimmen laden
              </button>
              {voices.length > 0 && (
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/40"
                >
                  <option value="">Stimme wählen</option>
                  {voices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              )}
              {models.length > 0 && (
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/40"
                >
                  <option value="">Model wählen</option>
                  {models.map((model, idx) => (
                    <option key={model.model_id || model.modelId || model.id || idx} value={model.model_id || model.modelId || model.id || ''}>
                      {model.name || model.model_id || model.modelId || model.id}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Script für Voice (optional)"
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF9900]/40"
              />
              {ttsError && <div className="text-xs text-red-400">{ttsError}</div>}
              <button
                onClick={generateTts}
                disabled={ttsLoading || !script.trim()}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all',
                  ttsLoading || !script.trim()
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-[#FF9900] text-black hover:opacity-90'
                )}
              >
                {ttsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic2 className="w-3 h-3" />}
                Voice erzeugen
              </button>
              {audioPreviewUrl && (
                <audio controls src={audioPreviewUrl} className="w-full mt-2" />
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">{error}</div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={startLipSync}
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
              Lip-Sync starten ({modelConfig?.cost ?? 0} Credits)
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
                <span className="text-white font-semibold">Lip-Sync läuft... (kann bis zu 5 Minuten dauern)</span>
              </>
            )}
            {status === 'succeeded' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-white font-semibold">Lip-Sync erfolgreich erstellt!</span>
              </>
            )}
            {status === 'failed' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-white font-semibold">Lip-Sync fehlgeschlagen</span>
              </>
            )}
          </div>
        </div>
      )}

      {outputUrl && (
        <div className="rounded-2xl border border-[#FF9900]/30 bg-[#FF9900]/5 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Ergebnis</h3>
            <button
              onClick={() => handleDownload(outputUrl, 'lipsync-result.mp4')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF9900] text-black font-semibold text-sm hover:bg-[#FF9900] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
          <video src={outputUrl} controls className="w-full rounded-xl" />
        </div>
      )}
    </StudioShell>
    </>
  );
}
