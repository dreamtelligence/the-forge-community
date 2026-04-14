'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, Clock3, Download, Loader2, Mic2, Music2, RefreshCw, Save, Sliders, Volume2 } from 'lucide-react';
import type { MediaAsset } from '@prisma/client';
import { CreditsTopUpModal } from '@/components/billing/CreditsTopUpModal';

type ElevenVoice = {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
};

type ElevenModel = {
  model_id?: string;
  modelId?: string;
  id?: string;
  name?: string;
  description?: string;
  can_do_text_to_speech?: boolean;
};

type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

type ElevenDictionary = {
  pronunciation_dictionary_id?: string;
  name?: string;
  description?: string;
  version_id?: string;
  latest_version_id?: string;
};

type VoiceProfile = {
  voiceId?: string | null;
  voiceName?: string | null;
  modelId?: string | null;
  pronunciationDictionaryId?: string | null;
  pronunciationDictionaryVersionId?: string | null;
  voiceSettings?: VoiceSettings | null;
};

interface VoiceGeneratorPanelProps {
  ventureId: string;
  brandDNA?: any;
  onAssetCreated?: (asset: MediaAsset) => void;
}

const OUTPUT_FORMATS = [
  { id: 'mp3_44100_128', label: 'MP3 · 44.1kHz · 128kbps' },
];

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.4,
  similarity_boost: 0.8,
  style: 0.2,
  use_speaker_boost: true,
};

const MAX_TTS_CHARS = 5000;

