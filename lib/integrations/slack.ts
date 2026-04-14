/**
 * Slack Notifications Helper
 *
 * Convenient functions to send Slack notifications from anywhere in the app.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { randomUUID } from 'crypto';
import { prisma } from './prisma';
import { IntegrationProvider } from '@prisma/client';
import { refreshAccessToken } from './integrations/service';
import { sendMessage, SlackTemplates } from './integrations/slack/service';
import type { SlackMessageBlock } from './integrations/slack/service';
import { defaultSlackPreferences, type SlackPreferenceKey, type SlackPreferenceMap } from './integrations/slack/preferences';

// ============================================
// Venture Notifications
// ============================================

export async function notifyVentureCreated(params: {
  ventureId: string;
  ventureName: string;
  founderName: string;
  founderId: string;
  description?: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
  
  await sendToUserSlack(params.founderId, {
    template: 'venture_created',
    data: {
      ventureName: params.ventureName,
      founderName: params.founderName,
      ventureUrl: `${appUrl}/ventures/${params.ventureId}`,
      description: params.description,
    },
  });
}

export async function notifySquadMemberJoined(params: {
  ventureId: string;
  ventureName: string;
  memberName: string;
  memberId: string;
  role: string;
  notifiedUserId: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
  
  await sendToUserSlack(params.notifiedUserId, {
    template: 'squad_member_joined',
    data: {
      ventureName: params.ventureName,
      memberName: params.memberName,
      role: params.role,
      ventureUrl: `${appUrl}/ventures/${params.ventureId}`,
    },
  });
}

// ============================================
// Decision Notifications
// ============================================

export async function notifyDecisionMade(params: {
  ventureId: string;
  ventureName: string;
  decisionId: string;
  decisionTitle: string;
  votesFor: number;
  votesAgainst: number;
  squadMemberIds: string[];
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
  
  // Notify all squad members
  await Promise.all(
    params.squadMemberIds.map(userId =>
      sendToUserSlack(userId, {
        template: 'decision_made',
        data: {
          ventureName: params.ventureName,
          decisionTitle: params.decisionTitle,
          decisionUrl: `${appUrl}/ventures/${params.ventureId}/decisions`,
          votesFor: params.votesFor,
          votesAgainst: params.votesAgainst,
        },
      })
    )
  );
}

// ============================================
// Task Notifications
// ============================================

export async function notifyTaskCompleted(params: {
  ventureId: string;
  ventureName: string;
  taskTitle: string;
  completedByName: string;
  squadMemberIds: string[];
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
  
  await Promise.all(
    params.squadMemberIds.map(userId =>
      sendToUserSlack(userId, {
        template: 'task_completed',
        data: {
          ventureName: params.ventureName,
          taskTitle: params.taskTitle,
          completedBy: params.completedByName,
          roadmapUrl: `${appUrl}/ventures/${params.ventureId}`,
        },
      })
    )
  );
}

// ============================================
// Marketing Notifications
// ============================================

export async function notifyMarketingGenerated(params: {
  ventureId: string;
  ventureName: string;
  contentType: 'image' | 'video' | 'avatar';
  generatedByName: string;
  generatedById: string;
  previewUrl?: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
  
  await sendToUserSlack(params.generatedById, {
    template: 'marketing_generated',
    data: {
      ventureName: params.ventureName,
      contentType: params.contentType,
      generatedBy: params.generatedByName,
      previewUrl: params.previewUrl,
      studioUrl: `${appUrl}/ventures/${params.ventureId}/marketing`,
    },
  });
}

// ============================================
// Supplier/Sourcing Notifications
// ============================================

export async function notifySupplierUpdate(params: {
  ventureId: string;
  ventureName: string;
  supplierName: string;
  status: 'sample_ordered' | 'sample_received' | 'order_placed' | 'shipped';
  squadMemberIds: string[];
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
  
  await Promise.all(
    params.squadMemberIds.map(userId =>
      sendToUserSlack(userId, {
        template: 'supplier_update',
        data: {
          ventureName: params.ventureName,
          supplierName: params.supplierName,
          status: params.status,
          sourcingUrl: `${appUrl}/ventures/${params.ventureId}/sourcing`,
        },
      })
    )
  );
}

// ============================================
// Core Helper
// ============================================

interface SendSlackNotificationParams {
  template: string;
  data: Record<string, string | number | boolean | undefined>;
  customBlocks?: SlackMessageBlock[];
  text?: string;
  idempotencyKey?: string;
}

async function sendToUserSlack(
  userId: string,
  params: SendSlackNotificationParams
): Promise<void> {
  try {
    // Get user's Slack connection
    const connection = await prisma.integrationConnection.findFirst({
      where: {
        userId,
        provider: IntegrationProvider.SLACK,
        status: 'CONNECTED',
      },
    });

    if (!connection) {
      return; // User hasn't connected Slack
    }

    // Check notification preferences
    const metadata = (connection.metadata as Record<string, unknown>) || {};
    const slackSettings = metadata.slack as Record<string, unknown> | undefined;
    const storedPreferences = slackSettings?.preferences as
      | SlackPreferenceMap
      | Array<{ id: string; enabled: boolean }>
      | undefined;

    const preferences = normalizePreferences(storedPreferences);

    // Check if this notification type is enabled
    const notificationKey = getPreferenceKey(params.template);
    if (notificationKey && preferences && notificationKey in preferences && !(preferences as Record<string, boolean>)[notificationKey]) {
      return; // Notification disabled
    }

    const channelId = slackSettings?.defaultChannelId as string | undefined;
    if (!channelId) {
      return; // No default channel set
    }

    const resourceType = `slack-notification:${params.template}`;
    const idempotencyKey =
      params.idempotencyKey || (params.data.requestId ? String(params.data.requestId) : undefined);

    if (idempotencyKey) {
      const existing = await prisma.integrationSyncLog.findFirst({
        where: {
          connectionId: connection.id,
          resourceType,
          resourceId: idempotencyKey,
          status: 'SUCCESS',
        },
      });

      if (existing) {
        return; // Already delivered
      }
    }

    // Get valid access token
    const accessToken = await refreshAccessToken(connection.id);
    if (!accessToken) {
      console.warn(`[Slack Notifications] Failed to get valid token for user ${userId}`);
      return;
    }

    // Build blocks based on template
    let blocks: SlackMessageBlock[] | undefined;
    let text: string;

    switch (params.template) {
      case 'venture_created':
        blocks = SlackTemplates.ventureCreated({
          ventureName: String(params.data.ventureName),
          founderName: String(params.data.founderName),
          ventureUrl: String(params.data.ventureUrl),
          description: params.data.description as string | undefined,
        });
        text = `🚀 New Venture: ${params.data.ventureName}`;
        break;

      case 'squad_member_joined':
        blocks = SlackTemplates.squadMemberJoined({
          ventureName: String(params.data.ventureName),
          memberName: String(params.data.memberName),
          role: String(params.data.role),
          ventureUrl: String(params.data.ventureUrl),
        });
        text = `👋 ${params.data.memberName} joined ${params.data.ventureName}`;
        break;

      case 'decision_made':
        blocks = SlackTemplates.decisionMade({
          ventureName: String(params.data.ventureName),
          decisionTitle: String(params.data.decisionTitle),
          decisionUrl: String(params.data.decisionUrl),
          votesFor: Number(params.data.votesFor) || 0,
          votesAgainst: Number(params.data.votesAgainst) || 0,
        });
        text = `✅ Decision: ${params.data.decisionTitle}`;
        break;

      case 'task_completed':
        blocks = SlackTemplates.taskCompleted({
          ventureName: String(params.data.ventureName),
          taskTitle: String(params.data.taskTitle),
          completedBy: String(params.data.completedBy),
          roadmapUrl: String(params.data.roadmapUrl),
        });
        text = `✅ Task: ${params.data.taskTitle}`;
        break;

      case 'forum_activity':
        blocks = SlackTemplates.forumActivity({
          postTitle: String(params.data.postTitle),
          authorName: String(params.data.authorName),
          category: String(params.data.category),
          replyCount: Number(params.data.replyCount) || 0,
          postUrl: String(params.data.postUrl),
        });
        text = `💬 Forum: ${params.data.postTitle}`;
        break;

      case 'marketing_generated':
        blocks = SlackTemplates.marketingGenerated({
          ventureName: String(params.data.ventureName),
          contentType: params.data.contentType as 'image' | 'video' | 'avatar',
          generatedBy: String(params.data.generatedBy),
          previewUrl: params.data.previewUrl as string | undefined,
          studioUrl: String(params.data.studioUrl),
        });
        text = `🎨 Marketing: New ${params.data.contentType}`;
        break;

      case 'supplier_update':
        blocks = SlackTemplates.supplierUpdate({
          ventureName: String(params.data.ventureName),
          supplierName: String(params.data.supplierName),
          status: params.data.status as 'sample_ordered' | 'sample_received' | 'order_placed' | 'shipped',
          sourcingUrl: String(params.data.sourcingUrl),
        });
        text = `📦 Supplier: ${params.data.supplierName}`;
        break;

      case 'custom':
        blocks = params.customBlocks;
        text = params.text || 'Notification from The Forge';
        break;

      default:
        console.warn(`[Slack Notifications] Unknown template: ${params.template}`);
        return;
    }

    // Send message
    const result = await sendMessage(accessToken, {
      channel: channelId,
      text,
      blocks,
    });

    const resourceId = idempotencyKey || randomUUID();
    if (!result.ok) {
      await prisma.integrationSyncLog.create({
        data: {
          connectionId: connection.id,
          resourceType,
          resourceId,
          externalId: 'slack',
          direction: 'TO_EXTERNAL',
          status: 'FAILED',
          error: result.error || 'Slack notification failed',
          completedAt: new Date(),
        },
      });

      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          lastError: result.error || 'Slack notification failed',
          lastErrorAt: new Date(),
        },
      });

      return;
    }

    await prisma.integrationSyncLog.create({
      data: {
        connectionId: connection.id,
        resourceType,
        resourceId,
        externalId: result.ts || 'slack',
        direction: 'TO_EXTERNAL',
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Slack Notifications] Error:', error);
    // Don't throw - notifications should not break the app
  }
}

function getPreferenceKey(template: string): string | null {
  const mapping: Record<string, string> = {
    'venture_created': 'ventureCreated',
    'squad_member_joined': 'squadMemberJoined',
    'decision_made': 'decisionMade',
    'task_completed': 'taskCompleted',
    'forum_activity': 'forumActivity',
    'marketing_generated': 'marketingGenerated',
    'supplier_update': 'supplierUpdate',
  };
  return mapping[template] || null;
}

function normalizePreferences(
  stored?: SlackPreferenceMap | Array<{ id: string; enabled: boolean }>
): SlackPreferenceMap {
  if (!stored) {
    return { ...defaultSlackPreferences };
  }

  if (Array.isArray(stored)) {
    const map: SlackPreferenceMap = { ...defaultSlackPreferences };
    stored.forEach((pref) => {
      if (pref.id in map) {
        map[pref.id as SlackPreferenceKey] = !!pref.enabled;
      }
    });
    return map;
  }

  return {
    ...defaultSlackPreferences,
    ...stored,
  };
}

// ============================================
// Bulk Notifications (Admin/Digest)
// ============================================

export async function sendWeeklyDigest(userId: string, summary: {
  venturesCreated: number;
  tasksCompleted: number;
  decisionsMade: number;
  topForumPosts: Array<{ title: string; url: string; replies: number }>;
}): Promise<void> {
  
  const blocks: SlackMessageBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 Your Weekly Forge Digest',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*New Ventures*\n${summary.venturesCreated}` },
        { type: 'mrkdwn', text: `*Tasks Completed*\n${summary.tasksCompleted}` },
        { type: 'mrkdwn', text: `*Decisions Made*\n${summary.decisionsMade}` },
      ],
    },
  ];

  if (summary.topForumPosts.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*🔥 Top Forum Discussions*' },
    });

    summary.topForumPosts.slice(0, 3).forEach(post => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• <${post.url}|${post.title}> (${post.replies} replies)`,
        },
      });
    });
  }

  await sendToUserSlack(userId, {
    template: 'custom',
    data: {},
    customBlocks: blocks,
    text: '📊 Your Weekly Forge Digest',
  });
}
