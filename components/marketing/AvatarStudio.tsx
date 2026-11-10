'use client';

import { useState, useEffect, useRef } from 'react';
import { Video, User, Zap, Play, Download, Sparkles, Shirt, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreditsTopUpModal } from '@/components/billing/CreditsTopUpModal';
import Hyperspeed, { hyperspeedPresets } from '@/components/visual/Hyperspeed';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'succeeded' | 'failed';

interface AvatarStudioProps {
  ventureId: string;
  brandDNA?: any;
}

const YouTubeEmbed = ({ src, label }: { src: string; label: string }) => (
  <div className="space-y-2">
    <div className="aspect-video rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <iframe
        className="w-full h-full"
        src={src}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
    <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
      <Play className="w-3.5 h-3.5 text-red-500" />
      <span>{label}</span>
    </div>
  </div>
);

export function AvatarStudio({ ventureId }: AvatarStudioProps) {
  const [, setIsPaid] = useState(false);
  const [tierLabel, setTierLabel] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');

  // Motion Transfer (Full Body) State
  const [motionVideoFile, setMotionVideoFile] = useState<File | null>(null);
  const [motionImageFile, setMotionImageFile] = useState<File | null>(null);
  const [motionVideoPreview, setMotionVideoPreview] = useState<string | null>(null);
  const [motionImagePreview, setMotionImagePreview] = useState<string | null>(null);
  const [motionStatus, setMotionStatus] = useState<JobStatus>('idle');
  const [motionOutputUrl, setMotionOutputUrl] = useState<string | null>(null);
  const [motionError, setMotionError] = useState<string | null>(null);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);

  const motionVideoInputRef = useRef<HTMLInputElement>(null);
  const motionImageInputRef = useRef<HTMLInputElement>(null);
  const motionPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Face Section State
  const [faceModel] = useState('live-portrait');
  const [faceVideoFile, setFaceVideoFile] = useState<File | null>(null);
  const [faceImageFile, setFaceImageFile] = useState<File | null>(null);
  const [faceVideoPreview, setFaceVideoPreview] = useState<string | null>(null);
  const [faceImagePreview, setFaceImagePreview] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<JobStatus>('idle');
  const [faceOutputUrl, setFaceOutputUrl] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);

  const faceVideoInputRef = useRef<HTMLInputElement>(null);
  const faceImageInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadTier = async () => {
      const res = await fetch('/api/billing/summary').then(r => r.json()).catch(() => null);
      const paid = Boolean(res?.hasPlatformAccess);
      const tier = res?.effectiveSubscriptionTier ?? res?.subscriptionTier;
      setIsPaid(paid);
      setTierLabel(tier === 'enterprise' ? 'Enterprise' : paid ? 'Pro' : 'Free');
    };
    loadTier();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (motionPollIntervalRef.current) clearInterval(motionPollIntervalRef.current);
    };
  }, []);

  // Motion Transfer Handlers
  const handleMotionVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMotionVideoFile(file);
      setMotionVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleMotionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMotionImageFile(file);
      setMotionImagePreview(URL.createObjectURL(file));
    }
  };

  const startMotionTransfer = async () => {
    if (!motionVideoFile || !motionImageFile) {
      setMotionError('Bitte lade Video und Character Image hoch.');
      return;
    }
    setMotionStatus('uploading');
    setMotionError(null);
    try {
      const formData = new FormData();
      formData.append('drivingVideo', motionVideoFile);
      formData.append('characterImage', motionImageFile);
      formData.append('model', 'wan-2.2-animate');
      formData.append('resolution', '720');
      formData.append('refertNum', '5');
      formData.append('fps', '24');
      formData.append('mergeAudio', 'true');
      formData.append('goFast', 'true');

      const res = await fetch(`/api/ventures/${ventureId}/marketing/motion-transfer`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
          throw new Error(data.error || 'Nicht genug Credits');
        }
        throw new Error(data.error || 'Fehlgeschlagen');
      }

      if (data.predictionId) {
        setMotionStatus('processing');
        pollMotionTransfer(data.predictionId);
      } else if (data.outputUrl) {
        setMotionOutputUrl(data.outputUrl);
        setMotionStatus('succeeded');
      }
    } catch (err: any) {
      setMotionStatus('failed');
      setMotionError(err.message);
    }
  };

  const pollMotionTransfer = (id: string) => {
    motionPollIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/motion-transfer?predictionId=${id}`).then(r => r.json());
      if (res.status === 'succeeded') {
        setMotionStatus('succeeded');
        setMotionOutputUrl(res.outputUrl);
        clearInterval(motionPollIntervalRef.current!);
      } else if (res.status === 'failed') {
        setMotionStatus('failed');
        setMotionError('Verarbeitung fehlgeschlagen');
        clearInterval(motionPollIntervalRef.current!);
      }
    }, 3000);
  };

  // Face Handlers
  const handleFaceVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaceVideoFile(file);
      setFaceVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleFaceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaceImageFile(file);
      setFaceImagePreview(URL.createObjectURL(file));
    }
  };

  const startFaceAction = async () => {
    if (!faceImageFile || !faceVideoFile) {
      setFaceError('Bitte lade Video und Modell-Foto hoch.');
      return;
    }
    setFaceStatus('uploading');
    setFaceError(null);
    try {
      const formData = new FormData();
      formData.append('video', faceVideoFile);
      formData.append('face', faceImageFile);
      formData.append('model', faceModel);

      const res = await fetch(`/api/ventures/${ventureId}/marketing/faceswap`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehlgeschlagen');

      if (data.predictionId) {
        setFaceStatus('processing');
        pollFace(data.predictionId);
      } else if (data.outputUrl) {
        setFaceOutputUrl(data.outputUrl);
        setFaceStatus('succeeded');
      }
    } catch (err: any) {
      setFaceStatus('failed');
      setFaceError(err.message);
    }
  };

  const pollFace = (id: string) => {
    pollIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/faceswap?predictionId=${id}`).then(r => r.json());
      if (res.status === 'succeeded') {
        setFaceStatus('succeeded');
        setFaceOutputUrl(res.outputUrl);
        clearInterval(pollIntervalRef.current!);
      } else if (res.status === 'failed') {
        setFaceStatus('failed');
        setFaceError('Verarbeitung fehlgeschlagen');
        clearInterval(pollIntervalRef.current!);
      }
    }, 3000);
  };

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing/faceswap`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-instrument-serif text-white">Avatar & Character Studio</h2>
          <p className="text-sm text-white/40">Hybrid Character & Background Expression Engine.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF9900]/10 border border-[#FF9900]/30 text-[#FF9900] text-xs font-bold uppercase">
          <Zap className="w-3 h-3" />
          {tierLabel} Engine
        </div>
      </div>

      {/* SECTION 1: GANZKÖRPER (Body) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <div className="p-2 rounded-lg bg-[#FF9900]/10 border border-[#FF9900]/20">
            <Shirt className="w-5 h-5 text-[#FF9900]" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Ganzkörper Studio</h3>
            <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Virtual Try-On & Human Motion</p>
          </div>
        </div>

        {/* Motion Transfer UI */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section (Motion) */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => motionVideoInputRef.current?.click()}
                className={cn(
                  "relative aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF9900]/50 transition-all overflow-hidden",
                  motionVideoPreview && "border-solid border-[#FF9900]/30"
                )}
              >
                <input ref={motionVideoInputRef} type="file" accept="video/*" className="hidden" onChange={handleMotionVideoSelect} />
                {motionVideoPreview ? (
                  <video src={motionVideoPreview} className="w-full h-full object-cover" autoPlay loop muted />
                ) : (
                  <div className="text-center p-4">
                    <Video className="w-5 h-5 text-white/20 mx-auto mb-1" />
                    <p className="text-[9px] text-white/40 font-bold uppercase leading-tight">Driving Video</p>
                    <p className="text-[8px] text-white/20 mt-1">(Deine Bewegungen)</p>
                  </div>
                )}
              </div>

              <div
                onClick={() => motionImageInputRef.current?.click()}
                className={cn(
                  "relative aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF9900]/50 transition-all overflow-hidden",
                  motionImagePreview && "border-solid border-[#FF9900]/30"
                )}
              >
                <input ref={motionImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleMotionImageSelect} />
                {motionImagePreview ? (
                  <img src={motionImagePreview} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <User className="w-5 h-5 text-white/20 mx-auto mb-1" />
                    <p className="text-[9px] text-white/40 font-bold uppercase leading-tight">Character Image</p>
                    <p className="text-[8px] text-white/20 mt-1">(AI-Charakter)</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={startMotionTransfer}
              disabled={motionStatus !== 'idle' || !motionVideoFile || !motionImageFile}
              className="w-full group relative py-3 bg-[#FF9900] text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(255,153,0,0.3)] active:scale-95"
            >
              {motionStatus === 'idle' ? 'Motion Transfer Starten' : motionStatus === 'uploading' ? 'Uploading...' : 'Verarbeitung...'}
              {motionStatus === 'idle' && <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-[#FF9900] animate-pulse" />}
            </button>
            {motionError && <p className="text-red-400 text-[9px] font-bold uppercase text-center">{motionError}</p>}
          </div>

          {/* Result Section (Motion) */}
          <div className="relative aspect-video rounded-3xl border border-[#FF9900]/30 bg-black/40 overflow-hidden shadow-[0_0_50px_rgba(255,153,0,0.1)]">
            {motionOutputUrl ? (
              <>
                <video src={motionOutputUrl} controls className="w-full h-full object-contain" />
                <button
                  onClick={() => window.open(motionOutputUrl)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-white/10 text-white hover:text-[#FF9900] transition-colors z-20"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            ) : motionStatus === 'processing' || motionStatus === 'uploading' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="absolute inset-0 pointer-events-none">
                  <Hyperspeed
                    className="absolute inset-0"
                    effectOptions={hyperspeedPresets.three}
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="relative scale-125">
                    <Sparkles className="w-8 h-8 text-[#FF9900] animate-pulse" />
                    <div className="absolute inset-0 animate-ping">
                      <Sparkles className="w-8 h-8 text-[#FF9900] opacity-30" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      {motionStatus === 'uploading' ? 'Upload...' : 'Motion Transfer aktiv...'}
                    </p>
                    <p className="text-[8px] text-[#FF9900] font-bold mt-1 uppercase tracking-widest">
                      Avatar-Engine wird geschmiedet
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <Play className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Result Preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Youtube Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YouTubeEmbed
            src="https://www.youtube.com/embed/fWJPw54yRbs?si=UlOI7dErUTg972GX"
            label="Showcase: Body Swap"
          />
          <YouTubeEmbed
            src="https://www.youtube.com/embed/OGdJjrxiswc?si=EPWGDrX0x3JNPofF"
            label="Showcase: Expression Engine"
          />
        </div>
      </section>

      {/* SECTION 2: GESICHT (Face) */}
      <section className="space-y-6 pt-12 border-t border-white/5">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <div className="p-2 rounded-lg bg-[#FF9900]/10 border border-[#FF9900]/20">
            <Languages className="w-5 h-5 text-[#FF9900]" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Gesicht & Expression Studio</h3>
            <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Face-Swap & Lip-Sync Animation</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section (Face) */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => faceVideoInputRef.current?.click()}
                className={cn(
                  "relative aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF9900]/50 transition-all overflow-hidden",
                  faceVideoPreview && "border-solid border-[#FF9900]/30"
                )}
              >
                <input ref={faceVideoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFaceVideoSelect} />
                {faceVideoPreview ? (
                  <video src={faceVideoPreview} className="w-full h-full object-cover" autoPlay loop muted />
                ) : (
                  <div className="text-center p-4">
                    <Video className="w-5 h-5 text-white/20 mx-auto mb-1" />
                    <p className="text-[9px] text-white/40 font-bold uppercase leading-tight">Driving Video</p>
                  </div>
                )}
              </div>

              <div 
                onClick={() => faceImageInputRef.current?.click()}
                className={cn(
                  "relative aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF9900]/50 transition-all overflow-hidden",
                  faceImagePreview && "border-solid border-[#FF9900]/30"
                )}
              >
                <input ref={faceImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFaceImageSelect} />
                {faceImagePreview ? (
                  <img src={faceImagePreview} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <User className="w-5 h-5 text-white/20 mx-auto mb-1" />
                    <p className="text-[9px] text-white/40 font-bold uppercase leading-tight">Target Face</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={startFaceAction}
              disabled={faceStatus !== 'idle' || !faceVideoFile || !faceImageFile}
              className="w-full group relative py-3 bg-[#FF9900] text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(255,153,0,0.3)] active:scale-95"
            >
              {faceStatus === 'idle' ? 'Animation starten' : 'Verarbeitung...'}
              {faceStatus === 'idle' && <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-[#FF9900] animate-pulse" />}
            </button>
            {faceError && <p className="text-red-400 text-[9px] font-bold uppercase text-center">{faceError}</p>}
          </div>

          {/* Result Section (Face) */}
          <div className="relative aspect-video rounded-3xl border border-[#FF9900]/30 bg-black/40 overflow-hidden shadow-[0_0_50px_rgba(255,153,0,0.1)]">
            {faceOutputUrl ? (
              <>
                <video src={faceOutputUrl} controls className="w-full h-full object-contain" />
                <button 
                  onClick={() => window.open(faceOutputUrl)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-white/10 text-white hover:text-[#FF9900] transition-colors z-20"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            ) : faceStatus === 'processing' || faceStatus === 'uploading' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="absolute inset-0 pointer-events-none">
                  <Hyperspeed
                    className="absolute inset-0"
                    effectOptions={hyperspeedPresets.three}
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="relative scale-125">
                    <Sparkles className="w-8 h-8 text-[#FF9900] animate-pulse" />
                    <div className="absolute inset-0 animate-ping">
                      <Sparkles className="w-8 h-8 text-[#FF9900] opacity-30" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      {faceStatus === 'uploading' ? 'Upload...' : 'Mimik Engine aktiv...'}
                    </p>
                    <p className="text-[8px] text-[#FF9900] font-bold mt-1 uppercase tracking-widest">
                      Erschaffe Ausdrücke
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                <Play className="w-8 h-8 text-white/10 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Result Preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Youtube Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YouTubeEmbed
            src="https://www.youtube.com/embed/SnKEcVQ4m3k?si=WNgsA99wVOs3Tc44"
            label="LivePortrait Face Swap"
          />
          <YouTubeEmbed
            src="https://www.youtube.com/embed/xfzK_6cTs58?si=JMQrkYFlASUCRCc1"
            label="Kling Ganzkörper Video"
          />
        </div>
      </section>
    </div>
    </>
  );
}
