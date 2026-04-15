import type { MarketingMediaPrediction } from '@/lib/ai/contracts/marketing-media';

export type LegacyReplicateJobKind = 'faceswap' | 'motion-transfer';

export type LegacyReplicateWebhookJobType = 'legacy-faceswap' | 'legacy-motion-transfer';

export type LegacyReplicateJobReceipt = {
  ventureId: string;
  userId: string;
  replicateAuthSource?: 'user' | 'platform';
  model: string;
  cost: number;
  reservationId?: string | null;
  videoUrl?: string;
  faceUrl?: string;
  drivingVideoUrl?: string;
  characterImageUrl?: string;
  outputUrl?: string | null;
  refundedAt?: string | null;
  settledAt?: string | null;
  error?: string | null;
  processingId?: string | null;
  processingAt?: string | null;
  processingBy?: string | null;
  createdAt: string;
};

export type LegacyReplicatePrediction = MarketingMediaPrediction;

export type LegacyReplicateJobStatusResult = {
  status: string;
  outputUrl?: string | null;
  provider?: 'replicate';
  error?: string;
};

export type LegacyReplicateStartResult = {
  predictionId: string;
  status: string;
  provider: 'replicate';
  model: string;
  creditsUsed: number;
  tier?: string;
  outputUrl?: string;
  mock?: boolean;
};

export type LegacyReplicateUploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type LegacyReplicateErrorOptions = {
  code: string;
  status: number;
  details?: Record<string, unknown>;
};

export class LegacyReplicateError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, options: LegacyReplicateErrorOptions) {
    super(message);
    this.name = 'LegacyReplicateError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export class LegacyReplicateValidationError extends LegacyReplicateError {
  constructor(message: string, status = 400, details?: Record<string, unknown>) {
    super(message, { code: 'LEGACY_REPLICATE_VALIDATION', status, details });
    this.name = 'LegacyReplicateValidationError';
  }
}

export class LegacyReplicateNotFoundError extends LegacyReplicateError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'LEGACY_REPLICATE_NOT_FOUND', status: 404, details });
    this.name = 'LegacyReplicateNotFoundError';
  }
}

export class LegacyReplicateConfigurationError extends LegacyReplicateError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'LEGACY_REPLICATE_CONFIGURATION', status: 500, details });
    this.name = 'LegacyReplicateConfigurationError';
  }
}

export class LegacyReplicateQuotaExceededError extends LegacyReplicateError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'LEGACY_REPLICATE_QUOTA_EXCEEDED', status: 429, details });
    this.name = 'LegacyReplicateQuotaExceededError';
  }
}

export class LegacyReplicateCreditsError extends LegacyReplicateError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'INSUFFICIENT_CREDITS', status: 402, details });
    this.name = 'LegacyReplicateCreditsError';
  }
}

export const toLegacyReplicateWebhookJobType = (
  jobKind: LegacyReplicateJobKind
): LegacyReplicateWebhookJobType =>
  jobKind === 'faceswap' ? 'legacy-faceswap' : 'legacy-motion-transfer';

export const getLegacyReplicateJobFailureReason = (jobKind: LegacyReplicateJobKind) =>
  jobKind === 'faceswap' ? 'faceswap-failed' : 'motion-transfer-failed';

export const getLegacyReplicateJobDefaultError = (jobKind: LegacyReplicateJobKind) =>
  jobKind === 'faceswap' ? 'Avatar fehlgeschlagen' : 'Motion Transfer fehlgeschlagen';

export const getLegacyReplicateJobProcessingError = (jobKind: LegacyReplicateJobKind) =>
  jobKind === 'faceswap'
    ? 'Output-Verarbeitung fehlgeschlagen'
    : 'Motion Transfer Output-Verarbeitung fehlgeschlagen';

export const getLegacyReplicateJobTags = (jobKind: LegacyReplicateJobKind) =>
  jobKind === 'faceswap'
    ? ['faceswap', 'replicate']
    : ['motion-transfer', 'wan-animate', 'replicate'];

export const toLegacyReplicateErrorResponse = (error: unknown) => {
  if (error instanceof LegacyReplicateError) {
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
        error: error.message || 'Legacy Replicate job failed',
        code: 'LEGACY_REPLICATE_UNEXPECTED',
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Legacy Replicate job failed',
      code: 'LEGACY_REPLICATE_UNEXPECTED',
    },
  };
};
