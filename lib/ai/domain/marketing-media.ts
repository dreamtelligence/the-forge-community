import {
  type MarketingMediaJobReceipt,
  type MarketingMediaMode,
  type ParsedMarketingMediaFormData,
  MarketingMediaValidationError,
} from '@/lib/ai/contracts/marketing-media';
import { estimateVideoCredits } from '@/lib/billing/credit-pricing';

export type MarketingMediaBrandContext = {
  brandName?: string | null;
  productCategory?: string | null;
  primaryColor?: string | null;
  toneOfVoice?: string | null;
  characterPrompt?: string | null;
};

type MarketingMediaProvider = 'replicate';

export type MarketingMediaModelConfig = {
  id: string;
  label: string;
  modes: MarketingMediaMode[];
  outputType: 'image' | 'video';
  provider: MarketingMediaProvider;
  supportsImageInput?: boolean;
  supportsRenderingSpeed?: boolean;
  supportsStylePreset?: boolean;
  supportsAudioToggle?: boolean;
};

export type MarketingMediaGenerationPlan = {
  mode: MarketingMediaMode;
  prompt: string;
  negativePrompt: string;
  outputResolution: string | null;
  originTag?: string;
  modelConfig: MarketingMediaModelConfig;
  aspectRatio: string;
  duration?: number;
  guidance?: number;
  seed?: number;
  steps?: number;
  generateAudio?: boolean;
  isVideoOutput: boolean;
  hourlyLimit: number;
  cost: number;
  estimatedProviderCostEur?: number;
  estimatedProviderCostUsd?: number;
};

export type MarketingMediaReplicateInput = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  width: number;
  height: number;
  seed?: number;
  steps?: number;
  guidance?: number;
  duration?: number;
  generateAudio?: boolean;
  imageUrl?: string | string[];
  endImageUrl?: string;
  /** Gewuenschte Video-Aufloesung (720p/1080p); nur Modelle mit Aufloesungswahl nutzen sie. */
  resolution?: string | null;
};

const IMAGE_COSTS: Record<string, number> = {
  'text-to-image': 4,
  'image-to-image': 5,
};

const VIDEO_FALLBACK_COSTS: Record<string, number> = {
  'text-to-video': 35,
  'image-to-video': 40,
};

// Stand 05.11.2026, Schemas live von replicate.com/<model>/api/schema geprueft.
export const MODEL_CONFIGS: Record<string, MarketingMediaModelConfig> = {
  'black-forest-labs/flux-3-image': {
    id: 'black-forest-labs/flux-3-image',
    label: 'Flux 3',
    modes: ['text-to-image'],
    outputType: 'image',
    provider: 'replicate',
  },
  'black-forest-labs/flux-2-pro': {
    id: 'black-forest-labs/flux-2-pro',
    label: 'Flux 2 Pro',
    modes: ['text-to-image'],
    outputType: 'image',
    provider: 'replicate',
  },
  'black-forest-labs/flux-1.1-pro': {
    id: 'black-forest-labs/flux-1.1-pro',
    label: 'Flux 1.1 Pro',
    modes: ['text-to-image'],
    outputType: 'image',
    provider: 'replicate',
  },
  'kwaivgi/kling-v4.0': {
    id: 'kwaivgi/kling-v4.0',
    label: 'Kling 4.0',
    modes: ['text-to-video', 'image-to-video'],
    outputType: 'video',
    supportsImageInput: true,
    provider: 'replicate',
  },
  'kwaivgi/kling-v2.6': {
    id: 'kwaivgi/kling-v2.6',
    label: 'Kling 2.6 Pro · Audio',
    modes: ['text-to-video', 'image-to-video'],
    outputType: 'video',
    supportsImageInput: true,
    supportsAudioToggle: true,
    provider: 'replicate',
  },
  'minimax/h3': {
    id: 'minimax/h3',
    label: 'MiniMax H3',
    modes: ['text-to-video', 'image-to-video'],
    outputType: 'video',
    supportsImageInput: true,
    provider: 'replicate',
  },
  'minimax/video-01': {
    id: 'minimax/video-01',
    label: 'Minimax Video-01 (Legacy)',
    modes: ['text-to-video'],
    outputType: 'video',
    provider: 'replicate',
  },
  'luma/ray-3.2': {
    id: 'luma/ray-3.2',
    label: 'Luma Ray 3.2',
    modes: ['text-to-video', 'image-to-video'],
    outputType: 'video',
    supportsImageInput: true,
    provider: 'replicate',
  },
  'openai/sora-2': {
    id: 'openai/sora-2',
    label: 'Sora 2',
    modes: ['text-to-video', 'image-to-video'],
    outputType: 'video',
    supportsImageInput: true,
    provider: 'replicate',
  },
  'google/nano-banana-2.1': {
    id: 'google/nano-banana-2.1',
    label: 'Nano Banana 2.1 · Multi-Image Blending',
    modes: ['image-to-image'],
    outputType: 'image',
    provider: 'replicate',
    supportsImageInput: true,
  },
  'google/nano-banana': {
    id: 'google/nano-banana',
    label: 'Nano Banana (Legacy)',
    modes: ['image-to-image'],
    outputType: 'image',
    provider: 'replicate',
    supportsImageInput: true,
  },
  'google/veo-3.1': {
    id: 'google/veo-3.1',
    label: 'Veo 3.1 · Enterprise Video',
    modes: ['text-to-video', 'image-to-video'],
    outputType: 'video',
    provider: 'replicate',
    supportsImageInput: true,
    supportsAudioToggle: true,
  },
};

