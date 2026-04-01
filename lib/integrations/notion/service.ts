/**
 * Notion Integration Service
 *
 * Enterprise-grade Notion API integration for The Forge.
 * Handles OAuth, page creation, database sync, and bidirectional updates.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { IntegrationProvider } from '@prisma/client';
import { 
  refreshAccessToken,
  getConnectionByProvider,
  logSync,
} from '../service';
import type {
  NotionPage,
  NotionSyncResult,
} from '../types';
import { SyncError } from '../types';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// ============================================
// OAuth Token Exchange
// ============================================

export interface NotionTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon?: string;
  workspace_id: string;
  owner: {
    type: 'user';
    user: {
      object: 'user';
      id: string;
      name: string;
      avatar_url?: string;
      type: 'person';
      person: { email: string };
    };
  };
}

export async function exchangeNotionCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<NotionTokenResponse> {
  const response = await fetch(`${NOTION_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Notion OAuth failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

// ============================================
// Workspace Info
// ============================================

export interface NotionWorkspaceInfo {
  id: string;
  name: string;
  icon?: string;
  email: string;
}

export async function getNotionWorkspaceInfo(
  accessToken: string
): Promise<NotionWorkspaceInfo> {
  const response = await fetch(`${NOTION_API_BASE}/users/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Notion workspace info');
  }

  const data = await response.json();
  
  return {
    id: data.workspace_id,
    name: data.workspace_name || 'Unknown Workspace',
    icon: data.workspace_icon,
    email: data.owner?.user?.person?.email || '',
  };
}

// ============================================
// Page Operations
// ============================================

export type NotionBlock =
  | { type: 'heading_1'; heading_1: { rich_text: Array<{ text: { content: string } }> } }
  | { type: 'heading_2'; heading_2: { rich_text: Array<{ text: { content: string } }> } }
  | { type: 'paragraph'; paragraph: { rich_text: Array<{ text: { content: string } }> } }
  | { type: 'bulleted_list_item'; bulleted_list_item: { rich_text: Array<{ text: { content: string } }> } }
  | { type: 'divider'; divider: Record<string, never> }
  | { type: 'callout'; callout: { rich_text: Array<{ text: { content: string } }>; icon?: { emoji: string } } };

export async function createNotionPage(
  accessToken: string,
  parentPageId: string,
  title: string,
  blocks: NotionBlock[],
  icon?: string
): Promise<NotionPage> {
  const response = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: {
          title: [{ text: { content: title } }],
        },
      },
      children: blocks,
      icon: icon ? { type: 'emoji', emoji: icon } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create page: ${error.message}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    title,
    url: data.url,
    lastEditedAt: data.last_edited_time,
  };
}

// ============================================
// Sync Brand DNA
// ============================================

export async function getValidNotionToken(userId: string): Promise<string | null> {
  const connection = await getConnectionByProvider(userId, IntegrationProvider.NOTION);
  if (!connection) return null;
  return refreshAccessToken(connection.id);
}

export async function syncBrandDNAToNotion(
  userId: string,
  ventureId: string,
  parentPageId: string
): Promise<NotionSyncResult> {
  const accessToken = await getValidNotionToken(userId);
  if (!accessToken) {
    throw new SyncError('Notion not connected', IntegrationProvider.NOTION, 'brand-dna', ventureId, false);
  }

  const brandDNA = await prisma.brandDNA.findUnique({
    where: { ventureId },
    include: { venture: { select: { name: true } } },
  });

  if (!brandDNA) {
    throw new SyncError('Brand DNA not found', IntegrationProvider.NOTION, 'brand-dna', ventureId, false);
  }

  const blocks: NotionBlock[] = [
    { type: 'heading_1', heading_1: { rich_text: [{ text: { content: '🎯 Mission' } }] } },
    { type: 'paragraph', paragraph: { rich_text: [{ text: { content: brandDNA.mission || 'Not defined' } }] } },
    { type: 'divider', divider: {} },
    
    { type: 'heading_1', heading_1: { rich_text: [{ text: { content: '💎 Core Values' } }] } },
    ...(brandDNA.values || []).map((value: string) => ({
      type: 'bulleted_list_item' as const,
      bulleted_list_item: { rich_text: [{ text: { content: value } }] },
    })),
    { type: 'divider', divider: {} },
    
    { type: 'heading_1', heading_1: { rich_text: [{ text: { content: '🗣️ Tone of Voice' } }] } },
    { type: 'paragraph', paragraph: { rich_text: [{ text: { content: brandDNA.toneOfVoice || 'Not defined' } }] } },
    { type: 'divider', divider: {} },
    
    { type: 'heading_1', heading_1: { rich_text: [{ text: { content: '✍️ Writing Style' } }] } },
    { type: 'paragraph', paragraph: { rich_text: [{ text: { content: brandDNA.writingStyle || 'Not defined' } }] } },
    { type: 'divider', divider: {} },
    
    { type: 'heading_1', heading_1: { rich_text: [{ text: { content: '👥 Target Audience' } }] } },
    { type: 'paragraph', paragraph: { rich_text: [{ text: { content: typeof brandDNA.targetAudience === 'string' ? brandDNA.targetAudience : JSON.stringify(brandDNA.targetAudience) } }] } },
    { type: 'divider', divider: {} },
    
    { type: 'heading_1', heading_1: { rich_text: [{ text: { content: '🎨 Visual Identity' } }] } },
    { type: 'paragraph', paragraph: { rich_text: [{ text: { content: brandDNA.primaryColor ? `Primary Color: ${brandDNA.primaryColor}` : 'Not defined' } }] } },
    ...(brandDNA.secondaryColors || []).map((color: string) => ({
      type: 'bulleted_list_item' as const,
      bulleted_list_item: { rich_text: [{ text: { content: color } }] },
    })),
    
    { type: 'callout', callout: { 
      rich_text: [{ text: { content: `Synced from The Forge - ${brandDNA.venture.name}` } }],
      icon: { emoji: '⚡' }
    }},
  ];

  const page = await createNotionPage(
    accessToken,
    parentPageId,
    `${brandDNA.venture.name} - Brand DNA`,
    blocks,
    '🎯'
  );

  return {
    success: true,
    notionPageId: page.id,
    notionUrl: page.url,
    lastSyncedAt: new Date(),
  };
}

// ============================================
// Search
// ============================================

export async function searchNotionPages(
  accessToken: string,
  query: string
): Promise<Array<{ id: string; title: string; url: string }>> {
  const response = await fetch(`${NOTION_API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Search failed: ${error.message}`);
  }

  const data = await response.json();
  
  return data.results.map((result: any) => ({
    id: result.id,
    title: result.properties?.title?.title?.[0]?.text?.content || 
            result.properties?.Name?.title?.[0]?.text?.content ||
            'Untitled',
    url: result.url,
  }));
}

// ============================================
// Sync Roadmap to Database
// ============================================

export async function syncRoadmapToNotion(
  accessToken: string,
  databaseId: string,
  ventureId: string,
  userId: string
): Promise<{ success: boolean; databaseUrl: string; tasksCreated: number; errors: string[] }> {
  // Fetch all tasks for this venture
  const tasks = await prisma.ventureTask.findMany({
    where: { ventureId },
    orderBy: { createdAt: 'asc' },
  });

  const errors: string[] = [];
  let tasksCreated = 0;

  for (const task of tasks) {
    try {
      const response = await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            Name: {
              title: [{ text: { content: task.title } }],
            },
            Status: {
              select: { name: getNotionStatus(task.status) },
            },
            ...(task.description ? {
              Description: {
                rich_text: [{ text: { content: task.description } }],
              },
            } : {}),
          },
          children: task.description ? [
            { type: 'paragraph', paragraph: { rich_text: [{ text: { content: task.description } }] } }
          ] : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        errors.push(`Task "${task.title}": ${error.message}`);
      } else {
        tasksCreated++;
      }
    } catch (error) {
      errors.push(`Task "${task.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get database URL
  const dbResponse = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
    },
  });

  const dbData = dbResponse.ok ? await dbResponse.json() : {};
  
  // Log the sync
  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: IntegrationProvider.NOTION },
    select: { id: true },
  });
  
  if (connection) {
    await logSync(
      connection.id,
      'roadmap',
      ventureId,
      databaseId,
      errors.length === 0 ? 'SUCCESS' : 'FAILED',
      errors.length > 0 ? errors.join('; ') : undefined
    );
  }

  return {
    success: errors.length === 0 || tasksCreated > 0,
    databaseUrl: dbData.url || `https://notion.so/${databaseId}`,
    tasksCreated,
    errors,
  };
}

function getNotionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'TODO': 'To Do',
    'IN_PROGRESS': 'In Progress',
    'DONE': 'Done',
    'BLOCKED': 'Blocked',
    'BACKLOG': 'Backlog',
  };
  return statusMap[status] || 'To Do';
}
