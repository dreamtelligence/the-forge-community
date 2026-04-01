/**
 * API Key Cryptography Utilities
 *
 * Enterprise-grade API key generation and validation.
 * Uses Node.js crypto for cryptographically secure random generation.
 *
 * Key Format: forge_[env]_[32 bytes base64url]
 * Example: forge_prod_kJ8vLp2Qm9xR4sT6uV3wX1yZ5aB7cD9eF
 *
 * Security:
 * - Cryptographically secure random bytes (crypto.randomBytes)
 * - SHA-256 hashing for storage (never store plaintext)
 * - Base64url encoding (URL-safe, no padding)
 * - Constant-time comparison for validation
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * API key prefix for The Forge platform
 */
const API_KEY_PREFIX = 'forge';

/**
 * Environment-specific prefix
 */
const ENV_PREFIX = process.env.NODE_ENV === 'production' ? 'prod' :
                   process.env.NODE_ENV === 'test' ? 'test' : 'dev';

/**
 * Number of random bytes to generate (32 bytes = 256 bits)
 */
const KEY_BYTE_LENGTH = 32;

/**
 * Expected API key format regex
 * forge_[env]_[base64url string]
 */
const API_KEY_REGEX = /^forge_(prod|test|dev)_[A-Za-z0-9_-]{43}$/;

/**
 * Base64url encode (RFC 4648 §5) - URL-safe, no padding
 *
 * @param buffer - Buffer to encode
 * @returns Base64url encoded string
 */
function base64urlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a cryptographically secure API key
 *
 * @returns Object containing the API key and its hash
 *
 * @example
 * const { apiKey, keyHash, keyPrefix } = generateApiKey();
 * // apiKey: "forge_prod_kJ8vLp2Qm9xR4sT6uV3wX1yZ5aB7cD9eF"
 * // keyHash: "sha256_hash_for_database_storage"
 * // keyPrefix: "forge_pro" (first 10 chars for display)
 */
export function generateApiKey(): {
  apiKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  // Generate 32 cryptographically secure random bytes
  const randomBuffer = randomBytes(KEY_BYTE_LENGTH);

  // Encode as base64url (URL-safe)
  const randomString = base64urlEncode(randomBuffer);

  // Construct full API key: forge_[env]_[random]
  const apiKey = `${API_KEY_PREFIX}_${ENV_PREFIX}_${randomString}`;

  // Hash for database storage (SHA-256)
  const keyHash = hashApiKey(apiKey);

  // Prefix for display (first 10 chars: "forge_prod")
  const keyPrefix = apiKey.substring(0, 10);

  return {
    apiKey,
    keyHash,
    keyPrefix,
  };
}

/**
 * Hash an API key using SHA-256
 *
 * Never store plaintext API keys in the database.
 * Always hash them before storage.
 *
 * @param apiKey - The plaintext API key
 * @returns SHA-256 hash (hex encoded)
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Validate API key format
 *
 * Checks if the key matches the expected format without
 * database lookup. Use this for early validation.
 *
 * @param apiKey - The API key to validate
 * @returns True if format is valid
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return API_KEY_REGEX.test(apiKey);
}

/**
 * Verify API key against stored hash (constant-time comparison)
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param apiKey - The plaintext API key to verify
 * @param storedHash - The hash from the database
 * @returns True if the key matches the hash
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const computedHash = hashApiKey(apiKey);

  // Constant-time comparison to prevent timing attacks
  try {
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    // Both must be same length
    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, storedBuffer);
  } catch (_error) {
    // Invalid hex string or other error
    return false;
  }
}

/**
 * Extract environment from API key
 *
 * @param apiKey - The API key
 * @returns Environment ('prod', 'test', 'dev') or null if invalid
 */
export function extractEnvironment(apiKey: string): 'prod' | 'test' | 'dev' | null {
  const match = apiKey.match(/^forge_(prod|test|dev)_/);
  return match ? (match[1] as 'prod' | 'test' | 'dev') : null;
}

/**
 * Generate a webhook signing secret
 *
 * Used for HMAC-SHA256 webhook signature verification.
 *
 * @returns Object with secret and hash
 */
export function generateWebhookSecret(): {
  secret: string;
  secretHash: string;
} {
  const randomBuffer = randomBytes(32);
  const secret = `whsec_${base64urlEncode(randomBuffer)}`;
  const secretHash = hashApiKey(secret);

  return {
    secret,
    secretHash,
  };
}

/**
 * Sign webhook payload with HMAC-SHA256
 *
 * @param payload - The JSON payload to sign
 * @param secret - The webhook secret
 * @returns HMAC signature (hex encoded)
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const hmac = createHash('sha256');
  hmac.update(payload);
  hmac.update(secret);
  return hmac.digest('hex');
}

/**
 * Verify webhook signature (constant-time comparison)
 *
 * @param payload - The JSON payload
 * @param signature - The received signature
 * @param secret - The webhook secret
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const computedSignature = signWebhookPayload(payload, secret);

  try {
    const computedBuffer = Buffer.from(computedSignature, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (computedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, signatureBuffer);
  } catch (_error) {
    return false;
  }
}