export function VoiceGeneratorPanel({ ventureId, brandDNA, onAssetCreated }: VoiceGeneratorPanelProps) {
  const [voices, setVoices] = useState<ElevenVoice[]>([]);
  const [models, setModels] = useState<ElevenModel[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState('');

  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [voiceId, setVoiceId] = useState('');
  const [modelId, setModelId] = useState('');
  const [outputFormat, setOutputFormat] = useState(OUTPUT_FORMATS[0].id);
  const [script, setScript] = useState('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [dictionaries, setDictionaries] = useState<ElevenDictionary[]>([]);
  const [dictionaryId, setDictionaryId] = useState('');
  const [dictionaryVersionId, setDictionaryVersionId] = useState('');
  const [dictionaryName, setDictionaryName] = useState('');
  const [dictionaryRules, setDictionaryRules] = useState('');
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryError, setDictionaryError] = useState('');
  const [dictionarySuccess, setDictionarySuccess] = useState('');

  const [sfxPrompt, setSfxPrompt] = useState('');
  const [sfxGenerating, setSfxGenerating] = useState(false);
  const [sfxAsset, setSfxAsset] = useState<MediaAsset | null>(null);
  const [sfxError, setSfxError] = useState('');
  const [sfxSuccess, setSfxSuccess] = useState('');

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
  const [generatedAsset, setGeneratedAsset] = useState<MediaAsset | null>(null);
  const [recentAssets, setRecentAssets] = useState<MediaAsset[]>([]);

  const normalizedModels = useMemo(() => {
    return models
      .map((model) => {
        const id = model.model_id || model.modelId || model.id;
        if (!id) return null;
        const nameValue = typeof model.name === 'string' ? model.name : null;
        return {
          id,
          name: nameValue || id,
          description: model.description,
        };
      })
      .filter(Boolean) as { id: string; name: string; description?: string }[];
  }, [models]);

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voice_id === voiceId),
    [voices, voiceId]
  );

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    setMetaError('');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'ElevenLabs Daten konnten nicht geladen werden.');
      }
      setVoices(Array.isArray(data?.voices) ? data.voices : []);
      setModels(Array.isArray(data?.models) ? data.models : []);
    } catch (error: any) {
      setMetaError(error.message || 'Fehler beim Laden der Stimmen.');
    } finally {
      setLoadingMeta(false);
    }
  }, [ventureId]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice/profile`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Brand Voice konnte nicht geladen werden.');
      }
      setProfile(data?.profile || null);
    } catch (error: any) {
      setProfileError(error.message || 'Fehler beim Laden der Brand Voice.');
    } finally {
      setProfileLoading(false);
    }
  }, [ventureId]);

  const loadDictionaries = useCallback(async () => {
    setDictionaryLoading(true);
    setDictionaryError('');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice/dictionaries`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Dictionary-Liste konnte nicht geladen werden.');
      }
      setDictionaries(Array.isArray(data?.dictionaries) ? data.dictionaries : []);
    } catch (error: any) {
      setDictionaryError(error.message || 'Fehler beim Laden der Dictionaries.');
    } finally {
      setDictionaryLoading(false);
    }
  }, [ventureId]);

  const saveProfile = async () => {
    setProfileStatus('');
    setProfileError('');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          voiceName: selectedVoice?.name || null,
          modelId: modelId || null,
          voiceSettings,
          pronunciationDictionaryId: dictionaryId || null,
          pronunciationDictionaryVersionId: dictionaryVersionId || null,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Brand Voice konnte nicht gespeichert werden.');
      }
      setProfile(data?.profile || null);
      setProfileStatus('Brand Voice gespeichert.');
    } catch (error: any) {
      setProfileError(error.message || 'Speichern fehlgeschlagen.');
    }
  };

  const parseDictionaryRules = () => {
    return dictionaryRules
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [left, right] = line.includes('=>') ? line.split('=>') : line.split('=');
        return { text: (left || '').trim(), alias: (right || '').trim() };
      })
      .filter((rule) => rule.text && rule.alias);
  };

  const saveDictionary = async () => {
    setDictionaryError('');
    setDictionarySuccess('');
    const rules = parseDictionaryRules();
    if (rules.length === 0) {
      setDictionaryError('Bitte gib mindestens eine Regel im Format "Wort=Aussprache" ein.');
      return;
    }
    setDictionaryLoading(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice/dictionaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dictionaryName || `${brandDNA?.brandName || 'Brand'} Dictionary`,
          description: 'Automatisch erstellt aus Brand-Regeln',
          rules,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Dictionary konnte nicht gespeichert werden.');
      }

      const newId =
        data?.dictionary?.pronunciation_dictionary_id ||
        data?.dictionary?.id ||
        data?.dictionary?.dictionary_id ||
        '';
      const newVersion =
        data?.dictionary?.version_id ||
        data?.dictionary?.latest_version_id ||
        data?.dictionary?.pronunciation_dictionary_version_id ||
        '';

      if (newId) setDictionaryId(newId);
      if (newVersion) setDictionaryVersionId(newVersion);

      setDictionarySuccess('Dictionary erstellt.');
      await loadDictionaries();
    } catch (error: any) {
      setDictionaryError(error.message || 'Fehler beim Erstellen der Dictionary.');
    } finally {
      setDictionaryLoading(false);
    }
  };

  const handleGenerateSfx = async () => {
    setSfxError('');
    setSfxSuccess('');
    if (!sfxPrompt.trim()) {
      setSfxError('Bitte beschreibe den Sound.');
      return;
    }
    setSfxGenerating(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice/sfx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sfxPrompt.trim(),
          outputFormat
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
        }
        throw new Error(data?.error || 'Sound konnte nicht erzeugt werden.');
      }
      setSfxAsset(data.asset || null);
      setSfxSuccess('Sound Effect erstellt.');
      if (data.asset && onAssetCreated) {
        onAssetCreated(data.asset);
      }
    } catch (error: any) {
      setSfxError(error.message || 'Sound Effect fehlgeschlagen.');
    } finally {
      setSfxGenerating(false);
    }
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const url = new URL(`/api/ventures/${ventureId}/marketing/voice/history`, window.location.origin);
      url.searchParams.set('pageSize', '20');
      if (historyCursor) url.searchParams.set('startAfter', historyCursor);
      const res = await fetch(url.toString(), { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'History konnte nicht geladen werden.');
      }
      const historyPayload = data?.history || {};
      const items = historyPayload?.history || historyPayload?.items || [];
      setHistoryItems(Array.isArray(items) ? items : []);
      const next = historyPayload?.last_history_item_id || historyPayload?.next_history_item_id || null;
      setHistoryCursor(next);
    } catch (error: any) {
      setHistoryError(error.message || 'Fehler beim Laden der History.');
    } finally {
      setHistoryLoading(false);
    }
  }, [ventureId, historyCursor]);

  const importHistoryItem = async (itemId: string) => {
    setHistoryError('');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice/history/${itemId}`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Import fehlgeschlagen.');
      }
      if (data.asset && onAssetCreated) {
        onAssetCreated(data.asset);
      }
    } catch (error: any) {
      setHistoryError(error.message || 'Import fehlgeschlagen.');
    }
  };

  useEffect(() => {
    loadMeta();
    loadProfile();
    loadDictionaries();
  }, [loadDictionaries, loadMeta, loadProfile]);

  useEffect(() => {
    if (!voiceId && voices.length > 0) {
      setVoiceId(voices[0].voice_id);
    }
  }, [voices, voiceId]);

  useEffect(() => {
    if (!modelId && normalizedModels.length > 0) {
      const preferred = normalizedModels.find((model) => model.id.includes('multilingual')) || normalizedModels[0];
      if (preferred) setModelId(preferred.id);
    }
  }, [normalizedModels, modelId]);

  useEffect(() => {
    if (!profile) return;
    if (!voiceId && profile.voiceId) {
      setVoiceId(profile.voiceId);
    }
    if (!modelId && profile.modelId) {
      setModelId(profile.modelId);
    }
    if (profile.voiceSettings) {
      setVoiceSettings({
        stability: profile.voiceSettings.stability ?? DEFAULT_VOICE_SETTINGS.stability,
        similarity_boost: profile.voiceSettings.similarity_boost ?? DEFAULT_VOICE_SETTINGS.similarity_boost,
        style: profile.voiceSettings.style ?? DEFAULT_VOICE_SETTINGS.style,
        use_speaker_boost: profile.voiceSettings.use_speaker_boost ?? DEFAULT_VOICE_SETTINGS.use_speaker_boost,
      });
    }
    if (profile.pronunciationDictionaryId) {
      setDictionaryId(profile.pronunciationDictionaryId);
    }
    if (profile.pronunciationDictionaryVersionId) {
      setDictionaryVersionId(profile.pronunciationDictionaryVersionId);
    }
  }, [profile, voiceId, modelId]);

  useEffect(() => {
    if (!dictionaryId) return;
    const dict = dictionaries.find((item) => item.pronunciation_dictionary_id === dictionaryId);
    const version = dict?.latest_version_id || dict?.version_id || '';
    if (version) setDictionaryVersionId(version);
  }, [dictionaryId, dictionaries]);

  const updateSetting = (key: keyof VoiceSettings, value: number | boolean) => {
    setVoiceSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setCreditsRemaining(null);
    setCreditsUsed(null);

    if (!script.trim()) {
      setErrorMessage('Bitte gib ein Skript ein.');
      return;
    }
    if (!voiceId) {
      setErrorMessage('Bitte wähle eine Stimme.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script.trim(),
          voiceId,
          modelId: modelId || 'eleven_multilingual_v2',
          outputFormat,
          voiceSettings,
          pronunciationDictionaryId: dictionaryId || null,
          pronunciationDictionaryVersionId: dictionaryVersionId || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
        }
        throw new Error(data?.error || 'Voice-Generierung fehlgeschlagen.');
      }

      setGeneratedAsset(data.asset || null);
      if (data.asset) {
        setRecentAssets((prev) => [data.asset, ...prev]);
      }
      setCreditsUsed(data.creditsUsed ?? null);
      setCreditsRemaining(data.creditsRemaining ?? null);
      setSuccessMessage('Voiceover erstellt.');

      if (data.asset && onAssetCreated) {
        onAssetCreated(data.asset);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Fehler bei der Voice-Generierung.');
    } finally {
      setIsGenerating(false);
    }
  };

  const charsRemaining = MAX_TTS_CHARS - script.length;

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
      <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center">
              <Mic2 className="h-5 w-5 text-[#FF9900]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Voice (ElevenLabs)</h3>
              <p className="text-xs text-white/50">
                Voiceovers in Studio-Qualität · passend zur Brand DNA.
              </p>
            </div>
          </div>
          {brandDNA?.toneOfVoice && (
            <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/30">
              Brand Tone: {brandDNA.toneOfVoice}
            </p>
          )}
        </div>
        <button
          onClick={loadMeta}
          disabled={loadingMeta}
          className="text-xs uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2"
        >
          {loadingMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Stimmen laden
        </button>
      </div>

      {metaError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {metaError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40">Stimme</label>
          <select
            value={voiceId}
            onChange={(event) => setVoiceId(event.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
          >
            {voices.length === 0 && <option value="">Keine Stimme verfügbar</option>}
            {voices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name}
                {voice.category ? ` · ${voice.category}` : ''}
              </option>
            ))}
          </select>
          {selectedVoice?.preview_url && (
            <audio controls src={selectedVoice.preview_url} className="w-full h-8 mt-2" />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40">Model</label>
          <select
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
          >
            {normalizedModels.length === 0 && <option value="">Kein Model</option>}
            {normalizedModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-white/40">Skript</label>
        <textarea
          rows={4}
          value={script}
          onChange={(event) => setScript(event.target.value)}
          placeholder="30s Reel Voiceover: Hook + Value + CTA ..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none resize-none"
        />
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/30">
          <span>{script.length}/{MAX_TTS_CHARS}</span>
          <span>{charsRemaining >= 0 ? `${charsRemaining} Zeichen frei` : 'Zu lang'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40">Output Format</label>
          <select
            value={outputFormat}
            onChange={(event) => setOutputFormat(event.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
          >
            {OUTPUT_FORMATS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2"
          >
            <Sliders className="h-3 w-3" />
            {showAdvanced ? 'Basic' : 'Advanced'}
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40">Stability</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={voiceSettings.stability}
              onChange={(event) => updateSetting('stability', Number(event.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40">Similarity Boost</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={voiceSettings.similarity_boost}
              onChange={(event) => updateSetting('similarity_boost', Number(event.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40">Style</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={voiceSettings.style}
              onChange={(event) => updateSetting('style', Number(event.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-white/60">
            <input
              type="checkbox"
              checked={voiceSettings.use_speaker_boost}
              onChange={(event) => updateSetting('use_speaker_boost', event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/10"
            />
            Speaker Boost aktiv
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-[#FF9900]" />
          {creditsUsed ? `Energy: ${creditsUsed} verbraucht` : 'Energy Usage'}
          {creditsRemaining !== null && (
            <span className="text-white/70">· {creditsRemaining} übrig</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !voiceId || !script.trim()}
          className="px-6 py-3 rounded-xl bg-[#FF9900] text-black font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic2 className="w-4 h-4" />}
          Voice erzeugen
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={saveProfile}
          disabled={profileLoading}
          className="text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white flex items-center gap-2"
        >
          {profileLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Als Brand Voice speichern
        </button>
        {profileStatus && (
          <span className="text-[10px] uppercase tracking-widest text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3" />
            {profileStatus}
          </span>
        )}
      </div>
      {profileError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {profileError}
        </div>
      )}

      {generatedAsset?.url && (
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1">
             <div className="text-[10px] uppercase tracking-widest text-[#FF9900] mb-1">Aktuelles Ergebnis</div>
             <audio controls src={generatedAsset.url} className="w-full" />
          </div>
          <button
            onClick={() => window.open(generatedAsset.url, '_blank')}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}

      {recentAssets.length > 1 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40 pl-1">In dieser Session generiert</div>
          {recentAssets.slice(1).map((asset) => (
            <div key={asset.id} className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/70 truncate mb-1">{asset.prompt || asset.filename}</div>
                <audio controls src={asset.url} className="w-full h-8" />
              </div>
              <button
                onClick={() => window.open(asset.url, '_blank')}
                className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-white/10 pt-6 space-y-4">
        <div className="flex items-center gap-2 text-white/70">
          <BookOpen className="h-4 w-4 text-[#FF9900]" />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Pronunciation Dictionary</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-white/40">Dictionary</label>
              <button
                onClick={loadDictionaries}
                disabled={dictionaryLoading}
                className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2"
              >
                {dictionaryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Aktualisieren
              </button>
            </div>
            <select
              value={dictionaryId}
              onChange={(event) => setDictionaryId(event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
            >
              <option value="">Keine Dictionary ausgewählt</option>
              {dictionaries.map((dict) => {
                const id = dict.pronunciation_dictionary_id || '';
                return (
                  <option key={id} value={id}>
                    {dict.name || id}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40">Dictionary Version ID</label>
            <input
              value={dictionaryVersionId}
              onChange={(event) => setDictionaryVersionId(event.target.value)}
              placeholder="z.B. latest_version_id"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40">Neue Regeln (Wort=Aussprache)</label>
          <textarea
            rows={3}
            value={dictionaryRules}
            onChange={(event) => setDictionaryRules(event.target.value)}
            placeholder="Xylora=Zy-lo-ra"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-[#FF9900] outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40">Dictionary Name</label>
            <input
              value={dictionaryName}
              onChange={(event) => setDictionaryName(event.target.value)}
              placeholder={`${brandDNA?.brandName || 'Brand'} Dictionary`}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
            />
          </div>
          <button
            onClick={saveDictionary}
            disabled={dictionaryLoading}
            className="px-4 py-3 rounded-xl bg-white/10 text-white text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
          >
            {dictionaryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
            Dictionary erstellen
          </button>
        </div>

        {dictionaryError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {dictionaryError}
          </div>
        )}
        {dictionarySuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {dictionarySuccess}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-6 space-y-4">
        <div className="flex items-center gap-2 text-white/70">
          <Music2 className="h-4 w-4 text-[#FF9900]" />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Sound Effects</span>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40">Beschreibung</label>
          <textarea
            rows={2}
            value={sfxPrompt}
            onChange={(event) => setSfxPrompt(event.target.value)}
            placeholder="z.B. Dose öffnet sich, Eiswürfel klirren"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-[#FF9900] outline-none resize-none"
          />
        </div>
        {sfxError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {sfxError}
          </div>
        )}
        {sfxSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {sfxSuccess}
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleGenerateSfx}
            disabled={sfxGenerating || !sfxPrompt.trim()}
            className="px-4 py-3 rounded-xl bg-white/10 text-white text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
          >
            {sfxGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Music2 className="h-3 w-3" />}
            Sound erzeugen
          </button>
        </div>
        {sfxAsset?.url && (
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 flex items-center justify-between gap-4">
            <audio controls src={sfxAsset.url} className="w-full" />
            <button
              onClick={() => window.open(sfxAsset.url, '_blank')}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/70">
            <Clock3 className="h-4 w-4 text-[#FF9900]" />
            <span className="text-xs font-bold uppercase tracking-[0.3em]">History</span>
          </div>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2"
          >
            {historyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Laden
          </button>
        </div>
        {historyError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {historyError}
          </div>
        )}
        {historyItems.length === 0 ? (
          <div className="text-xs text-white/40">Keine History geladen.</div>
        ) : (
          <div className="space-y-2">
            {historyItems.map((item: any) => {
              const itemId = item.history_item_id || item.id;
              return (
                <div
                  key={itemId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div className="text-xs text-white/70 line-clamp-2">
                    {item.text || item.name || itemId}
                  </div>
                  <button
                    onClick={() => itemId && importHistoryItem(itemId)}
                    className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
                  >
                    Importieren
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
