/**
 * Slack Notify API
 *
 * Sends notifications to Slack channels using pre-built templates.
 *
 * POST /api/integrations/slack/notify
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { IntegrationProvider } from '@prisma/client';
import { getConnectionByProvider, refreshAccessToken } from '@/lib/integrations/service';
import { prisma } from '@/lib/prisma';
import { 
  sendMessage, 
  SlackTemplates,
  SlackNotification,
  SlackMessageBlock,
} from '@/lib/integrations/slack/service';

export interface SlackNotifyRequest {
  channelId: string;
  template: 'venture_created' | 'squad_member_joined' | 'decision_made' | 
            'task_completed' | 'forum_activity' | 'marketing_generated' | 
            'supplier_update' | 'custom';
  data: Record<string, string | number | boolean>;
  customBlocks?: SlackMessageBlock[];
  text?: string;
  idempotencyKey?: string;
}

export interface SlackNotifyResponse {
  success: boolean;
  messageTs?: string;
  channel?: string;
  error?: string;
  skipped?: boolean;
}

function mapSlackError(error?: string) {
  switch (error) {
    case 'not_in_channel':
      return 'Bot is not in this channel. Invite the bot or enable chat:write.public for public channels.';
    case 'missing_scope':
      return 'Missing required Slack scope. Reinstall the Slack app with updated permissions.';
    case 'channel_not_found':
      return 'Channel not found or inaccessible by the bot.';
    case 'ratelimited':
      return 'Slack rate limit exceeded. Please retry in a moment.';
    default:
      return error || 'Failed to send message';
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body: SlackNotifyRequest = await req.json();
    
    if (!body.channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Get Slack connection
    const connection = await getConnectionByProvider(userId, IntegrationProvider.SLACK);
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Slack not connected' },
        { status: 404 }
      );
    }

    if (body.idempotencyKey) {
      const existing = await prisma.integrationSyncLog.findFirst({
        where: {
          connectionId: connection.id,
          resourceType: 'slack-notification:api',
          resourceId: body.idempotencyKey,
          status: 'SUCCESS',
        },
      });

      if (existing) {
        const response: SlackNotifyResponse = {
          success: true,
          skipped: true,
          messageTs: existing.externalId || undefined,
        };
        return NextResponse.json(response);
      }
    }

    // Get valid access token
    const accessToken = await refreshAccessToken(connection.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get valid Slack token' },
        { status: 401 }
      );
    }

    // Build notification based on template
    let blocks: SlackMessageBlock[] | undefined;
    let text: string;

    switch (body.template) {
      case 'venture_created':
        blocks = SlackTemplates.ventureCreated({
          ventureName: String(body.data.ventureName),
          founderName: String(body.data.founderName),
          ventureUrl: String(body.data.ventureUrl),
          description: body.data.description ? String(body.data.description) : undefined,
        });
        text = `🚀 New Venture: ${body.data.ventureName}`;
        break;

      case 'squad_member_joined':
        blocks = SlackTemplates.squadMemberJoined({
          ventureName: String(body.data.ventureName),
          memberName: String(body.data.memberName),
          role: String(body.data.role),
          ventureUrl: String(body.data.ventureUrl),
        });
        text = `👋 ${body.data.memberName} joined ${body.data.ventureName}`;
        break;

      case 'decision_made':
        blocks = SlackTemplates.decisionMade({
          ventureName: String(body.data.ventureName),
          decisionTitle: String(body.data.decisionTitle),
          decisionUrl: String(body.data.decisionUrl),
          votesFor: Number(body.data.votesFor) || 0,
          votesAgainst: Number(body.data.votesAgainst) || 0,
        });
        text = `✅ Decision: ${body.data.decisionTitle}`;
        break;

      case 'task_completed':
        blocks = SlackTemplates.taskCompleted({
          ventureName: String(body.data.ventureName),
          taskTitle: String(body.data.taskTitle),
          completedBy: String(body.data.completedBy),
          roadmapUrl: String(body.data.roadmapUrl),
        });
        text = `✅ Task: ${body.data.taskTitle}`;
        break;

      case 'forum_activity':
        blocks = SlackTemplates.forumActivity({
          postTitle: String(body.data.postTitle),
          authorName: String(body.data.authorName),
          category: String(body.data.category),
          replyCount: Number(body.data.replyCount) || 0,
          postUrl: String(body.data.postUrl),
        });
        text = `💬 Forum: ${body.data.postTitle}`;
        break;

      case 'marketing_generated':
        blocks = SlackTemplates.marketingGenerated({
          ventureName: String(body.data.ventureName),
          contentType: body.data.contentType as 'image' | 'video' | 'avatar',
          generatedBy: String(body.data.generatedBy),
          previewUrl: body.data.previewUrl ? String(body.data.previewUrl) : undefined,
          studioUrl: String(body.data.studioUrl),
        });
        text = `🎨 Marketing: New ${body.data.contentType}`;
        break;

      case 'supplier_update':
        blocks = SlackTemplates.supplierUpdate({
          ventureName: String(body.data.ventureName),
          supplierName: String(body.data.supplierName),
          status: body.data.status as 'sample_ordered' | 'sample_received' | 'order_placed' | 'shipped',
          sourcingUrl: String(body.data.sourcingUrl),
        });
        text = `📦 Supplier: ${body.data.supplierName}`;
        break;

      case 'custom':
        blocks = body.customBlocks;
        text = body.text || 'Notification from The Forge';
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown template' },
          { status: 400 }
        );
    }

    // Send notification
    const notification: SlackNotification = {
      channel: body.channelId,
      text,
      blocks,
    };

    const result = await sendMessage(accessToken, notification);

    if (!result.ok) {
      if (body.idempotencyKey) {
        await prisma.integrationSyncLog.create({
          data: {
            connectionId: connection.id,
            resourceType: 'slack-notification:api',
            resourceId: body.idempotencyKey,
            externalId: 'slack',
            direction: 'TO_EXTERNAL',
            status: 'FAILED',
            error: result.error || 'Slack notification failed',
            completedAt: new Date(),
          },
        });
      }

      const errorCode = result.error;
      const status =
        errorCode === 'not_in_channel' ||
        errorCode === 'missing_scope' ||
        errorCode === 'channel_not_found'
          ? 400
          : 500;
      return NextResponse.json(
        { 
          success: false, 
          error: mapSlackError(errorCode),
        },
        { status }
      );
    }

    if (body.idempotencyKey) {
      await prisma.integrationSyncLog.create({
        data: {
          connectionId: connection.id,
          resourceType: 'slack-notification:api',
          resourceId: body.idempotencyKey,
          externalId: result.ts || 'slack',
          direction: 'TO_EXTERNAL',
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });
    }

    const response: SlackNotifyResponse = {
      success: true,
      messageTs: result.ts,
      channel: result.channel,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Slack Notify API] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
