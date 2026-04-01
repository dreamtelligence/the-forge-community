/**
 * Slack Disconnect API
 *
 * Disconnects the Slack integration for the current user.
 *
 * POST /api/integrations/slack/disconnect
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { IntegrationProvider } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function POST() {
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

    // Find and update the Slack connection
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

    // Update connection status
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Slack Disconnect] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
