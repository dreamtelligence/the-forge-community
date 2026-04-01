/**
 * Integration Service
 *
 * Core service for managing enterprise integrations.
 * Handles OAuth flows, token storage, and sync operations.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma';
import type {
  IntegrationConnection,
  IntegrationProvider,
} from '@prisma/client';
import { IntegrationProvider as ProviderEnum } from '@prisma/client';
import {
  encryptAndSerialize,
  deserializeAndDecrypt,
} from './crypto';
import type {
  IntegrationConnectionDTO,
} from './types';
import { NOTION_CONFIG, DOCUSIGN_CONFIG, SLACK_CONFIG } from './types';

// ============================================
// OAuth State Management (in-memory for now, Redis in production)
// ============================================

const oauthStates = new Map<string, {
  userId: string;
  ventureId?: string;
  provider: IntegrationProvider;
  scopes: string[];
  redirectUrl: string;
  expiresAt: number;
}>();

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ============================================
// Connection Management
// ============================================

/**
 * Get all integrations for a user
 */
export async function getUserConnections(
  userId: string,
  ventureId?: string
): Promise<IntegrationConnectionDTO[]> {
  const connections = await prisma.integrationConnection.findMany({
    where: {
      userId,
      ...(ventureId && { ventureId }),
    },
    orderBy: { createdAt: 'desc' },
  });

  return connections.map(mapConnectionToDTO);
}

/**
 * Get a specific connection
 */
export async function getConnection(
  connectionId: string,
  userId: string
): Promise<IntegrationConnectionDTO | null> {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      id: connectionId,
      userId,
    },
  });

  if (!connection) return null;

  return mapConnectionToDTO(connection);
}

/**
 * Get connection by provider
 */
export async function getConnectionByProvider(
  userId: string,
  provider: IntegrationProvider,
  ventureId?: string
): Promise<IntegrationConnectionDTO | null> {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      userId,
      provider,
      ...(ventureId && { ventureId }),
      status: 'CONNECTED',
    },
  });

  if (!connection) return null;

  return mapConnectionToDTO(connection);
}

// ============================================
// OAuth Flow
// ============================================

/**
 * Generate OAuth URL for a provider
 */
export async function generateOAuthUrl(
  userId: string,
  provider: IntegrationProvider,
  redirectUrl: string,
  ventureId?: string,
  requestedScopes?: string[]
): Promise<{ url: string; state: string }> {
  // Generate secure random state
  const state = generateSecureState();
  
  // Store state with metadata
  oauthStates.set(state, {
    userId,
    ventureId,
    provider,
    scopes: requestedScopes || [],
    redirectUrl,
    expiresAt: Date.now() + STATE_EXPIRY_MS,
  });

  // Clean up expired states periodically
  cleanupExpiredStates();

  // Generate OAuth URL based on provider
  const config = getProviderConfig(provider);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getClientId(provider),
    redirect_uri: getRedirectUri(provider),
    state,
  });

  // Add scopes if provider requires them
  if (config.oauth.scopes.length > 0) {
    params.set('scope', config.oauth.scopes.join(' '));
  }

  // Add additional provider-specific params
  if (config.oauth.additionalParams) {
    Object.entries(config.oauth.additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  return {
    url: `${config.oauth.authorizeUrl}?${params.toString()}`,
    state,
  };
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<{ success: boolean; redirectUrl: string; error?: string }> {
  // Validate state
  const stateData = oauthStates.get(state);
  
  if (!stateData) {
    return { success: false, redirectUrl: '/', error: 'Invalid or expired state' };
  }

  if (Date.now() > stateData.expiresAt) {
    oauthStates.delete(state);
    return { success: false, redirectUrl: '/', error: 'State expired' };
  }

  const { userId, ventureId, provider } = stateData;

  try {
    // Exchange code for tokens (provider-specific)
    const tokenData = await exchangeCodeForTokens(provider, code);

    // Get workspace/account info from provider
    const workspaceInfo = await getWorkspaceInfo(provider, tokenData.accessToken);

    // Encrypt tokens
    const encryptedAccessToken = encryptAndSerialize(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken 
      ? encryptAndSerialize(tokenData.refreshToken)
      : null;

    // Upsert connection
    await prisma.integrationConnection.upsert({
      where: {
        userId_provider_workspaceId: {
          userId,
          provider,
          workspaceId: workspaceInfo.id,
        },
      },
      update: {
        status: 'CONNECTED',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokenData.expiresAt,
        workspaceName: workspaceInfo.name,
        userEmail: workspaceInfo.email,
        scopes: tokenData.scopes,
        lastError: null,
        lastErrorAt: null,
      },
      create: {
        userId,
        ventureId,
        provider,
        status: 'CONNECTED',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokenData.expiresAt,
        workspaceId: workspaceInfo.id,
        workspaceName: workspaceInfo.name,
        userEmail: workspaceInfo.email,
        scopes: tokenData.scopes,
      },
    });

    // Clean up state
    oauthStates.delete(state);

    return { success: true, redirectUrl: stateData.redirectUrl };
  } catch (error) {
    console.error(`[Integration Service] OAuth callback failed for ${provider}:`, error);
    
    // Store error on connection if exists
    await prisma.integrationConnection.updateMany({
      where: { userId, provider },
      data: {
        status: 'ERROR',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastErrorAt: new Date(),
      },
    });

    return { 
      success: false, 
      redirectUrl: stateData.redirectUrl,
      error: error instanceof Error ? error.message : 'OAuth failed',
    };
  }
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(
  connectionId: string,
  userId: string
): Promise<boolean> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!connection) {
    return false;
  }

  // Optionally revoke tokens at provider
  try {
    await revokeTokens(connection.provider, connection.accessToken);
  } catch (error) {
    console.warn(`[Integration Service] Failed to revoke tokens for ${connection.provider}:`, error);
    // Continue with disconnection even if revoke fails
  }

  // Update status
  await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: 'DISCONNECTED',
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
    },
  });

  return true;
}

