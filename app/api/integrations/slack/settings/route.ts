/**
 * Slack Settings API
 *
 * Gets and updates Slack notification settings.
 *
 * GET  /api/integrations/slack/settings
 * POST /api/integrations/slack/settings
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { IntegrationProvider } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import { getConnectionByProvider } from '@/lib/integrations/service';
import { defaultSlackPreferences, type SlackPreferenceMap } from '@/lib/integrations/slack/preferences';

export interface SlackSettingsResponse {
  isConnected: boolean;
  workspaceName?: string;
  defaultChannelId?: string;
  defaultChannelName?: string;
  preferences: SlackPreferenceMap;
}

export interface SlackSettingsUpdateRequest {
  defaultChannelId?: string;
  defaultChannelName?: string;
  preferences?: SlackPreferenceMap;
}

// GET - Retrieve settings
export async function GET() {
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

    // Get connection
    const connection = await getConnectionByProvider(userId, IntegrationProvider.SLACK);

    if (!connection) {
      const response: SlackSettingsResponse = {
        isConnected: false,
        preferences: defaultSlackPreferences,
      };
      return NextResponse.json(response);
    }

    // Get settings from metadata
    const metadata = connection.metadata as Record<string, unknown> | undefined;
    const slackSettings = metadata?.slack as Record<string, unknown> | undefined;

    const savedPreferences = (slackSettings?.preferences as Partial<SlackPreferenceMap> | undefined) || {};
    const response: SlackSettingsResponse = {
      isConnected: true,
      workspaceName: connection.workspaceName || undefined,
      defaultChannelId: slackSettings?.defaultChannelId as string | undefined,
      defaultChannelName: slackSettings?.defaultChannelName as string | undefined,
      preferences: {
        ...defaultSlackPreferences,
        ...savedPreferences,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Slack Settings GET] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST - Update settings
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

    // Get connection
    const connection = await prisma.integrationConnection.findFirst({
      where: {
        userId,
        provider: IntegrationProvider.SLACK,
        status: 'CONNECTED',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Slack not connected' },
        { status: 404 }
      );
    }

    // Parse request body
    const body: SlackSettingsUpdateRequest = await req.json();
    const updatedPreferences: SlackPreferenceMap = {
      ...defaultSlackPreferences,
      ...(body.preferences || {}),
    };

    // Update metadata with Slack settings
    const existingMetadata = (connection.metadata as Record<string, unknown>) || {};
    
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        metadata: {
          ...existingMetadata,
          slack: {
            defaultChannelId: body.defaultChannelId,
            defaultChannelName: body.defaultChannelName,
            preferences: updatedPreferences,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Slack Settings POST] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
