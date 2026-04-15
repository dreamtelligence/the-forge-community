import type { MarketingMediaPrediction } from '@/lib/ai/contracts/marketing-media';

export type ReplicateWebhookHeaders = {
  webhookId: string;
  webhookTimestamp: string;
  webhookSignatures: string;
};

export type VerifiedReplicateWebhook = {
  deliveryId: string;
  prediction: MarketingMediaPrediction;
  rawBody: string;
};

export type WebhookReceiptAcquireResult =
  | { kind: 'acquired'; receiptId: string }
  | { kind: 'duplicate_processed'; receiptId: string }
  | { kind: 'duplicate_in_progress'; receiptId: string };

export type ReplicateWebhookOutcome =
  | { kind: 'processed'; deliveryId: string; predictionId: string; jobType: 'marketing-media' | 'legacy-faceswap' | 'legacy-motion-transfer' | 'unknown' }
  | { kind: 'duplicate_processed'; deliveryId: string }
  | { kind: 'duplicate_in_progress'; deliveryId: string };

type ReplicateWebhookErrorOptions = {
  code: string;
  status: number;
  details?: Record<string, unknown>;
};

export class ReplicateWebhookError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, options: ReplicateWebhookErrorOptions) {
    super(message);
    this.name = 'ReplicateWebhookError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export class ReplicateWebhookVerificationError extends ReplicateWebhookError {
  constructor(message: string, status = 400, details?: Record<string, unknown>) {
    super(message, { code: 'REPLICATE_WEBHOOK_VERIFICATION', status, details });
    this.name = 'ReplicateWebhookVerificationError';
  }
}

export class ReplicateWebhookProcessingError extends ReplicateWebhookError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'REPLICATE_WEBHOOK_PROCESSING', status: 500, details });
    this.name = 'ReplicateWebhookProcessingError';
  }
}

export const toReplicateWebhookErrorResponse = (error: unknown) => {
  if (error instanceof ReplicateWebhookError) {
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
        error: error.message,
        code: 'REPLICATE_WEBHOOK_UNEXPECTED',
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Unexpected webhook processing failure',
      code: 'REPLICATE_WEBHOOK_UNEXPECTED',
    },
  };
};