// ============================================
// Token Management
// ============================================

/**
 * Get decrypted access token for a connection
 */
export async function getAccessToken(
  connectionId: string
): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection || !connection.accessToken) {
    return null;
  }

  try {
    return deserializeAndDecrypt(connection.accessToken);
  } catch (error) {
    console.error('[Integration Service] Failed to decrypt token:', error);
    return null;
  }
}

/**
 * Refresh access token if expired
 */
export async function logSync(
  connectionId: string,
  resourceType: string,
  resourceId: string,
  externalId: string,
  status: 'SUCCESS' | 'FAILED',
  error?: string
): Promise<void> {
  await prisma.integrationSyncLog.create({
    data: {
      connectionId,
      resourceType,
      resourceId,
      externalId,
      direction: 'TO_EXTERNAL',
      status,
      completedAt: new Date(),
      error,
    },
  });
}

export async function refreshAccessToken(
  connectionId: string
): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection || !connection.accessToken) {
    return null;
  }

  if (!connection.refreshToken) {
    if (!connection.tokenExpiresAt || connection.tokenExpiresAt > new Date()) {
      return getAccessToken(connectionId);
    }

    await prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        status: 'EXPIRED',
        lastError: 'Token expired and no refresh token available',
        lastErrorAt: new Date(),
      },
    });

    return null;
  }

  // Check if token is expired
  if (connection.tokenExpiresAt && connection.tokenExpiresAt > new Date()) {
    // Token still valid, decrypt and return
    return getAccessToken(connectionId);
  }

  try {
    const refreshToken = deserializeAndDecrypt(connection.refreshToken);
    
    // Provider-specific refresh
    const newTokens = await performTokenRefresh(connection.provider, refreshToken);

    // Encrypt and store new tokens
    const encryptedAccessToken = encryptAndSerialize(newTokens.accessToken);
    const encryptedRefreshToken = newTokens.refreshToken
      ? encryptAndSerialize(newTokens.refreshToken)
      : connection.refreshToken; // Keep old refresh token if no new one provided

    await prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: newTokens.expiresAt,
      },
    });

    return newTokens.accessToken;
  } catch (error) {
    console.error('[Integration Service] Token refresh failed:', error);
    
    // Mark connection as expired
    await prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        status: 'EXPIRED',
        lastError: 'Token refresh failed',
        lastErrorAt: new Date(),
      },
    });

    return null;
  }
}

// ============================================
// Helper Functions
// ============================================

function mapConnectionToDTO(
  connection: IntegrationConnection
): IntegrationConnectionDTO {
  return {
    id: connection.id,
    provider: connection.provider,
    status: connection.status,
    workspaceName: connection.workspaceName || undefined,
    workspaceId: connection.workspaceId || undefined,
    userEmail: connection.userEmail || undefined,
    scopes: connection.scopes,
    lastSyncedAt: connection.lastSyncedAt || undefined,
    lastError: connection.lastError || undefined,
    createdAt: connection.createdAt,
    metadata: connection.metadata as Record<string, unknown> | undefined,
  };
}

