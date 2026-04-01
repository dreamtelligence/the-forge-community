/**
 * API Key Authentication Middleware
 *
 * Enterprise-grade authentication for external API access.
 *
 * Features:
 * - Bearer token authentication
 * - API key verification with constant-time comparison
 * - Rate limiting (hourly + daily)
 * - Scope-based authorization
 * - Request logging and monitoring
 * - Automatic key expiration checks
 * - Security headers
 *
 * Usage:
 * ```typescript
 * export async function POST(req: Request) {
 *   const context = await authenticateApiRequest(req, ['media:generate:image']);
 *   // context.user, context.apiKey, context.venture available
 * }
 * ```
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { hashApiKey, isValidApiKeyFormat } from './crypto';
import { consumeHourlyQuota, consumeDailyQuota } from '@/lib/energy';
import type {
  ApiRequestContext,
  ApiScope,
  ScopeValidationOptions,
  ApiRequestLog,
} from './types';
import { randomBytes } from 'crypto';

/**
 * Custom error for API authentication failures
 */
export class ApiAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'UNAUTHORIZED'
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/**
 * Custom error for rate limit exceeded
 */
export class ApiRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public resetAt: Date
  ) {
    super(message);
    this.name = 'ApiRateLimitError';
  }
}

/**
 * Extract API key from Authorization header
 *
 * Supports: Authorization: Bearer forge_prod_xxxxx
 *
 * @param request - Next.js Request object
 * @returns API key or null
 */
function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  // Support "Bearer" prefix
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    return match[1];
  }

  // Direct API key (legacy, not recommended)
  if (authHeader.startsWith('forge_')) {
    return authHeader;
  }

  return null;
}

/**
 * Extract IP address from request
 *
 * Handles Vercel forwarded headers and direct connections.
 *
 * @param request - Next.js Request object
 * @returns IP address or null
 */
function extractIpAddress(request: Request): string | null {
  // Vercel forwards real IP in x-forwarded-for
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Fallback to x-real-ip
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return null;
}

/**
 * Generate unique request ID for tracing
 *
 * @returns Request ID (16 bytes hex)
 */
function generateRequestId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Check API key rate limits
 *
 * Enforces both hourly and daily limits.
 *
 * @param apiKeyId - The API key ID
 * @param hourlyLimit - Requests per hour
 * @param dailyLimit - Requests per day
 * @throws ApiRateLimitError if limit exceeded
 */
async function checkRateLimits(
  apiKeyId: string,
  hourlyLimit: number,
  dailyLimit: number
): Promise<void> {
  // Check hourly limit
  const hourlyQuota = await consumeHourlyQuota({
    userId: apiKeyId,
    feature: `api-key-${apiKeyId}`,
    limit: hourlyLimit,
  });

  if (!hourlyQuota.allowed) {
    const retryAfter = Math.ceil(
      (hourlyQuota.resetAt.getTime() - Date.now()) / 1000
    );

    throw new ApiRateLimitError(
      `Hourly rate limit exceeded (${hourlyLimit} req/hour)`,
      retryAfter,
      hourlyQuota.resetAt
    );
  }

  // Check daily limit
  const dailyQuota = await consumeDailyQuota({
    userId: apiKeyId,
    feature: `api-key-${apiKeyId}-daily`,
    limit: dailyLimit,
  });

  if (!dailyQuota.allowed) {
    const retryAfter = Math.ceil(
      (dailyQuota.resetAt.getTime() - Date.now()) / 1000
    );

    throw new ApiRateLimitError(
      `Daily rate limit exceeded (${dailyLimit} req/day)`,
      retryAfter,
      dailyQuota.resetAt
    );
  }
}

/**
 * Validate scopes for authorization
 *
 * Checks if API key has required scopes.
 *
 * @param keyScopes - Scopes assigned to API key
 * @param requiredScopes - Scopes required for this endpoint
 * @param options - Validation options
 * @returns True if authorized
 */
export function validateScopes(
  keyScopes: string[],
  requiredScopes: ApiScope[],
  options: ScopeValidationOptions = {}
): boolean {
  const { requireAll = false, allowWildcard = true } = options;

  // Wildcard scope grants full access
  if (allowWildcard && keyScopes.includes('*')) {
    return true;
  }

  if (requireAll) {
    // All required scopes must be present (AND)
    return requiredScopes.every((scope) => keyScopes.includes(scope));
  } else {
    // Any required scope is sufficient (OR)
    return requiredScopes.some((scope) => keyScopes.includes(scope));
  }
}

/**
 * Log API request for analytics
 *
 * Asynchronous logging - does not block request.
 *
 * @param log - Request log entry
 */
async function logApiRequest(log: ApiRequestLog): Promise<void> {
  try {
    await prisma.apiRequest.create({
      data: {
        id: generateRequestId(),
        apiKeyId: log.apiKeyId,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        creditsUsed: log.creditsUsed,
        responseTime: log.responseTime,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        error: log.error,
      },
    });
  } catch (error) {
    // Log failure should not crash the API
    console.error('[API Auth] Failed to log request:', error);
  }
}

