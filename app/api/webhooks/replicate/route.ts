import { NextRequest, NextResponse } from 'next/server';
import { handleReplicateWebhookReceipt } from '@/lib/ai/application/handle-replicate-webhook-receipt';
import { toReplicateWebhookErrorResponse } from '@/lib/ai/contracts/replicate-webhook';
import { verifyReplicateWebhook } from '@/lib/ai/infrastructure/replicate-webhook-verifier';
import { trackServerError } from '@/lib/utils/error-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.text();

  try {
    const webhook = verifyReplicateWebhook({
      body,
      headers: {
        webhookId: req.headers.get('webhook-id') || '',
        webhookTimestamp: req.headers.get('webhook-timestamp') || '',
        webhookSignatures: req.headers.get('webhook-signature') || '',
      },
    });

    await handleReplicateWebhookReceipt(webhook);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await trackServerError(error, {
      route: '/api/webhooks/replicate',
      provider: 'replicate',
    });
    const response = toReplicateWebhookErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
