/**
 * IP-Based Rate Limiting
 *
 * Provides IP-level request throttling to prevent abuse via multiple accounts.
 * Uses in-memory storage (production: Redis) with sliding window algorithm.
 *
 * Features:
 * - Per-IP request counting
 * - Configurable time windows (hourly, daily)
 * - Graceful degradation (fail-open on errors)
 * - Support for multiple rate limit tiers
 *
 * @module lib/security/ip-rate-limit
 */

import { prisma } from '@/lib/prisma';

/**
 * Rate limit result
 */
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until reset (if blocked)
};

/**
 * Rate limit tier configuration
 */
export type RateLimitTier = {
  key: string;
  limit: number;
  windowMs: number;
};

/**
 * Extract IP address from request headers
 * Supports Vercel, Cloudflare, and standard proxy headers
 */
export function extractIpAddress(request: { headers: Headers }): string {
  const headers = request.headers;

  // Priority order: Cloudflare > Vercel > Standard proxies
  const ip =
    headers.get('cf-connecting-ip') ||           // Cloudflare
    headers.get('x-real-ip') ||                  // Nginx
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() || // Standard proxy
    '0.0.0.0';                                   // Fallback (should never happen)

  return ip;
}

/**
 * In-Memory Rate Limiter (Development/Fallback)
 *
 * For production, replace with Redis:
 * - Distributed across multiple serverless functions
 * - Persistent across deployments
 * - Lower latency (<1ms vs ~10ms DB query)
 */
class MemoryRateLimiter {
  private buckets: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Check and consume rate limit
   */
  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    // Calculate window start (aligned to window boundaries for consistency)
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = new Date(windowStart + windowMs);

    // Clean up expired buckets (memory optimization)
    if (bucket && bucket.resetAt < now) {
      this.buckets.delete(key);
    }

    // Initialize or get current bucket
    const currentBucket = this.buckets.get(key);

    if (!currentBucket || currentBucket.resetAt !== resetAt.getTime()) {
      // New window - reset counter
      this.buckets.set(key, { count: 1, resetAt: resetAt.getTime() });
      return {
        allowed: true,
        remaining: limit - 1,
        limit,
        resetAt
      };
    }

    // Existing window - check limit
    if (currentBucket.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now) / 1000)
      };
    }

    // Increment counter
    currentBucket.count++;
    this.buckets.set(key, currentBucket);

    return {
      allowed: true,
      remaining: limit - currentBucket.count,
      limit,
      resetAt
    };
  }

  /**
   * Get current count without consuming
   */
  async peek(key: string): Promise<number> {
    const bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket || bucket.resetAt < now) {
      return 0;
    }

    return bucket.count;
  }
}

/**
 * Database-Backed Rate Limiter (Production)
 *
 * Uses existing RateLimitBucket table for persistence.
 * Slower than Redis (~10ms) but works without additional infrastructure.
 */
class DatabaseRateLimiter {
  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const resetAt = new Date(windowStart.getTime() + windowMs);

    try {
      // Upsert with increment (atomic operation)
      const rows = await prisma.$queryRaw<{ count: number }[]>`
        INSERT INTO "RateLimitBucket" ("userId", "feature", "windowStart", "count", "createdAt", "updatedAt")
        VALUES ('system:ip', ${key}, ${windowStart}, 1, NOW(), NOW())
        ON CONFLICT ("userId", "feature", "windowStart")
        DO UPDATE SET
          "count" = "RateLimitBucket"."count" + 1,
          "updatedAt" = NOW()
        WHERE "RateLimitBucket"."count" < ${limit}
        RETURNING "count";
      `;

      if (rows.length === 0) {
        // Limit exceeded (WHERE clause blocked update)
        return {
          allowed: false,
          remaining: 0,
          limit,
          resetAt,
          retryAfter: Math.ceil((resetAt.getTime() - now) / 1000)
        };
      }

      const currentCount = rows[0].count;

      return {
        allowed: true,
        remaining: Math.max(0, limit - currentCount),
        limit,
        resetAt
      };
    } catch (error) {
      // Fail-open: Allow request on database error
      console.error('[IP Rate Limit] Database error, allowing request:', error);
      return {
        allowed: true,
        remaining: limit,
        limit,
        resetAt
      };
    }
  }

  async peek(key: string): Promise<number> {
    const windowStart = new Date(Math.floor(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000));

    try {
      const bucket = await prisma.rateLimitBucket.findUnique({
        where: {
          userId_feature_windowStart: {
            userId: 'system:ip',
            feature: key,
            windowStart
          }
        },
        select: { count: true }
      });

      return bucket?.count ?? 0;
    } catch {
      return 0;
    }
  }
}

