import { NextResponse } from 'next/server';

/**
 * Rate Limiting System
 *
 * In-memory rate limiting for API routes.
 * For production, consider using Upstash Redis or Vercel Rate Limiting.
 *
 * Usage:
 * const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
 * const limited = await limiter(request);
 * if (limited) return limited;
 */

interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  message?: string; // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (will reset on deployment/restart)
// For production: Use Redis/Upstash
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get client identifier from request
 * Uses IP address or session-based identifier
 */
function getClientId(request: Request): string {
  // Try to get IP from headers (Vercel provides these)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  // In production, you might also want to include user session
  // const session = await auth(); // If using auth
  // return session?.user?.email || ip;

  return ip;
}

/**
 * Creates a rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    request: Request
  ): Promise<NextResponse | null> {
    const clientId = getClientId(request);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(clientId);

    // If entry expired or doesn't exist, create new one
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(clientId, entry);
    }

    // Increment request count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return NextResponse.json(
        {
          error: config.message || 'Rate limit exceeded',
          retryAfter: retryAfter,
          limit: config.maxRequests,
          window: config.windowMs / 1000
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
          }
        }
      );
    }

    // Update headers for successful request
    const remaining = config.maxRequests - entry.count;

    // Return null to indicate rate limit not exceeded
    // But we can't modify response headers here, so we'll set them in the route
    (request as any).__rateLimitInfo = {
      limit: config.maxRequests,
      remaining,
      reset: entry.resetTime
    };

    return null; // Allow request
  };
}

/**
 * Cleanup old entries (call periodically)
 * This prevents memory leak in long-running processes
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  console.log(`Rate limit cleanup: removed ${cleaned} expired entries`);
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Preset rate limiters for common use cases
 */
export const RateLimiters = {
  // AI Chatbot: 15 requests per minute (increased for image analysis)
  aiChatbot: createRateLimiter({
    maxRequests: 15,
    windowMs: 60 * 1000,
    message: 'Too many AI requests. Please wait before sending another message.'
  }),

  // General API: 60 requests per minute
  api: createRateLimiter({
    maxRequests: 60,
    windowMs: 60 * 1000,
    message: 'API rate limit exceeded. Please try again later.'
  }),

  // Auth endpoints: 5 attempts per 15 minutes
  auth: createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }),

  // Heavy operations: 10 per hour
  heavy: createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    message: 'Rate limit exceeded for this operation. Try again in an hour.'
  }),

  media: createRateLimiter({
    maxRequests: 60,
    windowMs: 60 * 60 * 1000,
    message: 'Zu viele Media-Requests. Bitte warte kurz.'
  }),

  forumPost: createRateLimiter({
    maxRequests: 6,
    windowMs: 60 * 1000,
    message: 'Zu viele Beiträge. Bitte warte kurz.'
  }),

  forumComment: createRateLimiter({
    maxRequests: 12,
    windowMs: 60 * 1000,
    message: 'Zu viele Kommentare. Bitte warte kurz.'
  }),

  forumUpload: createRateLimiter({
    maxRequests: 6,
    windowMs: 10 * 60 * 1000,
    message: 'Zu viele Uploads. Bitte warte kurz.'
  }),

  publicForm: createRateLimiter({
    maxRequests: 8,
    windowMs: 10 * 60 * 1000,
    message: 'Zu viele Formularanfragen. Bitte versuche es in ein paar Minuten erneut.'
  }),
};