/**
 * Abgeschaltete Replicate-Modelle (404 seit 2026) -> Nachfolger, damit gespeicherte
 * Presets/Clients mit alten IDs weiter funktionieren.
 */
export const RETIRED_MODEL_REPLACEMENTS: Record<string, string> = {
  'kwaivgi/kling-v1.5-pro': 'kwaivgi/kling-v4.0',
  'lumaai/dream-machine': 'luma/ray-3.2',
};

const MEDIA_MODES: MarketingMediaMode[] = [
  'text-to-image',
  'text-to-video',
  'image-to-video',
  'image-to-image',
];

const DEFAULT_MODEL_BY_MODE: Record<MarketingMediaMode, string> = {
  'text-to-image': 'black-forest-labs/flux-3-image',
  'text-to-video': 'minimax/h3',
  'image-to-video': 'kwaivgi/kling-v4.0',
  'image-to-image': 'google/nano-banana-2.1',
};

const MODEL_ALLOWED_ASPECTS: Record<string, string[]> = {
  'kwaivgi/kling-v4.0': ['16:9', '9:16', '1:1', '21:9'],
  'kwaivgi/kling-v2.6': ['16:9', '9:16', '1:1'],
  'minimax/h3': ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
  'google/veo-3.1': ['16:9', '9:16'],
  'minimax/video-01': ['16:9', '9:16'],
  'luma/ray-3.2': ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
  'openai/sora-2': ['16:9', '9:16'],
};

const MODEL_ALLOWED_DURATIONS: Record<string, number[]> = {
  'kwaivgi/kling-v4.0': [5, 10, 15],
  'kwaivgi/kling-v2.6': [5, 10],
  'minimax/h3': [5, 6, 8, 10],
  'luma/ray-3.2': [5],
  'google/veo-3.1': [4, 6, 8],
  'openai/sora-2': [4, 8, 12],
};

const MODEL_RANGES: Record<string, { guidance?: { min: number; max: number } }> = {};

const OUTPUT_RESOLUTIONS = new Set(['720p', '1080p', '4k']);

const parseLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_PROMPT_CHARS = parseLimit(process.env.MARKETING_MEDIA_MAX_PROMPT_CHARS, 1200);
export const HOURLY_LIMITS = {
  image: parseLimit(process.env.MARKETING_MEDIA_IMAGE_HOURLY_LIMIT, 50),
  video: parseLimit(process.env.MARKETING_MEDIA_VIDEO_HOURLY_LIMIT, 10),
};

export const normalizeOutputResolution = (value: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  return OUTPUT_RESOLUTIONS.has(normalized) ? normalized : null;
};

