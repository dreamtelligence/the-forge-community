'use client';

import { useMemo, useState } from 'react';
import { FileText, Loader2, Mail, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ContractScanResult, RiskSeverity } from '@/types/contract-scan';
import { cn } from '@/lib/utils';

const costLabels: Array<{ key: keyof ContractScanResult['costSummary']; label: string }> = [
  { key: 'currency', label: 'Waehrung' },
  { key: 'totalEstimated', label: 'Gesamtkosten' },
  { key: 'recurringCosts', label: 'Laufende Kosten' },
  { key: 'oneTimeCosts', label: 'Einmalkosten' },
  { key: 'paymentTerms', label: 'Zahlungsbedingungen' },
  { key: 'priceIncreaseClause', label: 'Preisanpassung' },
  { key: 'minimumCommitment', label: 'Mindestbindung' },
  { key: 'autoRenewal', label: 'Auto-Verlaengerung' },
];

const severityTone = (severity: RiskSeverity) => {
  if (severity === 'high') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (severity === 'medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
};

const riskTone = (score: number) => {
  if (score >= 70) return { label: 'Hoch', bar: 'bg-red-500', text: 'text-red-200' };
  if (score >= 40) return { label: 'Mittel', bar: 'bg-amber-500', text: 'text-amber-100' };
  return { label: 'Niedrig', bar: 'bg-emerald-500', text: 'text-emerald-100' };
};

export default function ContractScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [result, setResult] = useState<ContractScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const riskMeta = useMemo(() => (result ? riskTone(result.riskScore) : null), [result]);

  const costRows = useMemo(() => {
    if (!result) return [];
    return costLabels
      .map((item) => ({
        label: item.label,
        value: result.costSummary[item.key] || '',
      }))
      .filter((row) => row.value);
  }, [result]);

  const mailtoHref = useMemo(() => {
    if (!result || !recipientEmail) return '';
    const subject = encodeURIComponent(result.emailDraft.subject || 'Rueckmeldung zum Vertrag');
    const body = encodeURIComponent(result.emailDraft.body || '');
    return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  }, [result, recipientEmail]);

  const handleSubmit = async () => {
    if (!file || status === 'loading') return;
    setStatus('loading');
    setError(null);
    setCopied(false);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('context', context.trim());

      const res = await fetch('/api/communication/contract-scan', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analyse fehlgeschlagen');
      setResult(data.result as ContractScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse fehlgeschlagen');
    } finally {
      setStatus('idle');
    }
  };

  const handleCopyEmail = async () => {
    if (!result) return;
    const content = `Betreff: ${result.emailDraft.subject}\n\n${result.emailDraft.body}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.35em] text-white/50">
          Contract Risk Scanner
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Vertrag scannen, Risiken erkennen, Gegenangebot vorbereiten
        </h2>
        <p className="text-sm text-white/50">
          PDF rein, klare Risikoanalyse raus. Keine Rechtsberatung. Nur wirtschaftlicher Realitaets-Check.
        </p>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <label className="block text-xs uppercase tracking-[0.3em] text-white/40">PDF Upload</label>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
              <FileText className="h-5 w-5 text-white/50" />
              <div className="flex-1 text-sm text-white/70">
                {file ? file.name : 'PDF Vertrag auswählen (max 8MB)'}
              </div>
              <label className="cursor-pointer rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 hover:text-white">
                Datei wählen
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    setFile(nextFile);
                  }}
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/40">Kontext (optional)</label>
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Besondere Punkte? Preisrahmen? Ziel?"
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/40">Empfaenger Email (optional)</label>
              <input
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="partner@firma.de"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/50">
              <div className="font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Output</div>
              <ul className="space-y-2">
                <li>Risiko-Score + wirtschaftliche Flags</li>
                <li>Preis- und Laufzeit-Plausibilität</li>
                <li>Gegenangebot-Optionen</li>
                <li>Fertige Antwort-Email</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || status === 'loading'}
              className="w-full rounded-full bg-[#1488fc] px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[#1a94ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'loading' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysiere
                </span>
              ) : (
                'Analyse starten'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">Risiko Score</div>
                <div className="mt-2 text-4xl font-semibold text-white">{result.riskScore}</div>
              </div>
              {riskMeta && (
                <div className="flex flex-col items-end">
                  <div className={cn('text-sm font-semibold uppercase tracking-[0.2em]', riskMeta.text)}>
                    {riskMeta.label}
                  </div>
                  <div className="mt-2 h-2 w-48 rounded-full bg-white/10">
                    <div
                      className={cn('h-full rounded-full', riskMeta.bar)}
                      style={{ width: `${Math.min(100, Math.max(0, result.riskScore))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Executive Brief</div>
                <ul className="space-y-2 text-sm text-white/70">
                  {result.summary.map((item, index) => (
                    <li key={`summary-${index}`} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Kosten-Übersicht</div>
                {costRows.length === 0 ? (
                  <div className="text-sm text-white/40">Keine Kostenangaben gefunden.</div>
                ) : (
                  <div className="space-y-2 text-sm text-white/70">
                    {costRows.map((row) => (
                      <div key={row.label} className="flex justify-between gap-4">
                        <span className="text-white/50">{row.label}</span>
                        <span className="text-white/80">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Risiko Flags</div>
                <div className="space-y-3">
                  {result.riskFlags.length === 0 ? (
                    <div className="text-sm text-white/40">Keine Risiko-Flags erkannt.</div>
                  ) : (
                    result.riskFlags.map((flag, index) => (
                      <div
                        key={`flag-${index}`}
                        className={cn('rounded-2xl border px-4 py-3 text-sm', severityTone(flag.severity))}
                      >
                        <div className="font-semibold">{flag.title}</div>
                        <div className="text-white/80">{flag.detail}</div>
                        {flag.clause && <div className="text-xs text-white/50 mt-2">Klausel: {flag.clause}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Plausibilität & Lücken</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-200" />
                      Plausibilität
                    </div>
                    <ul className="space-y-2 text-sm text-white/70">
                      {(result.plausibilityIssues.length ? result.plausibilityIssues : ['Keine Auffälligkeiten gefunden.']).map(
                        (item, index) => (
                          <li key={`plaus-${index}`} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                      Fehlende Infos
                    </div>
                    <ul className="space-y-2 text-sm text-white/70">
                      {(result.missingInfo.length ? result.missingInfo : ['Keine fehlenden Infos erkannt.']).map(
                        (item, index) => (
                          <li key={`missing-${index}`} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Gegenangebot Optionen</div>
                <ul className="space-y-3 text-sm text-white/70">
                  {(result.counterOfferOptions.length ? result.counterOfferOptions : ['Keine Vorschläge generiert.']).map(
                    (item, index) => (
                      <li key={`counter-${index}`} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                        <span>{item}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40">Antwort Email</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? 'Kopiert' : 'Copy'}
                    </button>
                    {mailtoHref && (
                      <a
                        href={mailtoHref}
                        className="inline-flex items-center gap-2 rounded-full bg-[#1488fc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Mail
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-[#0c0f14] p-5 text-sm text-white/80 leading-relaxed">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Betreff</div>
                  <div className="font-semibold text-white/90">{result.emailDraft.subject}</div>
                  <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/40">Body</div>
                  <div className="mt-2 whitespace-pre-wrap">{result.emailDraft.body}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-xs text-white/40">
                AI-Analyse ersetzt keine Rechtsberatung. Bei hohen Risiken: Anwalt pruefen lassen.
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