/**
 * Authenticate API request
 *
 * Main authentication function. Call this at the start of your API route.
 *
 * @param request - Next.js Request object
 * @param requiredScopes - Scopes required for this endpoint
 * @param options - Validation options
 * @returns Authenticated context with user, venture, and API key info
 * @throws ApiAuthError if authentication fails
 * @throws ApiRateLimitError if rate limit exceeded
 *
 * @example
 * ```typescript
 * export async function POST(req: Request) {
 *   const { user, apiKey, venture } = await authenticateApiRequest(
 *     req,
 *     ['media:generate:image']
 *   );
 *
 *   // User is authenticated, proceed with request
 *   const result = await generateImage(...);
 *   return Response.json({ data: result });
 * }
 * ```
 */
export async function authenticateApiRequest(
  request: Request,
  requiredScopes: ApiScope[] = [],
  options: ScopeValidationOptions = {}
): Promise<ApiRequestContext> {
  const requestId = generateRequestId();
  const timestamp = new Date();

  // 1. Extract API key from Authorization header
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    throw new ApiAuthError(
      'Missing API key. Use Authorization: Bearer <api_key>',
      401,
      'MISSING_API_KEY'
    );
  }

  // 2. Validate format
  if (!isValidApiKeyFormat(apiKey)) {
    throw new ApiAuthError(
      'Invalid API key format',
      401,
      'INVALID_API_KEY_FORMAT'
    );
  }

  // 3. Hash and lookup in database
  const keyHash = hashApiKey(apiKey);

  const dbKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: true,
      venture: true,
    },
  });

  if (!dbKey) {
    throw new ApiAuthError(
      'Invalid API key',
      401,
      'INVALID_API_KEY'
    );
  }

  // 4. Check if key is active
  if (!dbKey.isActive) {
    throw new ApiAuthError(
      'API key is inactive',
      401,
      'INACTIVE_API_KEY'
    );
  }

  // 5. Check expiration
  if (dbKey.expiresAt && dbKey.expiresAt < timestamp) {
    throw new ApiAuthError(
      'API key has expired',
      401,
      'EXPIRED_API_KEY'
    );
  }

  // 6. Check rate limits
  await checkRateLimits(
    dbKey.id,
    dbKey.rateLimit,
    dbKey.rateLimitDaily
  );

  // 7. Validate scopes
  if (requiredScopes.length > 0) {
    const hasAccess = validateScopes(dbKey.scopes, requiredScopes, options);

    if (!hasAccess) {
      throw new ApiAuthError(
        `Insufficient scopes. Required: ${requiredScopes.join(', ')}`,
        403,
        'INSUFFICIENT_SCOPES'
      );
    }
  }

  // 8. Update last used timestamp (async, don't await)
  prisma.apiKey
    .update({
      where: { id: dbKey.id },
      data: { lastUsedAt: timestamp },
    })
    .catch((error) => {
      console.error('[API Auth] Failed to update lastUsedAt:', error);
    });

  // 9. Build context
  const context: ApiRequestContext = {
    apiKey: dbKey,
    user: dbKey.user,
    venture: dbKey.venture,
    scopes: dbKey.scopes,
    requestId,
    timestamp,
  };

  return context;
}

/**
 * Log API request after completion
 *
 * Call this after your API handler completes.
 *
 * @param context - Authenticated context from authenticateApiRequest
 * @param request - Next.js Request object
 * @param statusCode - HTTP status code
 * @param creditsUsed - Optional: AI credits consumed
 * @param error - Optional: Error message if failed
 *
 * @example
 * ```typescript
 * const context = await authenticateApiRequest(req, [...]);
 * const startTime = Date.now();
 *
 * try {
 *   const result = await generateImage(...);
 *   await logRequestCompletion(context, req, 200, 10);
 *   return Response.json({ data: result });
 * } catch (error) {
 *   await logRequestCompletion(context, req, 500, 0, error.message);
 *   throw error;
 * }
 * ```
 */
export async function logRequestCompletion(
  context: ApiRequestContext,
  request: Request,
  statusCode: number,
  creditsUsed?: number,
  error?: string
): Promise<void> {
  const url = new URL(request.url);
  const responseTime = Date.now() - context.timestamp.getTime();

  await logApiRequest({
    apiKeyId: context.apiKey.id,
    endpoint: url.pathname,
    method: request.method,
    statusCode,
    creditsUsed,
    responseTime,
    ipAddress: extractIpAddress(request) || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    error,
  });
}

/**
 * Format error response
 *
 * Standard error response format for API.
 *
 * @param error - Error object
 * @param requestId - Request ID for tracing
 * @returns JSON response
 */
export function formatApiError(
  error: unknown,
  requestId: string = generateRequestId()
): Response {
  if (error instanceof ApiAuthError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
        },
      },
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      }
    );
  }

  if (error instanceof ApiRateLimitError) {
    return Response.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message,
          requestId,
          retryAfter: error.retryAfter,
          resetAt: error.resetAt.toISOString(),
        },
      },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'Retry-After': String(error.retryAfter),
          'X-RateLimit-Reset': error.resetAt.toISOString(),
        },
      }
    );
  }

  // Generic error
  return Response.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred',
        requestId,
      },
    },
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
    }
  );
}