export const normalizeTag = (value: string | undefined) => {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) return undefined;
  if (!/^[a-z0-9-]+$/.test(trimmed)) return undefined;
  return trimmed;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const isValidMarketingMediaMode = (value: string): value is MarketingMediaMode =>
  MEDIA_MODES.includes(value as MarketingMediaMode);

export const resolveAllowedMarketingMediaModel = (
  mode: MarketingMediaMode,
  requestedModel: string | null
) => {
  const fallback = DEFAULT_MODEL_BY_MODE[mode];
  if (!requestedModel) return MODEL_CONFIGS[fallback];
  const modelConfig = MODEL_CONFIGS[RETIRED_MODEL_REPLACEMENTS[requestedModel] ?? requestedModel];
  if (!modelConfig) return null;
  if (!modelConfig.modes.includes(mode)) return null;
  return modelConfig;
};

export const normalizeAspectRatio = (modelId: string, aspectRatio: string) => {
  const allowed = MODEL_ALLOWED_ASPECTS[modelId];
  if (!allowed || !allowed.length) return aspectRatio;
  return allowed.includes(aspectRatio) ? aspectRatio : allowed[0];
};

export const normalizeDuration = (modelId: string, duration?: number) => {
  if (typeof duration !== 'number') return undefined;
  const allowed = MODEL_ALLOWED_DURATIONS[modelId];
  if (!allowed || !allowed.length) return duration;
  return allowed.includes(duration) ? duration : allowed[0];
};

export const normalizeGuidance = (modelId: string, guidance?: number) => {
  if (typeof guidance !== 'number') return undefined;
  const range = MODEL_RANGES[modelId]?.guidance;
  if (!range) return guidance;
  return clampNumber(guidance, range.min, range.max);
};

export const resolveImageDimensions = (aspectRatio: string) => {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1024, height: 576 };
    case '9:16':
      return { width: 576, height: 1024 };
    case '4:5':
      return { width: 1024, height: 1280 };
    case '3:2':
      return { width: 1152, height: 768 };
    default:
      return { width: 1024, height: 1024 };
  }
};

export const getMarketingMediaAssetDimensions = (aspectRatio: string, isVideo: boolean) => {
  if (!isVideo) return resolveImageDimensions(aspectRatio);
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '9:16':
      return { width: 720, height: 1280 };
    case '4:5':
      return { width: 720, height: 900 };
    case '3:2':
      return { width: 1280, height: 853 };
    default:
      return { width: 1024, height: 1024 };
  }
};

export const buildBrandContext = (brandDNA: MarketingMediaBrandContext | null | undefined) => {
  if (!brandDNA) return '';

  const parts = [
    brandDNA.brandName ? `Brand: ${brandDNA.brandName}` : null,
    brandDNA.productCategory ? `Category: ${brandDNA.productCategory}` : null,
    brandDNA.primaryColor ? `Primary color: ${brandDNA.primaryColor}` : null,
    brandDNA.toneOfVoice ? `Tone: ${brandDNA.toneOfVoice}` : null,
  ].filter(Boolean);

  if (!parts.length) return '';
  return `\n\nBrand context: ${parts.join(' | ')}`;
};

export const buildCharacterContext = (brandDNA: MarketingMediaBrandContext | null | undefined) => {
  if (!brandDNA?.characterPrompt) return '';
  return `\n\nCharacter DNA: ${brandDNA.characterPrompt}`;
};

export const buildFinalMarketingMediaPrompt = (params: {
  prompt: string;
  useBrandContext: boolean;
  useCharacterPrompt: boolean;
  brandDNA: MarketingMediaBrandContext | null | undefined;
}) => {
  let finalPrompt = params.prompt;
  if (params.useBrandContext) finalPrompt = `${finalPrompt}${buildBrandContext(params.brandDNA)}`;
  if (params.useCharacterPrompt) finalPrompt = `${finalPrompt}${buildCharacterContext(params.brandDNA)}`;
  if (finalPrompt.length > MAX_PROMPT_CHARS) {
    throw new MarketingMediaValidationError('Prompt ist zu lang (inkl. Kontext).');
  }
  return finalPrompt;
};

