/**
 * API Key Management Types
 *
 * TypeScript definitions for API key authentication and authorization.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { ApiKey, User, Venture } from '@prisma/client';

/**
 * API Scopes - Fine-grained permissions
 */
export type ApiScope =
  // Media Generation
  | 'media:generate:image'
  | 'media:generate:video'
  | 'media:generate:voice'
  | 'media:read'
  | 'media:delete'

  // Content Generation
  | 'content:generate:marketing'
  | 'content:generate:legal'
  | 'content:read'
  | 'content:delete'

  // Venture Management
  | 'venture:read'
  | 'venture:write'
  | 'venture:delete'

  // Brand DNA
  | 'brand:read'
  | 'brand:write'

  // Files
  | 'files:upload'
  | 'files:read'
  | 'files:delete'

  // Webhooks
  | 'webhooks:read'
  | 'webhooks:write'
  | 'webhooks:delete'

  // Analytics
  | 'analytics:read'

  // Wildcard (full access - use with caution)
  | '*';

/**
 * API Key with populated relations
 */
export interface ApiKeyWithRelations extends ApiKey {
  user: User;
  venture?: Venture | null;
}

/**
 * Authenticated API request context
 */
export interface ApiRequestContext {
  apiKey: ApiKeyWithRelations;
  user: User;
  venture?: Venture | null;
  scopes: string[];
  requestId: string;
  timestamp: Date;
}

/**
 * API Rate limit status
 */
export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

/**
 * API Request log entry
 */
export interface ApiRequestLog {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  creditsUsed?: number;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
  error?: string;
}

/**
 * API Error response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

/**
 * API Success response wrapper
 */
export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * API Key creation request
 */
export interface CreateApiKeyRequest {
  name: string;
  ventureId?: string;
  scopes: ApiScope[];
  rateLimit?: number;
  rateLimitDaily?: number;
  expiresAt?: Date;
}

/**
 * API Key creation response (includes plaintext key - show once!)
 */
export interface CreateApiKeyResponse {
  apiKey: string; // Plaintext - SHOW ONCE!
  keyId: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
}

/**
 * API Key list item (no plaintext key)
 */
export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  ventureId?: string;
  ventureName?: string;
  rateLimit: number;
  rateLimitDaily: number;
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

/**
 * API Key usage statistics
 */
export interface ApiKeyStats {
  totalRequests: number;
  totalCredits: number;
  requestsByEndpoint: Record<string, number>;
  requestsByDay: Record<string, number>;
  avgResponseTime: number;
  errorRate: number;
  lastUsedAt?: string;
}

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'media.generated'
  | 'media.deleted'
  | 'content.created'
  | 'content.deleted'
  | 'venture.created'
  | 'venture.updated'
  | 'venture.deleted'
  | 'brand.updated'
  | 'order.created'
  | 'order.updated'
  | 'campaign.created'
  | 'campaign.completed';

/**
 * Webhook payload
 */
export interface WebhookPayload<T = unknown> {
  event: WebhookEventType;
  timestamp: string;
  data: T;
  ventureId?: string;
}

/**
 * Scope validation options
 */
export interface ScopeValidationOptions {
  requireAll?: boolean; // All scopes required (AND) vs any scope (OR)
  allowWildcard?: boolean; // Allow "*" scope
}
