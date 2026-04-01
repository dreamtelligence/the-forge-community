import crypto from 'crypto';

const MAX_TIMESTAMP_AGE_SEC = 60 * 5;

export function getSlackSigningSecret(): string {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    throw new Error('Missing SLACK_SIGNING_SECRET');
  }
  return secret;
}

export function verifySlackSignature(params: {
  body: string;
  signature: string;
  timestamp: string;
  signingSecret: string;
}): boolean {
  const { body, signature, timestamp, signingSecret } = params;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return false;
  }

  const ageSec = Math.abs(Date.now() / 1000 - ts);
  if (ageSec > MAX_TIMESTAMP_AGE_SEC) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const expected = `v0=${crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex')}`;

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
