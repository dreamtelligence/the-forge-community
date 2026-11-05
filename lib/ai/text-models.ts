/**
 * Zentrale Text-/Chat-Modell-IDs (Stand: 05.11.2026, live geprueft gegen
 * ai.google.dev/gemini-api/docs/models + /deprecations, platform.kimi.ai/docs/models,
 * console.groq.com/docs/deprecations).
 *
 * Env-Overrides bleiben moeglich, aber bekannte abgeschaltete IDs werden ignoriert,
 * damit ein veralteter Vercel-Wert (z. B. GEMINI_MODEL=gemini-2.0-flash-lite)
 * nicht den Code-Default aushebelt.
 */

export const GEMINI_TEXT_MODELS = {
  /** Allround-Flash (Nachfolger von gemini-2.0-flash laut Google). Text/Bild/Video/Audio/PDF rein. */
  flash: 'gemini-3.6-flash',
  /** Guenstig/schnell (Nachfolger von gemini-2.0-flash-lite / 2.5-flash). */
  lite: 'gemini-3.5-flash-lite',
  /** Staerkeres Modell (Nachfolger von gemini-2.5-pro / 1.5-pro laut Google). */
  pro: 'gemini-3.8-flash',
} as const;

/** Bildgenerierung direkt ueber die Gemini API ("Nano Banana"). */
export const GEMINI_IMAGE_MODELS = {
  /** Nano Banana 2.1 - von Google empfohlener Nachfolger fuer gemini-2.5-flash-image(-preview). */
  standard: 'gemini-nano-banana-2.1',
  /** Nano Banana 2 (Fallback, falls 2.1 im Key/Projekt nicht freigeschaltet ist). */
  standardFallback: 'gemini-3.1-flash-image',
  /** Nano Banana Pro (GA, Nachfolger von gemini-3-pro-image-preview). */
  pro: 'gemini-3-pro-image',
} as const;

export const KIMI_MODEL = 'kimi-k3';
export const GROQ_MODEL = 'openai/gpt-oss-120b';

/**
 * Abgeschaltete oder nicht mehr erreichbare IDs. Taucht eine davon in einer
 * Env-Variable auf, wird sie uebersprungen.
 */
const RETIRED_MODEL_IDS = new Set([
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-2.5-flash-image-preview',
  'gemini-3-pro-preview',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-lite-preview',
  // abgekuendigt (Abschaltung angekuendigt) - Env-Werte damit ebenfalls ueberspringen
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-image',
  'veo-2.0-generate-001',
  'veo-3.0-generate-001',
  'veo-3.0-fast-generate-001',
  'veo-3.0-generate-preview',
  'veo-3.0-fast-generate-preview',
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
  'veo-3.1-lite-generate-preview',
  'kimi-k2.5',
  'llama-3.1-70b-versatile',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]);

export const isRetiredModelId = (modelId: string | null | undefined) =>
  !!modelId && RETIRED_MODEL_IDS.has(modelId.trim());

/** Erstes gesetztes, nicht abgeschaltetes Modell aus den Kandidaten. */
export const pickModel = (...candidates: Array<string | null | undefined>) => {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && !isRetiredModelId(value)) return value;
  }
  return GEMINI_TEXT_MODELS.flash;
};

type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Gemini 3.x denkt standardmaessig; Denk-Tokens zaehlen gegen maxOutputTokens.
 * Bei kleinen Token-Limits deshalb ein niedriges Level setzen, sonst kommt eine
 * leere Antwort zurueck. gemini-3.8-flash / gemini-4-* kennen kein "minimal".
 */
export const geminiThinkingConfig = (
  model: string,
  preferred: GeminiThinkingLevel = 'minimal'
): { thinkingLevel: GeminiThinkingLevel } | undefined => {
  const id = model.toLowerCase();
  if (!/^gemini-(3|4)/.test(id) || id.includes('-image')) return undefined;
  const supportsMinimal = !(id.startsWith('gemini-3.8') || id.startsWith('gemini-4'));
  if (preferred === 'minimal' && !supportsMinimal) return { thinkingLevel: 'low' };
  return { thinkingLevel: preferred };
};

/** Zum Einspreizen in generationConfig: `{ ...withGeminiThinking(model) }`. */
export const withGeminiThinking = (
  model: string,
  preferred: GeminiThinkingLevel = 'minimal'
): { thinkingConfig?: { thinkingLevel: GeminiThinkingLevel } } => {
  const thinkingConfig = geminiThinkingConfig(model, preferred);
  return thinkingConfig ? { thinkingConfig } : {};
};
