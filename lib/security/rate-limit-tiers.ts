/**
 * Rate Limit Tier Configurations
 *
 * Defines rate limits for different API endpoints and operations.
 * Configurable via environment variables with sensible defaults.
 *
 * @module lib/security/rate-limit-tiers
 */

import type { RateLimitTier } from './ip-rate-limit';
export type { RateLimitTier } from './ip-rate-limit';

/**
 * Parse integer from environment variable with fallback
 */
const parseEnvInt = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) return fallback;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : Math.max(0, parsed);
};

/**
 * Time window constants (milliseconds)
 */
export const TIME_WINDOWS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
} as const;

/**
 * Global API Rate Limit
 *
 * Applies to ALL API endpoints as a baseline protection.
 * Prevents brute-force attacks and general abuse.
 *
 * Default: 200 requests/hour per IP
 * Env: IP_RATE_LIMIT_GLOBAL
 */
export const TIER_GLOBAL_API: RateLimitTier = {
  key: 'ip:global-api',
  limit: parseEnvInt('IP_RATE_LIMIT_GLOBAL', 200),
  windowMs: TIME_WINDOWS.HOUR
};

/**
 * Voice Generation Rate Limit
 *
 * ElevenLabs TTS is expensive (€0.01/request).
 * Limit aggressive usage to prevent cost explosion.
 *
 * Default: 20 requests/hour per IP
 * Env: IP_RATE_LIMIT_VOICE
 */
export const TIER_VOICE_GENERATION: RateLimitTier = {
  key: 'ip:voice-generation',
  limit: parseEnvInt('IP_RATE_LIMIT_VOICE', 20),
  windowMs: TIME_WINDOWS.HOUR
};

/**
 * Video Generation Rate Limit
 *
 * Video is VERY expensive (€0.30/request via Replicate).
 * Strict limits to prevent abuse.
 *
 * Default: 10 requests/hour per IP
 * Env: IP_RATE_LIMIT_VIDEO
 */
export const TIER_VIDEO_GENERATION: RateLimitTier = {
  key: 'ip:video-generation',
  limit: parseEnvInt('IP_RATE_LIMIT_VIDEO', 10),
  windowMs: TIME_WINDOWS.HOUR
};

/**
 * Image Generation Rate Limit
 *
 * Moderate cost (€0.04/request).
 * Allow more requests than video.
 *
 * Default: 30 requests/hour per IP
 * Env: IP_RATE_LIMIT_IMAGE
 */
export const TIER_IMAGE_GENERATION: RateLimitTier = {
  key: 'ip:image-generation',
  limit: parseEnvInt('IP_RATE_LIMIT_IMAGE', 30),
  windowMs: TIME_WINDOWS.HOUR
};

/**
 * Account Creation Rate Limit
 *
 * Prevent mass account creation for credit farming.
 * Each new account gets 50 free credits.
 *
 * Default: 5 signups/day per IP
 * Env: IP_RATE_LIMIT_SIGNUP
 */
export const TIER_ACCOUNT_CREATION: RateLimitTier = {
  key: 'ip:account-creation',
  limit: parseEnvInt('IP_RATE_LIMIT_SIGNUP', 5),
  windowMs: TIME_WINDOWS.DAY
};

/**
 * Forum Posting Rate Limit
 *
 * Prevent spam and flooding in community forum.
 *
 * Default: 50 posts/hour per IP
 * Env: IP_RATE_LIMIT_FORUM_POST
 */
export const TIER_FORUM_POST: RateLimitTier = {
  key: 'ip:forum-post',
  limit: parseEnvInt('IP_RATE_LIMIT_FORUM_POST', 50),
  windowMs: TIME_WINDOWS.HOUR
};

/**
 * Direct Message Rate Limit
 *
 * Prevent DM spam/harassment campaigns.
 *
 * Default: 30 messages/hour per IP
 * Env: IP_RATE_LIMIT_DM
 */
export const TIER_DIRECT_MESSAGE: RateLimitTier = {
  key: 'ip:direct-message',
  limit: parseEnvInt('IP_RATE_LIMIT_DM', 30),
  windowMs: TIME_WINDOWS.HOUR
};

/**
 * API Key Retrieval Rate Limit
 *
 * Prevent brute-force attempts to discover API keys.
 *
 * Default: 10 requests/hour per IP
 * Env: IP_RATE_LIMIT_API_KEY
 */
export const TIER_API_KEY_ACCESS: RateLimitTier = {
  key: 'ip:api-key-access',
  limit: parseEnvInt('IP_RATE_LIMIT_API_KEY', 10),
  windowMs: TIME_WINDOWS.HOUR
};

/**
 * Get tier configuration by endpoint pattern
 *
 * @param pathname - Request URL pathname
 * @returns Appropriate rate limit tier or null (no IP limiting)
 *
 * @example
 * const tier = getTierForEndpoint('/api/ventures/123/marketing/voice');
 * // Returns TIER_VOICE_GENERATION
 */
export function getTierForEndpoint(pathname: string): RateLimitTier | null {
  // Global API limit always applies (checked separately)

  // Expensive operations (check first - most specific)
  if (pathname.includes('/marketing/voice')) {
    return TIER_VOICE_GENERATION;
  }

  if (pathname.includes('/marketing/media') || pathname.includes('/forge/media')) {
    // Check request body for type (video vs image)
    // Default to video limit (stricter)
    return TIER_VIDEO_GENERATION;
  }

  // Account creation
  if (pathname.includes('/api/auth/signin') || pathname.includes('/api/auth/signup')) {
    return TIER_ACCOUNT_CREATION;
  }

  // Forum
  if (pathname.includes('/api/forum') && !pathname.includes('/trending')) {
    return TIER_FORUM_POST;
  }

  // Direct messages
  if (pathname.includes('/api/messages')) {
    return TIER_DIRECT_MESSAGE;
  }

  // No specific tier - only global limit applies
  return null;
}

/**
 * Standard rate limit response headers (RFC 6585)
 *
 * @param result - Rate limit result from checkIpRateLimit
 * @returns Headers object to attach to response
 *
 * @example
 * const headers = getRateLimitHeaders(result);
 * return Response.json({ data }, { headers });
 */
export function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {})
  };
}
