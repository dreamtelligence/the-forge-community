export type MarketingMediaMode =
  | 'text-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'image-to-image';

export type MarketingMediaProvider = 'replicate';

export type MarketingMediaUploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type MarketingMediaCachedAsset = {
  id?: string;
  url: string;
  type: 'image' | 'video';
  isPublic?: boolean;
};

export type MarketingMediaJobReceipt = {
  ventureId: string;
  userId: string;
  replicateAuthSource?: 'user' | 'platform';
  mode: MarketingMediaMode;
  model: string;
  prompt: string;
  aspectRatio: string;
  cost: number;
  reservationId: string | null;
  originTag?: string;
  outputType: 'image' | 'video';
  creditsRemaining?: number;
  assets?: MarketingMediaCachedAsset[];
  error?: string;
  settledAt?: string;
  refundedAt?: string;
  estimatedProviderCostEur?: number;
  estimatedProviderCostUsd?: number;
  fxRate?: number;
  processingId?: string | null;
  processingAt?: string | null;
  processingBy?: string | null;
  createdAt: string;
};

export type MarketingMediaPrediction = {
  id: string;
  status: string;
  output?: unknown;
  error?: unknown;
};

export type ParsedMarketingMediaFormData = {
  modeValue: string;
  prompt: string;
  model: string;
  rawAspectRatio: string;
  useBrandContext: boolean;
  useCharacterPrompt: boolean;
  negativePrompt: string;
  outputResolution: string | null;
  originTag?: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  duration?: number;
  generateAudio?: boolean;
  imageFile: FormDataEntryValue | null;
  endImageFile: FormDataEntryValue | null;
  existingImageUrl: FormDataEntryValue | null;
  existingEndImageUrl: FormDataEntryValue | null;
  imageFiles: FormDataEntryValue[];
};

export type MarketingMediaStartResult = {
  predictionId: string;
  status: string;
  provider: MarketingMediaProvider;
  creditsUsed: number;
};

export type MarketingMediaStatusResult = {
  status: string;
  assets?: MarketingMediaCachedAsset[] | null;
  provider?: MarketingMediaProvider;
  creditsRemaining?: number | null;
  error?: string;
};

type MarketingMediaErrorOptions = {
  code: string;
  status: number;
  details?: Record<string, unknown>;
};

export class MarketingMediaError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, options: MarketingMediaErrorOptions) {
    super(message);
    this.name = 'MarketingMediaError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export class MarketingMediaValidationError extends MarketingMediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'MARKETING_MEDIA_VALIDATION', status: 400, details });
    this.name = 'MarketingMediaValidationError';
  }
}

export class MarketingMediaNotFoundError extends MarketingMediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'MARKETING_MEDIA_NOT_FOUND', status: 404, details });
    this.name = 'MarketingMediaNotFoundError';
  }
}

export class MarketingMediaConfigurationError extends MarketingMediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'MARKETING_MEDIA_CONFIGURATION', status: 500, details });
    this.name = 'MarketingMediaConfigurationError';
  }
}

export class MarketingMediaQuotaExceededError extends MarketingMediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'MARKETING_MEDIA_QUOTA_EXCEEDED', status: 429, details });
    this.name = 'MarketingMediaQuotaExceededError';
  }
}

export class MarketingMediaCreditsError extends MarketingMediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'INSUFFICIENT_CREDITS', status: 402, details });
    this.name = 'MarketingMediaCreditsError';
  }
}

export const parseOptionalNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseMarketingMediaFormData = (
  formData: FormData
): ParsedMarketingMediaFormData => {
  const generateAudioRaw = String(formData.get('generateAudio') || '').trim();

  return {
    modeValue: String(formData.get('mode') || ''),
    prompt: String(formData.get('prompt') || '').trim(),
    model: String(formData.get('model') || '').trim(),
    rawAspectRatio: String(formData.get('aspectRatio') || '1:1'),
    useBrandContext: formData.get('useBrandContext') === 'true',
    useCharacterPrompt: formData.get('useCharacterPrompt') === 'true',
    negativePrompt: String(formData.get('negativePrompt') || '').trim(),
    outputResolution: String(formData.get('outputResolution') || '').trim().toLowerCase() || null,
    originTag: String(formData.get('originTag') || '').trim() || undefined,
    steps: parseOptionalNumber(formData.get('steps')),
    guidance: parseOptionalNumber(formData.get('guidance')),
    seed: parseOptionalNumber(formData.get('seed')),
    duration: parseOptionalNumber(formData.get('duration')),
    generateAudio:
      generateAudioRaw === 'true' ? true : generateAudioRaw === 'false' ? false : undefined,
    imageFile: formData.get('image'),
    endImageFile: formData.get('endImage'),
    existingImageUrl: formData.get('existingImageUrl'),
    existingEndImageUrl: formData.get('existingEndImageUrl'),
    imageFiles: formData.getAll('images'),
  };
};

export const toMarketingMediaErrorResponse = (error: unknown) => {
  if (error instanceof MarketingMediaError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        code: error.code,
        ...(error.details ?? {}),
      },
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        error: error.message || 'Generation failed',
        code: 'MARKETING_MEDIA_UNEXPECTED',
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Generation failed',
      code: 'MARKETING_MEDIA_UNEXPECTED',
    },
  };
};
