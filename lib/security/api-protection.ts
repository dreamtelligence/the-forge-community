/**
 * API Route Protection Helpers
 *
 * Provides IP rate limiting for API routes (Node.js runtime).
 * Cannot be used in middleware.ts (Edge runtime - no Prisma).
 *
 * @module lib/security/api-protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractIpAddress, checkIpRateLimit } from './ip-rate-limit';
import {
  TIER_GLOBAL_API,
  getTierForEndpoint,
  getRateLimitHeaders,
  type RateLimitTier
} from './rate-limit-tiers';

/**
 * Apply IP rate limiting to an API route
 *
 * @param request - Next.js request object
 * @param customTier - Optional custom tier (overrides auto-detection)
 * @returns null if allowed, NextResponse with 429 if blocked
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await applyIpRateLimit(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Your API logic here
 * }
 */
export async function applyIpRateLimit(
  request: NextRequest,
  customTier?: RateLimitTier
): Promise<NextResponse | null> {
  // Feature flag check
  if (process.env.ENABLE_IP_RATE_LIMIT === 'false') {
    return null; // Rate limiting disabled
  }

  const ip = extractIpAddress(request);
  const pathname = request.nextUrl.pathname;

  try {
    // Step 1: Global API rate limit (always applied)
    const globalResult = await checkIpRateLimit(ip, TIER_GLOBAL_API);

    if (!globalResult.allowed) {
      console.warn(`[IP Rate Limit] Global limit exceeded: ${ip} (${pathname})`);
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: globalResult.retryAfter
        },
        {
          status: 429,
          headers: getRateLimitHeaders(globalResult)
        }
      );
    }

    // Step 2: Endpoint-specific rate limit
    const endpointTier = customTier || getTierForEndpoint(pathname);

    if (endpointTier) {
      const endpointResult = await checkIpRateLimit(ip, endpointTier);

      if (!endpointResult.allowed) {
        console.warn(`[IP Rate Limit] Endpoint limit exceeded: ${ip} (${endpointTier.key})`);
        return NextResponse.json(
          {
            error: 'Rate limit exceeded for this operation. Please try again later.',
            retryAfter: endpointResult.retryAfter,
            tier: endpointTier.key,
            limit: endpointResult.limit,
            resetAt: endpointResult.resetAt.toISOString()
          },
          {
            status: 429,
            headers: getRateLimitHeaders(endpointResult)
          }
        );
      }
    }

    // Allowed - no response needed
    return null;
  } catch (error) {
    // Fail-open: Allow request on unexpected error
    console.error('[IP Rate Limit] Unexpected error, allowing request:', error);
    return null;
  }
}

/**
 * Wrap an API handler with IP rate limiting
 *
 * @param handler - API route handler function
 * @param tier - Optional custom tier
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * const handler = withIpRateLimit(async (request: NextRequest) => {
 *   return NextResponse.json({ data: 'success' });
 * }, TIER_VOICE_GENERATION);
 *
 * export { handler as POST };
 */
export function withIpRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  tier?: RateLimitTier
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const rateLimitResponse = await applyIpRateLimit(request, tier);
    if (rateLimitResponse) return rateLimitResponse;

    return handler(request, ...args);
  };
}
