'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StudioShell } from '@/components/forge/StudioShell';
import { AIInfluencerNav } from '@/components/marketing/AIInfluencerNav';
import { Sparkles, Upload, CheckCircle2, AlertCircle, Copy, Loader2, ArrowLeft } from 'lucide-react';
import { useAIContext } from '@/app/context/AIContext';
import { cn } from '@/lib/utils';
import { CreditsTopUpModal } from '@/components/billing/CreditsTopUpModal';

export default function CharacterDNAPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();

  const [loading, setLoading] = useState(true);
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContext('AI Influencer Studio - Character DNA Extractor.');
  }, [setContext]);

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await fetch(`/api/ventures/${ventureId}/brand-dna`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.characterPrompt) {
          setCharacterPrompt(String(data.characterPrompt));
        }
      } catch (err) {
        console.error('Failed to load character prompt', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, [ventureId]);

  const handleImageSelect = (files?: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const nextFiles = Array.from(files).slice(0, 3);
    for (const file of nextFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Bild ist zu groß (max 10MB).');
        return;
      }
    }
    setImageFiles(nextFiles);
    setImagePreviews(nextFiles.map((file) => URL.createObjectURL(file)));
    setError(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageSelect(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleImageSelect(e.dataTransfer.files);
  };

  const extractDNA = async () => {
    if (imageFiles.length === 0) {
      setError('Bitte lade ein klares Portrait hoch.');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append('images', file));

      const res = await fetch(`/api/ventures/${ventureId}/marketing/character-dna`, {
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
        throw new Error(data?.error || 'Character DNA konnte nicht erstellt werden.');
      }

      const prompt = String(data?.characterPrompt || '').trim();
      if (!prompt) throw new Error('Kein Prompt erhalten.');

      setCharacterPrompt(prompt);
      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Character DNA konnte nicht erstellt werden.');
    }
  };

  const handleCopy = async () => {
    if (!characterPrompt) return;
    try {
      await navigator.clipboard.writeText(characterPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (loading) return <div className="text-white p-8">Lade Character DNA...</div>;

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing/character-dna`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
    <StudioShell
      title="Character DNA"
      description="Extrahiere einen präzisen Prompt aus einem Gesicht, gespeichert für alle AI-Influencer Workflows."
      icon={<Sparkles className="w-6 h-6 text-[#FF9900]" />}
      aiProvider="gemini"
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        {/* Upload Panel */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-instrument-serif text-white">1. Portrait hochladen</h2>
            <p className="text-sm text-white/60 mt-2">
              Nutze 1–3 klare Portraits. Keine Gruppenfotos, keine Filter.
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              'border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all',
              imagePreviews.length > 0 ? 'border-[#FF9900]/60 bg-[#FF9900]/10' : 'border-white/15 bg-white/5'
            )}
          >
            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <img
                    key={preview}
                    src={preview}
                    alt={`Character preview ${index + 1}`}
                    className="w-20 h-20 rounded-lg object-cover border border-white/10"
                  />
                ))}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-white/60" />
              </div>
            )}
            <div>
              <p className="text-sm text-white/70">
                Drag & Drop oder
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-[#FF9900] font-semibold ml-1"
                >
                  Datei auswählen
                </button>
              </p>
              <p className="text-xs text-white/40">1–3 Bilder · JPG/PNG/WebP · max 10MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={extractDNA}
              disabled={imageFiles.length === 0 || status === 'uploading'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF9900] text-black text-sm font-bold hover:brightness-110 disabled:opacity-50"
            >
              {status === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Character DNA extrahieren
            </button>
            {status === 'done' && (
              <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Gespeichert
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-300">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="text-xs text-white/40 leading-relaxed">
            Bitte lade nur Bilder hoch, für die du die Rechte hast. Wir vermeiden bewusst Annahmen zu
            sensiblen Merkmalen.
          </div>
        </div>

        {/* Output Panel */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div>
            <h2 className="text-xl font-instrument-serif text-white">2. Prompt Output</h2>
            <p className="text-sm text-white/60 mt-2">
              Dieser Prompt wird automatisch gespeichert und kann in allen AI-Influencer Flows genutzt werden.
            </p>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-4 min-h-[220px]">
            {characterPrompt ? (
              <p className="text-sm text-white/80 whitespace-pre-wrap">{characterPrompt}</p>
            ) : (
              <p className="text-sm text-white/40">Noch kein Prompt gespeichert.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              disabled={!characterPrompt}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white/70 hover:bg-white/10 disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Kopiert' : 'Prompt kopieren'}
            </button>
            <Link
              href={`/forge/${ventureId}/marketing`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white/70 hover:bg-white/10"
            >
              Media Studio öffnen
            </Link>
          </div>
        </div>
      </div>
    </StudioShell>
    </>
  );
}
