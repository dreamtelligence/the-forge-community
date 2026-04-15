import crypto from 'crypto';
import {
  type ReplicateWebhookHeaders,
  type VerifiedReplicateWebhook,
  ReplicateWebhookVerificationError,
} from '@/lib/ai/contracts/replicate-webhook';

const WEBHOOK_TOLERANCE_SECONDS = 60 * 5;

const decodeWebhookSecret = (secret: string) => {
  if (!secret.startsWith('whsec_')) {
    return Buffer.from(secret, 'utf8');
  }
  const raw = secret.slice('whsec_'.length).replace(/-/g, '+').replace(/_/g, '/');
  const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
};

const parseWebhookSignatures = (header: string) =>
  header
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(','))
    .filter(([version, signature]) => version === 'v1' && Boolean(signature))
    .map(([, signature]) => signature);

const resolveReplicateWebhookSecret = () =>
  process.env.REPLICATE_WEBHOOK_SECRET || process.env.REPLICATE_WEBHOOK_;

export const verifyReplicateWebhook = (params: {
  body: string;
  headers: ReplicateWebhookHeaders;
}): VerifiedReplicateWebhook => {
  const secret = resolveReplicateWebhookSecret();
  if (!secret) {
    throw new ReplicateWebhookVerificationError('Missing Replicate webhook secret', 500);
  }

  const parsedTimestamp = Number(params.headers.webhookTimestamp);
  const timestampSeconds = parsedTimestamp > 1e12 ? Math.floor(parsedTimestamp / 1000) : parsedTimestamp;
  if (!Number.isFinite(timestampSeconds)) {
    throw new ReplicateWebhookVerificationError('Invalid timestamp');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new ReplicateWebhookVerificationError('Timestamp outside tolerance');
  }

  const signedContent = `${params.headers.webhookId}.${params.headers.webhookTimestamp}.${params.body}`;
  const secretBytes = decodeWebhookSecret(secret);
  const computedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  const expectedSignatures = parseWebhookSignatures(params.headers.webhookSignatures);
  const computedBytes = Buffer.from(computedSignature, 'base64');
  const isValid = expectedSignatures.some((expectedSignature) => {
    const expectedBytes = Buffer.from(expectedSignature, 'base64');
    if (expectedBytes.length !== computedBytes.length) return false;
    return crypto.timingSafeEqual(expectedBytes, computedBytes);
  });

  if (!isValid) {
    throw new ReplicateWebhookVerificationError('Invalid signature', 403);
  }

  let prediction: unknown;
  try {
    prediction = JSON.parse(params.body);
  } catch {
    throw new ReplicateWebhookVerificationError('Invalid JSON body');
  }

  if (
    !prediction ||
    typeof prediction !== 'object' ||
    typeof (prediction as { id?: unknown }).id !== 'string' ||
    typeof (prediction as { status?: unknown }).status !== 'string'
  ) {
    throw new ReplicateWebhookVerificationError('Invalid prediction payload');
  }

  return {
    deliveryId: params.headers.webhookId,
    prediction: prediction as VerifiedReplicateWebhook['prediction'],
    rawBody: params.body,
  };
};
