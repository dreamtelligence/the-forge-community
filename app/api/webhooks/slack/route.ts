/**
 * Slack Events Webhook
 *
 * Handles Slack event subscriptions with signature verification.
 *
 * POST /api/webhooks/slack
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { getSlackSigningSecret, verifySlackSignature } from '@/lib/integrations/slack/signature';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-slack-signature');
  const timestamp = req.headers.get('x-slack-request-timestamp');

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing Slack signature headers' }, { status: 400 });
  }

  let signingSecret: string;
  try {
    signingSecret = getSlackSigningSecret();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Missing Slack signing secret' },
      { status: 500 }
    );
  }

  const valid = verifySlackSignature({
    body,
    signature,
    timestamp,
    signingSecret,
  });

  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch (_error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (payload.type === 'url_verification' && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.event_id) {
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: payload.event_id },
    });

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await prisma.webhookEvent.create({
      data: { eventId: payload.event_id },
    });
  }

  // TODO: Handle specific Slack events here.
  return NextResponse.json({ ok: true });
}
