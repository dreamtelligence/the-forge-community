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

type LegacyReplicateJobErrorOptions = {
  code: string;
  status: number;
  details?: Record<string, unknown>;
};

export class LegacyReplicateJobError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, options: LegacyReplicateJobErrorOptions) {
    super(message);
    this.name = 'LegacyReplicateJobError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export class LegacyReplicateJobNotFoundError extends LegacyReplicateJobError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'LEGACY_REPLICATE_NOT_FOUND', status: 404, details });
    this.name = 'LegacyReplicateJobNotFoundError';
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

export const toLegacyReplicateJobErrorResponse = (error: unknown) => {
  if (error instanceof LegacyReplicateJobError) {
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
