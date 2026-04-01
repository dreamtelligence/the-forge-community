/**
 * Slack OAuth Callback
 *
 * Handles the OAuth redirect from Slack after user authorization.
 *
 * GET /api/integrations/slack/callback?code=xxx&state=xxx
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthCallback } from '@/lib/integrations/service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('[Slack OAuth] Error:', error);
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  // Validate params
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=Missing+code+or+state', req.url)
    );
  }

  // Process OAuth callback
  const result = await handleOAuthCallback(code, state);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(result.error || 'OAuth failed')}`, req.url)
    );
  }

  // Success - redirect back to integrations page
  return NextResponse.redirect(
    new URL('/settings/integrations?success=slack-connected', req.url)
  );
}
