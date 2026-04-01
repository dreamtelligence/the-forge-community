/**
 * Slack OAuth Auth Initiation
 *
 * Initiates the OAuth flow with Slack.
 *
 * GET /api/integrations/slack/auth
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { IntegrationProvider } from '@prisma/client';
import { generateOAuthUrl } from '@/lib/integrations/service';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL must be https for Slack OAuth.' },
        { status: 500 }
      );
    }

    const userId = session.user.id;
    
    // Get the redirect URL from query params or use default
    const { searchParams } = new URL(req.url);
    const redirectUrl = searchParams.get('redirect') || '/settings/integrations';

    // Generate OAuth URL
    const { url } = await generateOAuthUrl(
      userId,
      IntegrationProvider.SLACK,
      redirectUrl,
      undefined, // ventureId
      [
        'chat:write',
        'chat:write.public',
        'channels:read',
        'groups:read',
        'users:read',
        'team:read',
      ]
    );

    // Redirect to Slack OAuth
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('[Slack Auth] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
