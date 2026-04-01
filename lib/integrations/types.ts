/**
 * Integration Types
 *
 * TypeScript definitions for all enterprise integrations.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { 
  IntegrationProvider, 
} from '@prisma/client';
import type { 
  IntegrationStatus,
  SyncDirection,
  SyncStatus,
  DocuSignStatus 
} from '@prisma/client';

// Re-export Prisma enums
export { IntegrationProvider, IntegrationStatus, SyncDirection, SyncStatus, DocuSignStatus };

// ============================================
// Base Types
// ============================================

export interface IntegrationConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  oauth: OAuthConfig;
  scopes: ScopeDefinition[];
  features: IntegrationFeature[];
}

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
}

export interface ScopeDefinition {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

export interface IntegrationFeature {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

// ============================================
// Connection Types
// ============================================

export interface IntegrationConnectionDTO {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  workspaceName?: string;
  workspaceId?: string;
  userEmail?: string;
  scopes: string[];
  lastSyncedAt?: Date;
  lastError?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateConnectionRequest {
  provider: IntegrationProvider;
  ventureId?: string;
  scopes?: string[];
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
}

// ============================================
// Notion Specific Types
// ============================================

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEditedAt: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
}

export interface NotionSyncRequest {
  resourceType: 'brand-dna' | 'roadmap' | 'decisions' | 'venture';
  resourceId: string;
  notionPageId?: string; // If provided, update existing page
  syncMode: 'one-time' | 'bidirectional';
}

export interface NotionSyncResult {
  success: boolean;
  notionPageId: string;
  notionUrl: string;
  lastSyncedAt: Date;
}

// ============================================
// DocuSign Specific Types
// ============================================

export interface DocuSignSigner {
  email: string;
  name: string;
  role: 'founder' | 'supplier' | 'witness' | 'legal';
  routingOrder?: number;
}

export interface DocuSignTemplate {
  id: string;
  name: string;
  description?: string;
}

export interface CreateEnvelopeRequest {
  templateId?: string;
  documentType: 'co-founder' | 'supplier' | 'nda' | 'custom';
  signers: DocuSignSigner[];
  templateData: Record<string, string>; // Variables like {founder_name}
  emailSubject?: string;
  emailBody?: string;
}

export interface CreateEnvelopeResult {
  envelopeId: string;
  status: DocuSignStatus;
  signingUrl?: string; // For embedded signing
  sentDateTime?: string;
}

export interface DocuSignWebhookEvent {
  event: 'envelope-sent' | 'envelope-delivered' | 'envelope-completed' | 
         'envelope-declined' | 'envelope-voided' | 'recipient-completed';
  data: {
    envelopeId: string;
    status: string;
    statusChangedDateTime: string;
    recipients?: Array<{
      email: string;
      status: string;
      completedDateTime?: string;
    }>;
  };
}

// ============================================
// Sync Log Types
// ============================================

export interface SyncLogDTO {
  id: string;
  resourceType: string;
  resourceId: string;
  externalId: string;
  externalUrl?: string;
  direction: SyncDirection;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: string;
  retryCount: number;
}

// ============================================
// Error Types
// ============================================

export class IntegrationError extends Error {
  constructor(
    message: string,
    public provider: IntegrationProvider,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class OAuthError extends IntegrationError {
  constructor(
    message: string,
    provider: IntegrationProvider,
    public errorCode: string,
    public errorDescription?: string
  ) {
    super(message, provider, 'OAUTH_ERROR', false);
    this.name = 'OAuthError';
  }
}

export class SyncError extends IntegrationError {
  constructor(
    message: string,
    provider: IntegrationProvider,
    public resourceType: string,
    public resourceId: string,
    retryable: boolean = true
  ) {
    super(message, provider, 'SYNC_ERROR', retryable);
    this.name = 'SyncError';
  }
}

// ============================================
// API Response Types
// ============================================

export interface IntegrationListResponse {
  connections: IntegrationConnectionDTO[];
  available: IntegrationConfig[];
}

export interface OAuthUrlResponse {
  url: string;
  state: string;
}

// ============================================
// Provider Configurations
// ============================================

export const NOTION_CONFIG: IntegrationConfig = {
  provider: IntegrationProvider.NOTION,
  name: 'Notion',
  description: 'Sync Brand DNA, Roadmaps and Decisions to your Notion workspace',
  icon: 'notion',
  oauth: {
    authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    additionalParams: {
      owner: 'user',
    },
  },
  scopes: [],
  features: [
    {
      id: 'brand-dna-sync',
      name: 'Brand DNA Sync',
      description: 'Export Brand DNA as structured Notion page',
      available: true,
    },
    {
      id: 'roadmap-sync',
      name: 'Roadmap Database',
      description: 'Sync Roadmap as Notion Database',
      available: true,
    },
    {
      id: 'decisions-sync',
      name: 'Decision Wiki',
      description: 'Export decisions with audit trail',
      available: true,
    },
  ],
};

export const DOCUSIGN_CONFIG: IntegrationConfig = {
  provider: IntegrationProvider.DOCUSIGN,
  name: 'DocuSign',
  description: 'Digital signatures for Co-Founder Agreements and Supplier Contracts',
  icon: 'docusign',
  oauth: {
    authorizeUrl: 'https://account.docusign.com/oauth/auth',
    tokenUrl: 'https://account.docusign.com/oauth/token',
    scopes: ['signature', 'impersonation'],
  },
  scopes: [
    {
      id: 'signature',
      name: 'Send and Manage Envelopes',
      description: 'Create and send documents for signature',
      required: true,
    },
  ],
  features: [
    {
      id: 'cofounder-agreement',
      name: 'Co-Founder Agreements',
      description: 'Digital signatures for squad agreements',
      available: true,
    },
    {
      id: 'supplier-contracts',
      name: 'Supplier Contracts',
      description: 'NDAs and Purchase Orders',
      available: true,
    },
    {
      id: 'templates',
      name: 'Template Management',
      description: 'Use custom DocuSign templates',
      available: true,
    },
  ],
};

// ============================================
// Slack Specific Types
// ============================================

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
  topic?: string;
  purpose?: string;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
}

export interface SlackWebhookEvent {
  type: string;
  event: {
    type: string;
    user?: string;
    channel?: string;
    text?: string;
    ts?: string;
    team?: string;
  };
  team_id: string;
  api_app_id: string;
}

export interface SlackNotificationRequest {
  channelId?: string;
  channelName?: string;
  template: 'venture_created' | 'squad_member_joined' | 'decision_made' | 
            'task_completed' | 'forum_activity' | 'marketing_generated' | 
            'supplier_update' | 'custom';
  data: Record<string, string | number | boolean>;
  customBlocks?: unknown[];
}

export interface SlackConnectionSetup {
  defaultChannel?: string;
  notificationPreferences: {
    ventureCreated: boolean;
    squadMemberJoined: boolean;
    decisionMade: boolean;
    taskCompleted: boolean;
    forumActivity: boolean;
    marketingGenerated: boolean;
    supplierUpdate: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
  };
}

export const SLACK_CONFIG: IntegrationConfig = {
  provider: IntegrationProvider.SLACK,
  name: 'Slack',
  description: 'Get notified in Slack about venture activity, squad updates, and decisions',
  icon: 'slack',
  oauth: {
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'groups:read',
      'users:read',
      'team:read',
    ],
  },
  scopes: [
    {
      id: 'chat:write',
      name: 'Send Messages',
      description: 'Send notifications to your Slack channels',
      required: true,
    },
    {
      id: 'channels:read',
      name: 'Read Channel Info',
      description: 'List available channels for notifications',
      required: true,
    },
    {
      id: 'users:read',
      name: 'Read User Info',
      description: 'Map Slack users to The Forge members',
      required: false,
    },
  ],
  features: [
    {
      id: 'venture-notifications',
      name: 'Venture Notifications',
      description: 'Get notified when new ventures are created',
      available: true,
    },
    {
      id: 'squad-updates',
      name: 'Squad Updates',
      description: 'Notifications about squad member activity',
      available: true,
    },
    {
      id: 'decision-alerts',
      name: 'Decision Alerts',
      description: 'Be informed when decisions are finalized',
      available: true,
    },
    {
      id: 'task-completed',
      name: 'Task Completion',
      description: 'Get notified when roadmap tasks are completed',
      available: true,
    },
    {
      id: 'marketing-generated',
      name: 'Marketing Content',
      description: 'Notifications for generated images, videos, and avatars',
      available: true,
    },
    {
      id: 'sourcing-updates',
      name: 'Sourcing Updates',
      description: 'Updates on supplier samples and orders',
      available: true,
    },
  ],
};

// Map of all provider configs
export const INTEGRATION_CONFIGS: Record<IntegrationProvider, IntegrationConfig> = {
  [IntegrationProvider.NOTION]: NOTION_CONFIG,
  [IntegrationProvider.DOCUSIGN]: DOCUSIGN_CONFIG,
  [IntegrationProvider.SLACK]: SLACK_CONFIG,
  [IntegrationProvider.GITHUB]: null as any, // Placeholder
  [IntegrationProvider.GOOGLE_CALENDAR]: null as any,
  [IntegrationProvider.SHOPIFY]: null as any,
  [IntegrationProvider.AIRTABLE]: null as any,
};
