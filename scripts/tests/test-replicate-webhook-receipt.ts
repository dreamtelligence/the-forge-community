#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyReplicateWebhook } from '@/lib/ai/infrastructure/replicate-webhook-verifier';
import { handleReplicateWebhookReceipt } from '@/lib/ai/application/handle-replicate-webhook-receipt';

function signWebhook(body: string, webhookId: string, timestamp: string, secret: string) {
  const signedContent = `${webhookId}.${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', Buffer.from(secret, 'utf8'))
    .update(signedContent)
    .digest('base64');
  return `v1,${signature}`;
}

function withWebhookSecret<T>(secret: string, fn: () => T): T {
  const previous = process.env.REPLICATE_WEBHOOK_SECRET;
  process.env.REPLICATE_WEBHOOK_SECRET = secret;
  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env.REPLICATE_WEBHOOK_SECRET;
    } else {
      process.env.REPLICATE_WEBHOOK_SECRET = previous;
    }
  }
}

function testVerifyReplicateWebhook() {
  const webhookId = 'delivery-1';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({ id: 'pred-1', status: 'succeeded' });
  const secret = 'replicate-secret';
  const signature = signWebhook(body, webhookId, timestamp, secret);

  const verified = withWebhookSecret(secret, () =>
    verifyReplicateWebhook({
      body,
      headers: {
        webhookId,
        webhookTimestamp: timestamp,
        webhookSignatures: signature,
      },
    })
  );

  assert.equal(verified.deliveryId, webhookId);
  assert.equal(verified.prediction.id, 'pred-1');
}

function testVerifyReplicateWebhookRejectsBadSignature() {
  const webhookId = 'delivery-1';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({ id: 'pred-1', status: 'succeeded' });

  assert.throws(
    () =>
      withWebhookSecret('correct-secret', () =>
        verifyReplicateWebhook({
          body,
          headers: {
            webhookId,
            webhookTimestamp: timestamp,
            webhookSignatures: signWebhook(body, webhookId, timestamp, 'wrong-secret'),
          },
        })
      ),
    /Invalid signature/
  );
}

async function testHandleReplicateWebhookReceiptMarketingSuccess() {
  let markedProcessed = false;
  let completed = false;

  const result = await handleReplicateWebhookReceipt(
    {
      deliveryId: 'delivery-1',
      rawBody: '{}',
      prediction: {
        id: 'pred-1',
        status: 'succeeded',
        output: ['https://example.com/output.png'],
      },
    },
    {
      async acquireDeliveryReceipt() {
        return { kind: 'acquired', receiptId: 'replicate:delivery-1' };
      },
      async markDeliveryProcessed() {
        markedProcessed = true;
      },
      async releaseDeliveryReceipt() {
        assert.fail('releaseDeliveryReceipt should not run on success');
      },
      async findMarketingMediaJobReceipt() {
        return {
          ventureId: 'venture-1',
          userId: 'user-1',
          mode: 'text-to-image',
          model: 'black-forest-labs/flux-2-pro',
          prompt: 'premium photo',
          aspectRatio: '1:1',
          cost: 4,
          reservationId: 'reservation-1',
          outputType: 'image',
          createdAt: new Date().toISOString(),
        };
      },
      async completeReplicateJob(input) {
        completed = true;
        assert.equal(input.processor, 'webhook');
        return { status: 'succeeded' };
      },
      async failReplicateJob() {
        assert.fail('failReplicateJob should not run on success');
      },
      async handleLegacyReplicateWebhookJob() {
        assert.fail('legacy handler should not run for marketing media job');
      },
    }
  );

  assert.equal(completed, true);
  assert.equal(markedProcessed, true);
  assert.deepEqual(result, {
    kind: 'processed',
    deliveryId: 'delivery-1',
    predictionId: 'pred-1',
    jobType: 'marketing-media',
  });
}

async function testHandleReplicateWebhookReceiptMarketingFailure() {
  let failed = false;

  const result = await handleReplicateWebhookReceipt(
    {
      deliveryId: 'delivery-2',
      rawBody: '{}',
      prediction: { id: 'pred-2', status: 'failed', error: 'provider failed' },
    },
    {
      async acquireDeliveryReceipt() {
        return { kind: 'acquired', receiptId: 'replicate:delivery-2' };
      },
      async markDeliveryProcessed() {},
      async releaseDeliveryReceipt() {
        assert.fail('releaseDeliveryReceipt should not run on handled failure');
      },
      async findMarketingMediaJobReceipt() {
        return {
          ventureId: 'venture-1',
          userId: 'user-1',
          mode: 'text-to-image',
          model: 'black-forest-labs/flux-2-pro',
          prompt: 'premium photo',
          aspectRatio: '1:1',
          cost: 4,
          reservationId: 'reservation-1',
          outputType: 'image',
          createdAt: new Date().toISOString(),
        };
      },
      async completeReplicateJob() {
        assert.fail('completeReplicateJob should not run on failure');
      },
      async failReplicateJob() {
        failed = true;
        return { status: 'failed', error: 'provider failed' };
      },
      async handleLegacyReplicateWebhookJob() {
        assert.fail('legacy handler should not run for marketing media job');
      },
    }
  );

  assert.equal(failed, true);
  assert.equal(result.kind, 'processed');
}

async function testHandleReplicateWebhookReceiptDuplicate() {
  const result = await handleReplicateWebhookReceipt(
    {
      deliveryId: 'delivery-3',
      rawBody: '{}',
      prediction: { id: 'pred-3', status: 'processing' },
    },
    {
      async acquireDeliveryReceipt() {
        return { kind: 'duplicate_processed', receiptId: 'replicate:delivery-3' };
      },
      async markDeliveryProcessed() {
        assert.fail('markDeliveryProcessed should not run for duplicates');
      },
      async releaseDeliveryReceipt() {
        assert.fail('releaseDeliveryReceipt should not run for duplicates');
      },
      async findMarketingMediaJobReceipt() {
        assert.fail('job lookup should not run for duplicates');
      },
      async completeReplicateJob() {
        assert.fail('complete should not run for duplicates');
      },
      async failReplicateJob() {
        assert.fail('fail should not run for duplicates');
      },
      async handleLegacyReplicateWebhookJob() {
        assert.fail('legacy handler should not run for duplicates');
      },
    }
  );

  assert.deepEqual(result, {
    kind: 'duplicate_processed',
    deliveryId: 'delivery-3',
  });
}

async function testHandleReplicateWebhookReceiptUnknownJob() {
  let released = false;

  await assert.rejects(
    () =>
      handleReplicateWebhookReceipt(
        {
          deliveryId: 'delivery-4',
          rawBody: '{}',
          prediction: { id: 'pred-4', status: 'processing' },
        },
        {
          async acquireDeliveryReceipt() {
            return { kind: 'acquired', receiptId: 'replicate:delivery-4' };
          },
          async markDeliveryProcessed() {
            assert.fail('markDeliveryProcessed should not run for unknown jobs');
          },
          async releaseDeliveryReceipt() {
            released = true;
          },
          async findMarketingMediaJobReceipt() {
            return null;
          },
          async completeReplicateJob() {
            assert.fail('complete should not run');
          },
          async failReplicateJob() {
            assert.fail('fail should not run');
          },
          async handleLegacyReplicateWebhookJob() {
            return 'unknown';
          },
        }
      ),
    /Replicate job receipt not found/
  );

  assert.equal(released, true);
}

async function run() {
  testVerifyReplicateWebhook();
  testVerifyReplicateWebhookRejectsBadSignature();
  await testHandleReplicateWebhookReceiptMarketingSuccess();
  await testHandleReplicateWebhookReceiptMarketingFailure();
  await testHandleReplicateWebhookReceiptDuplicate();
  await testHandleReplicateWebhookReceiptUnknownJob();

  console.log('Replicate webhook receipt tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
