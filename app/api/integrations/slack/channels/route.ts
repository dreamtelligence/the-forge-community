/**
 * Slack Channels API
 *
 * Lists available channels in the connected Slack workspace.
 *
 * GET /api/integrations/slack/channels
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { IntegrationProvider } from '@prisma/client';
import { getConnectionByProvider, refreshAccessToken } from '@/lib/integrations/service';
import { listChannels, listUsers, SlackChannel, SlackUser } from '@/lib/integrations/slack/service';

export interface SlackChannelsResponse {
  channels: SlackChannel[];
  users: SlackUser[];
}

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

    // Get Slack connection
    const connection = await getConnectionByProvider(userId, IntegrationProvider.SLACK);
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Slack not connected' },
        { status: 404 }
      );
    }

    // Get valid access token
    const accessToken = await refreshAccessToken(connection.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get valid Slack token' },
        { status: 401 }
      );
    }

    // Fetch channels and users in parallel
    const [channels, users] = await Promise.all([
      listChannels(accessToken),
      listUsers(accessToken),
    ]);

    const response: SlackChannelsResponse = {
      channels,
      users,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Slack Channels API] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
