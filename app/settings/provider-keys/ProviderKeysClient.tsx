'use client';

import { useMemo, useState } from 'react';

type ProviderKeySource = 'user' | 'platform' | 'none';

type ReplicateStatus = {
  provider: 'replicate';
  source: ProviderKeySource;
  hasUserKey: boolean;
  keyHint: string | null;
  updatedAt: string | null;
  validationError: string | null;
};

type ProviderKeysClientProps = {
  initialReplicateStatus: ReplicateStatus;
};

const sourceLabel: Record<ProviderKeySource, string> = {
  user: 'Dein eigener Key aktiv',
  platform: 'Plattform-Key (Fallback) aktiv',
  none: 'Kein Key verfügbar',
};

export default function ProviderKeysClient({ initialReplicateStatus }: ProviderKeysClientProps) {
  const [status, setStatus] = useState<ReplicateStatus>(initialReplicateStatus);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updatedAtLabel = useMemo(() => {
    if (!status.updatedAt) return null;
    return new Date(status.updatedAt).toLocaleString('de-DE');
  }, [status.updatedAt]);

  const resetFeedback = () => {
    setMessage('');
    setError('');
  };

  const handleSave = async () => {
    resetFeedback();
    setSaving(true);

    try {
      const res = await fetch('/api/provider-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'replicate', token }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Key konnte nicht gespeichert werden.');
      }

      setStatus(payload.provider as ReplicateStatus);
      setToken('');
      setMessage(payload?.message || 'Key gespeichert.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    resetFeedback();
    setRemoving(true);

    try {
      const res = await fetch('/api/provider-keys?provider=replicate', {
        method: 'DELETE',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Key konnte nicht entfernt werden.');
      }
      setStatus(payload.provider as ReplicateStatus);
      setMessage(payload?.message || 'Key entfernt.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Replicate BYOK</h2>
            <p className="text-sm text-white/50">
              Nur Replicate ist aktuell als eigener User-Key freigeschaltet.
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">{sourceLabel[status.source]}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-[11px] uppercase tracking-[0.15em] text-white/40">Aktiver Key</div>
            <div className="mt-1 text-sm text-white/90">{status.keyHint || '—'}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-[11px] uppercase tracking-[0.15em] text-white/40">Zuletzt aktualisiert</div>
            <div className="mt-1 text-sm text-white/90">{updatedAtLabel || '—'}</div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            Neuer Replicate API Key
          </label>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="r8_..."
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || token.trim().length === 0}
              className="rounded-xl bg-white text-black px-4 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {saving ? 'Speichert...' : 'Key speichern'}
            </button>

            <button
              type="button"
              onClick={handleRemove}
              disabled={removing || !status.hasUserKey}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {removing ? 'Entfernt...' : 'Eigenen Key entfernen'}
            </button>
          </div>
        </div>

        {message && <div className="text-sm text-emerald-300">{message}</div>}
        {error && <div className="text-sm text-red-300">{error}</div>}
        {status.validationError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            BYOK Hinweis: {status.validationError}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/60">
          Falls kein eigener Key gesetzt ist, nutzt das System automatisch den Plattform-Key (wenn vorhanden).
        </div>
      </section>
    </div>
  );
}