export const resolveMarketingMediaGenerationPlan = (
  parsed: ParsedMarketingMediaFormData
): MarketingMediaGenerationPlan => {
  if (!parsed.modeValue || !parsed.prompt || !isValidMarketingMediaMode(parsed.modeValue)) {
    throw new MarketingMediaValidationError('Fehlende Parameter');
  }

  if (parsed.prompt.length > MAX_PROMPT_CHARS) {
    throw new MarketingMediaValidationError('Prompt ist zu lang.');
  }

  const mode = parsed.modeValue;
  const modelConfig = resolveAllowedMarketingMediaModel(mode, parsed.model || null);
  if (!modelConfig) {
    throw new MarketingMediaValidationError('Modell nicht verfügbar für diesen Modus.');
  }

  const aspectRatio = normalizeAspectRatio(modelConfig.id, parsed.rawAspectRatio);
  const duration = normalizeDuration(modelConfig.id, parsed.duration);
  const guidance = normalizeGuidance(modelConfig.id, parsed.guidance);
  const isVideoOutput = modelConfig.outputType === 'video';

  const videoEstimate = isVideoOutput
    ? estimateVideoCredits({
        modelId: modelConfig.id,
        durationSeconds: duration,
        generateAudio: modelConfig.supportsAudioToggle ? parsed.generateAudio : true,
        resolution: parsed.outputResolution,
        fallbackCredits: VIDEO_FALLBACK_COSTS[mode] ?? 35,
        minimumCredits: 1,
      })
    : null;

  const cost = isVideoOutput
    ? videoEstimate?.credits ?? (VIDEO_FALLBACK_COSTS[mode] ?? 35)
    : Number.isFinite(IMAGE_COSTS[mode]) ? IMAGE_COSTS[mode] : 20;

  return {
    mode,
    prompt: parsed.prompt,
    negativePrompt: parsed.negativePrompt,
    outputResolution: normalizeOutputResolution(parsed.outputResolution),
    originTag: normalizeTag(parsed.originTag),
    modelConfig,
    aspectRatio,
    duration,
    guidance,
    seed: parsed.seed,
    steps: parsed.steps,
    generateAudio: parsed.generateAudio,
    isVideoOutput,
    hourlyLimit: isVideoOutput ? HOURLY_LIMITS.video : HOURLY_LIMITS.image,
    cost,
    estimatedProviderCostEur: videoEstimate?.costEur ?? undefined,
    estimatedProviderCostUsd:
      videoEstimate?.costEur && videoEstimate.usdPerSecond && duration
        ? videoEstimate.usdPerSecond * duration
        : undefined,
  };
};

export const getMarketingMediaContentInfo = (
  contentType: string | null,
  fallbackType: 'image' | 'video'
) => {
  const ct = contentType?.toLowerCase() || '';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (ct.includes('image/webp')) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  if (ct.includes('image/png')) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (ct.includes('video/mp4') || ct.includes('video/quicktime') || fallbackType === 'video') {
    return { contentType: 'video/mp4', ext: 'mp4' };
  }
  return { contentType: 'image/png', ext: 'png' };
};

export const normalizeMarketingMediaPredictionError = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    const serialized = JSON.stringify(value);
    return serialized === '{}' ? null : serialized;
  } catch {
    return null;
  }
};

export const normalizeMarketingMediaProcessingError = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    const serialized = JSON.stringify(value);
    return serialized === '{}' ? null : serialized;
  } catch {
    return null;
  }
};

export const isFreshMarketingMediaLock = (lockId?: string | null, lockAt?: string | null) => {
  if (!lockId || !lockAt) return false;
  const lockTime = Date.parse(lockAt);
  if (Number.isNaN(lockTime)) return false;
  return Date.now() - lockTime < 1000 * 60 * 10;
};

export const hasCompletedMarketingMediaAssets = (receipt: MarketingMediaJobReceipt) =>
  Array.isArray(receipt.assets) && receipt.assets.length > 0;