function generateSecureState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cleanupExpiredStates(): void {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now > data.expiresAt) {
      oauthStates.delete(state);
    }
  }
}

function getProviderConfig(provider: IntegrationProvider) {
  switch (provider) {
    case ProviderEnum.NOTION:
      return NOTION_CONFIG;
    case ProviderEnum.DOCUSIGN:
      return DOCUSIGN_CONFIG;
    case ProviderEnum.SLACK:
      return SLACK_CONFIG;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function getClientId(provider: IntegrationProvider): string {
  const envVar = `${provider.toUpperCase()}_CLIENT_ID`;
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing environment variable: ${envVar}`);
  }
  return value;
}

function getClientSecret(provider: IntegrationProvider): string {
  const envVar = `${provider.toUpperCase()}_CLIENT_SECRET`;
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing environment variable: ${envVar}`);
  }
  return value;
}

function getRedirectUri(provider: IntegrationProvider): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
  return `${baseUrl}/api/integrations/${provider.toLowerCase()}/callback`;
}

// ============================================
// Provider-Specific OAuth Implementations
// ============================================

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

interface WorkspaceInfo {
  id: string;
  name?: string;
  email?: string;
}

async function exchangeCodeForTokens(
  provider: IntegrationProvider,
  code: string
): Promise<TokenResponse> {
  const clientId = getClientId(provider);
  const clientSecret = getClientSecret(provider);
  const redirectUri = getRedirectUri(provider);

  switch (provider) {
    case ProviderEnum.NOTION: {
      const { exchangeNotionCode } = await import('./notion/service');
      const notionResponse = await exchangeNotionCode(code, clientId, clientSecret, redirectUri);
      
      return {
        accessToken: notionResponse.access_token,
        // Notion tokens don't expire, but we set a far future date
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        scopes: [], // Notion doesn't use scopes
      };
    }
    
    case ProviderEnum.DOCUSIGN:
      // TODO: Implement DocuSign token exchange
      throw new Error('DocuSign token exchange not implemented');
    
    case ProviderEnum.SLACK: {
      const { exchangeSlackCode } = await import('./slack/service');
      const slackResponse = await exchangeSlackCode(code, clientId, clientSecret, redirectUri);
      
      return {
        accessToken: slackResponse.access_token,
        // Slack tokens don't expire by default
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        scopes: slackResponse.scope.split(','),
      };
    }
    
    default:
      throw new Error(`OAuth token exchange not implemented for ${provider}`);
  }
}

async function getWorkspaceInfo(
  provider: IntegrationProvider,
  accessToken: string
): Promise<WorkspaceInfo> {
  switch (provider) {
    case ProviderEnum.NOTION: {
      const { getNotionWorkspaceInfo } = await import('./notion/service');
      const info = await getNotionWorkspaceInfo(accessToken);
      
      return {
        id: info.id,
        name: info.name,
        email: info.email,
      };
    }
    
    case ProviderEnum.DOCUSIGN:
      // TODO: Implement DocuSign workspace info
      throw new Error('DocuSign workspace info not implemented');
    
    case ProviderEnum.SLACK: {
      const { getSlackWorkspaceInfo } = await import('./slack/service');
      const info = await getSlackWorkspaceInfo(accessToken);
      
      return {
        id: info.id,
        name: info.name,
      };
    }
    
    default:
      throw new Error(`Workspace info not implemented for ${provider}`);
  }
}

async function revokeTokens(
  provider: IntegrationProvider,
  encryptedAccessToken: string | null
): Promise<void> {
  if (!encryptedAccessToken) return;
  
  try {
    // Implementation depends on provider
    console.log(`[Integration Service] Revoking tokens for ${provider}`);
  } catch (error) {
    console.warn(`[Integration Service] Failed to revoke tokens:`, error);
  }
}

async function performTokenRefresh(
  provider: IntegrationProvider,
  _refreshToken: string
): Promise<TokenResponse> {
  switch (provider) {
    case ProviderEnum.NOTION:
      // Notion tokens don't expire, return the existing token
      // This should never be called for Notion
      throw new Error('Notion tokens do not expire');
    
    case ProviderEnum.DOCUSIGN:
      // TODO: Implement DocuSign token refresh
      throw new Error('DocuSign token refresh not implemented');
    
    case ProviderEnum.SLACK:
      // Slack tokens don't expire by default
      throw new Error('Slack tokens do not expire');
    
    default:
      throw new Error(`Token refresh not implemented for ${provider}`);
  }
}
