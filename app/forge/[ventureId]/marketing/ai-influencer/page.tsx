'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StudioShell } from '@/components/forge/StudioShell';
import { AIInfluencerNav } from '@/components/marketing/AIInfluencerNav';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { useAIContext } from '@/app/context/AIContext';
import { ArrowLeft, CheckCircle2, Copy, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreditsTopUpModal } from '@/components/billing/CreditsTopUpModal';

interface PromptItem {
  id: string;
  prompt: string;
  generatedContent: string;
  createdAt: string;
}

export default function AIInfluencerPromptDesigner() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();

  const [subject, setSubject] = useState('');
  const [items, setItems] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);

  useEffect(() => {
    setContext('AI Influencer Studio - Prompt Designer.');
  }, [setContext]);

  const loadPrompts = async () => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/ai-influencer-prompts`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
        }
        throw new Error(data?.error || 'Prompts konnten nicht geladen werden.');
      }
      setItems(Array.isArray(data?.prompts) ? data.prompts : []);
    } catch (err: any) {
      setError(err?.message || 'Prompts konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts, ventureId]);

  const canGenerate = useMemo(() => subject.trim().length > 2 && !generating, [subject, generating]);

  const handleGenerate = async () => {
    if (!subject.trim()) {
      setError('Bitte gib ein Subject an.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/ai-influencer-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
        }
        throw new Error(data?.error || 'Generierung fehlgeschlagen.');
      }

      if (data?.prompt) {
        setItems((prev) => [data.prompt, ...prev]);
      }
      setSubject('');
    } catch (err: any) {
      setError(err?.message || 'Generierung fehlgeschlagen.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      setCopiedId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Diesen Prompt wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/ai-influencer-prompts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Löschen fehlgeschlagen.');
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Löschen fehlgeschlagen.');
    }
  };

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing/ai-influencer`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
    <StudioShell
      title="AI Influencer"
      description="Prompt Designer für photorealistische Podcast-Studio Visuals. Nur Subject eingeben, der Rest wird inferiert."
      icon={<Sparkles className="w-5 h-5 text-[#FF9900]" />}
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

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Prompt Designer</p>
              <h2 className="text-lg font-semibold text-white mt-2">Ein Subject, fünf Kino-Prompts</h2>
              <p className="text-sm text-white/60 mt-1">Gib nur das Subject ein. Licht, Kamera, Stil, Props und Look übernimmt die KI automatisch.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">Subject</label>
              <Textarea
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="z.B. Zwei Gründerinnen diskutieren Produktstrategie"
                rows={3}
                className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#FF9900]/40"
              />
              <p className="text-[11px] text-white/40">Nur Subject. Keine Stil- oder Lichtangaben nötig.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="gap-2"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Prompt Set generieren
              </Button>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <CheckCircle2 className="h-4 w-4 text-[#FF9900]" />
                Gemini System Prompt ist fix und nicht editierbar.
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">Zuletzt generierte Prompt-Sets</h3>
            <p className="text-xs text-white/50 mt-1">Mehrere Sets pro Venture möglich. Kopieren oder löschen.</p>
          </div>

          {loading ? (
            <div className="glass-card rounded-2xl border border-white/10 p-6 text-white/60">Lade Prompts...</div>
          ) : items.length === 0 ? (
            <div className="glass-card rounded-2xl border border-white/10 p-6 text-white/60">Noch keine Prompt-Sets vorhanden.</div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="glass-card rounded-2xl border border-white/10 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40">Subject</p>
                      <p className="text-sm font-semibold text-white mt-1">{item.prompt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleCopy(item.id, item.generatedContent)}
                      >
                        <Copy className="h-4 w-4" />
                        {copiedId === item.id ? 'Kopiert' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-200 hover:text-red-100"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <pre className={cn('mt-4 whitespace-pre-wrap text-xs text-white/70 leading-relaxed')}>{item.generatedContent}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudioShell>
    </>
  );
}