// Singleton instances
const memoryLimiter = new MemoryRateLimiter();
const dbLimiter = new DatabaseRateLimiter();

/**
 * Configuration: Choose rate limiter backend
 *
 * - 'memory': Fast, but resets on deployment (dev/staging)
 * - 'database': Persistent, slower (~10ms), no Redis needed (production default)
 * - 'redis': Fastest, distributed, requires Redis instance (future)
 */
const RATE_LIMIT_BACKEND = (process.env.RATE_LIMIT_BACKEND || 'database') as 'memory' | 'database' | 'redis';

/**
 * Check IP rate limit for a given tier
 *
 * @param ip - Client IP address
 * @param tier - Rate limit configuration (key, limit, windowMs)
 * @returns Rate limit result with allow/deny decision
 *
 * @example
 * const result = await checkIpRateLimit('192.168.1.1', {
 *   key: 'api:voice-generation',
 *   limit: 20,
 *   windowMs: 60 * 60 * 1000 // 1 hour
 * });
 *
 * if (!result.allowed) {
 *   return Response.json({ error: 'Rate limit exceeded' }, {
 *     status: 429,
 *     headers: { 'Retry-After': result.retryAfter }
 *   });
 * }
 */
export async function checkIpRateLimit(
  ip: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  // Feature flag: Disable IP rate limiting
  if (process.env.ENABLE_IP_RATE_LIMIT === 'false') {
    return {
      allowed: true,
      remaining: tier.limit,
      limit: tier.limit,
      resetAt: new Date(Date.now() + tier.windowMs)
    };
  }

  // Sanitize IP (prevent injection attacks)
  const sanitizedIp = ip.replace(/[^0-9a-f.:]/gi, '').substring(0, 45); // Max IPv6 length
  const bucketKey = `${tier.key}:${sanitizedIp}`;

  // Select backend
  const limiter = RATE_LIMIT_BACKEND === 'database' ? dbLimiter : memoryLimiter;

  try {
    return await limiter.consume(bucketKey, tier.limit, tier.windowMs);
  } catch (error) {
    // Fail-open: On catastrophic error, allow the request
    console.error('[IP Rate Limit] Unexpected error, allowing request:', error);
    return {
      allowed: true,
      remaining: tier.limit,
      limit: tier.limit,
      resetAt: new Date(Date.now() + tier.windowMs)
    };
  }
}

/**
 * Get current IP rate limit status (without consuming)
 *
 * Useful for monitoring dashboards or user-facing quota displays.
 */
export async function getIpRateLimitStatus(
  ip: string,
  tier: RateLimitTier
): Promise<{ current: number; limit: number; resetAt: Date }> {
  const sanitizedIp = ip.replace(/[^0-9a-f.:]/gi, '').substring(0, 45);
  const bucketKey = `${tier.key}:${sanitizedIp}`;

  const limiter = RATE_LIMIT_BACKEND === 'database' ? dbLimiter : memoryLimiter;
  const current = await limiter.peek(bucketKey);

  const now = Date.now();
  const windowStart = Math.floor(now / tier.windowMs) * tier.windowMs;
  const resetAt = new Date(windowStart + tier.windowMs);

  return {
    current,
    limit: tier.limit,
    resetAt
  };
}
