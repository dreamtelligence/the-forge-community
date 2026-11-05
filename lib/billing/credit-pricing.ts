const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readEnvNumber = (name: string, fallback: number) =>
  parseNumber(process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`], fallback);

const clampPositive = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value);
};

export const CREDIT_EUR_VALUE = clampPositive(readEnvNumber('CREDIT_EUR_VALUE', 0.1), 0.1);

export const CREDIT_MARGIN = clampPositive(readEnvNumber('CREDIT_MARGIN', 1), 1);
export const CREDIT_PRICING_MODE =
  (process.env.CREDIT_PRICING_MODE || process.env.NEXT_PUBLIC_CREDIT_PRICING_MODE || 'passthrough')
    .toLowerCase();
export const USAGE_PLATFORM_FEE_PERCENT = clampPositive(
  readEnvNumber('USAGE_PLATFORM_FEE_PERCENT', 0),
  0
);
export const USAGE_PLATFORM_FEE_FIXED_EUR = clampPositive(
  readEnvNumber('USAGE_PLATFORM_FEE_FIXED_EUR', 0),
  0
);

export const ELEVENLABS_EUR_PER_1K_CREDITS = clampPositive(
  readEnvNumber('ELEVENLABS_EUR_PER_1K_CREDITS', 0.2),
  0.2
);

export const USD_EUR_RATE = clampPositive(readEnvNumber('USD_EUR_RATE', 1), 1);

type VideoRate = {
  withAudio: number;
  withoutAudio: number;
};

type VideoResolution = '720p' | '1080p' | '4k';

type VideoRateSet = {
  default: VideoRate;
  perResolution?: Partial<Record<VideoResolution, VideoRate>>;
};

const DEFAULT_VIDEO_RATES_USD: Record<string, VideoRateSet> = {
  // Replicate-Listenpreise, live geprueft am 05.11.2026. Per Env ueberschreibbar.
  'google/veo-3.1': {
    default: { withAudio: 0.4, withoutAudio: 0.2 },
  },
  'google/veo-3.1-fast': {
    default: { withAudio: 0.15, withoutAudio: 0.1 },
  },
  // Kling 4.0: kein Audio-Schalter; 720p 0.157 $/s, 1080p 0.235 $/s
  'kwaivgi/kling-v4.0': {
    default: { withAudio: 0.157, withoutAudio: 0.157 },
    perResolution: {
      '720p': { withAudio: 0.157, withoutAudio: 0.157 },
      '1080p': { withAudio: 0.235, withoutAudio: 0.235 },
    },
  },
  'kwaivgi/kling-v2.6': {
    default: { withAudio: 0.14, withoutAudio: 0.07 },
  },
  // MiniMax H3 wird immer mit 768P angefragt: 0.08 $/s
  'minimax/h3': {
    default: { withAudio: 0.08, withoutAudio: 0.08 },
  },
  // Sora 2 (Replicate-Abrechnung, ohne eigenen OpenAI-Key): 0.10 $/s
  'openai/sora-2': {
    default: { withAudio: 0.1, withoutAudio: 0.1 },
  },
  // Luma Ray 3.2 wird mit 720p / 5s angefragt: 0.30 $ pro Video = 0.06 $/s
  'luma/ray-3.2': {
    default: { withAudio: 0.06, withoutAudio: 0.06 },
  },
};

const toEnvKey = (modelId: string) =>
  modelId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const readVideoUsdPerSec = (modelId: string, generateAudio: boolean, resolution?: string | null) => {
  const suffix = generateAudio ? 'AUDIO' : 'NO_AUDIO';
  const modelKey = toEnvKey(modelId);
  const resolutionKey = resolution ? toEnvKey(resolution) : null;

  if (resolutionKey) {
    const resolutionSpecific = readEnvNumber(
      `VIDEO_${modelKey}_${resolutionKey}_${suffix}_USD_PER_SEC`,
      Number.NaN
    );
    if (Number.isFinite(resolutionSpecific) && resolutionSpecific > 0) return resolutionSpecific;
  }

  const modelSpecific = readEnvNumber(`VIDEO_${modelKey}_${suffix}_USD_PER_SEC`, Number.NaN);
  if (Number.isFinite(modelSpecific) && modelSpecific > 0) return modelSpecific;

  const fallbackDefault = DEFAULT_VIDEO_RATES_USD[modelId];
  if (fallbackDefault) {
    const perResolution = resolution && fallbackDefault.perResolution?.[resolution as VideoResolution];
    const resolutionRate = perResolution
      ? generateAudio
        ? perResolution.withAudio
        : perResolution.withoutAudio
      : 0;
    if (Number.isFinite(resolutionRate) && resolutionRate > 0) return resolutionRate;

    const defaultRate = generateAudio
      ? fallbackDefault.default.withAudio
      : fallbackDefault.default.withoutAudio;
    if (Number.isFinite(defaultRate) && defaultRate > 0) return defaultRate;
  }

  const globalFallback = readEnvNumber(`VIDEO_${suffix}_USD_PER_SEC`, Number.NaN);
  if (Number.isFinite(globalFallback) && globalFallback > 0) return globalFallback;

  return null;
};

const isTurboOrFlashModel = (modelId?: string | null) => {
  const id = (modelId || '').toLowerCase();
  return id.includes('turbo') || id.includes('flash');
};

export const calculateCreditsFromEur = (costEur: number, minimum = 1) => {
  if (!Number.isFinite(costEur) || costEur <= 0) return Math.max(1, minimum);
  const useLegacyMargin = CREDIT_PRICING_MODE === 'margin' || CREDIT_PRICING_MODE === 'legacy';
  const providerCost = costEur * (useLegacyMargin ? Math.max(1, CREDIT_MARGIN) : 1);
  const billedCost =
    providerCost +
    providerCost * Math.max(0, USAGE_PLATFORM_FEE_PERCENT) +
    Math.max(0, USAGE_PLATFORM_FEE_FIXED_EUR);
  const credits = Math.ceil(billedCost / Math.max(0.0001, CREDIT_EUR_VALUE));
  return Math.max(minimum, credits);
};

export const estimateVideoCredits = (options: {
  modelId: string;
  durationSeconds: number | null | undefined;
  generateAudio?: boolean;
  resolution?: string | null;
  minimumCredits?: number;
  fallbackCredits?: number;
}) => {
  const durationSeconds = Math.max(0, Number(options.durationSeconds ?? 0));
  const fallback = Math.max(1, options.fallbackCredits ?? 1);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return {
      credits: Math.max(fallback, options.minimumCredits ?? 1),
      costEur: null,
      usdPerSecond: null,
    };
  }

  const generateAudio = options.generateAudio ?? true;
  const usdPerSecond = readVideoUsdPerSec(options.modelId, generateAudio, options.resolution);

  if (!usdPerSecond) {
    return {
      credits: Math.max(fallback, options.minimumCredits ?? 1),
      costEur: null,
      usdPerSecond: null,
    };
  }

  const costEur = durationSeconds * usdPerSecond * Math.max(0.0001, USD_EUR_RATE);
  const credits = calculateCreditsFromEur(costEur, options.minimumCredits ?? 1);

  return {
    credits,
    costEur,
    usdPerSecond,
  };
};

export const estimateElevenLabsTtsCredits = (options: {
  textLength: number;
  modelId?: string | null;
  voiceMultiplier?: number;
  minimumCredits?: number;
}) => {
  const textLength = Math.max(0, Math.floor(options.textLength));
  const voiceMultiplier = clampPositive(options.voiceMultiplier ?? 1, 1) || 1;
  const perCharCredits = isTurboOrFlashModel(options.modelId) ? 0.5 : 1;

  const elevenCredits = Math.ceil(textLength * perCharCredits * voiceMultiplier);
  const eurPerCredit = Math.max(0, ELEVENLABS_EUR_PER_1K_CREDITS) / 1000;
  const costEur = elevenCredits * eurPerCredit;
  const credits = calculateCreditsFromEur(costEur, options.minimumCredits ?? 1);

  return {
    credits,
    elevenCredits,
    costEur,
    perCharCredits
  };
};
