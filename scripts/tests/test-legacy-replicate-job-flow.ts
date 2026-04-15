#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import { completeLegacyReplicateJob } from '@/lib/ai/application/complete-legacy-replicate-job';
import { failLegacyReplicateJob } from '@/lib/ai/application/fail-legacy-replicate-job';
import { getLegacyReplicateJobStatus } from '@/lib/ai/application/get-legacy-replicate-job-status';
import { handleLegacyReplicateWebhookJob } from '@/lib/ai/application/handle-legacy-replicate-webhook-job';
import { startFaceSwapGeneration } from '@/lib/ai/application/start-faceswap-generation';
import { startMotionTransferGeneration } from '@/lib/ai/application/start-motion-transfer-generation';
import { LegacyReplicateNotFoundError, LegacyReplicateQuotaExceededError } from '@/lib/ai/contracts/legacy-replicate-job';

async function testCompleteLegacyReplicateJobPersistsFaceSwapOutput() {
  let settled = false;
  let persisted = false;
  let updatedReceipt: Record<string, unknown> | null = null;

  const result = await completeLegacyReplicateJob(
    {
      predictionId: 'pred-legacy-1',
      prediction: {
        id: 'pred-legacy-1',
        status: 'succeeded',
        output: ['https://example.com/output.mp4'],
      },
      receipt: {
        ventureId: 'venture-1',
        userId: 'user-1',
        model: 'lucataco/faceswap',
        cost: 7,
        reservationId: 'reservation-1',
        createdAt: new Date().toISOString(),
      },
      jobKind: 'faceswap',
      processor: 'poll',
    },
    {
      async acquireJobLock(jobKind, predictionId, holder) {
        assert.equal(jobKind, 'faceswap');
        assert.equal(predictionId, 'pred-legacy-1');
        assert.equal(holder, 'poll');
        return {
          ventureId: 'venture-1',
          userId: 'user-1',
          model: 'lucataco/faceswap',
          cost: 7,
          reservationId: 'reservation-1',
          createdAt: new Date().toISOString(),
          processingId: 'lock-1',
          processingAt: new Date().toISOString(),
          processingBy: 'poll',
        };
      },
      async updateJobReceipt(jobKind, predictionId, updates) {
        assert.equal(jobKind, 'faceswap');
        assert.equal(predictionId, 'pred-legacy-1');
        updatedReceipt = updates;
        return {
          ventureId: 'venture-1',
          userId: 'user-1',
          model: 'lucataco/faceswap',
          cost: 7,
          reservationId: 'reservation-1',
          createdAt: new Date().toISOString(),
          ...updates,
        };
      },
      async extractOutputUrls(output) {
        assert.deepEqual(output, ['https://example.com/output.mp4']);
        return ['https://example.com/output.mp4'];
      },
      async persistVideoOutput(input) {
        persisted = true;
        assert.equal(input.storagePrefix, 'faceswap');
        assert.deepEqual(input.tags, ['faceswap', 'replicate']);
        return { assetId: 'asset-1', url: 'https://blob.example.com/faceswap.mp4' };
      },
      async settleEnergy(input) {
        settled = true;
        assert.equal(input.reservationId, 'reservation-1');
        assert.deepEqual(input.metadata, { assetId: 'asset-1' });
        return {};
      },
      async refundEnergy() {
        assert.fail('refundEnergy should not run on successful completion');
      },
    }
  );

  assert.equal(persisted, true);
  assert.equal(settled, true);
  assert.equal(result.status, 'succeeded');
  assert.equal(result.outputUrl, 'https://blob.example.com/faceswap.mp4');
  assert.equal(result.provider, 'replicate');
  assert.equal(updatedReceipt?.outputUrl, 'https://blob.example.com/faceswap.mp4');
  assert.equal(updatedReceipt?.processingId, null);
}

async function testCompleteLegacyReplicateJobReturnsProcessingWhenLocked() {
  const result = await completeLegacyReplicateJob(
    {
      predictionId: 'pred-legacy-2',
      prediction: {
        id: 'pred-legacy-2',
        status: 'succeeded',
        output: ['https://example.com/output.mp4'],
      },
      receipt: {
        ventureId: 'venture-1',
        userId: 'user-1',
        model: 'wan-animate',
        cost: 12,
        reservationId: 'reservation-2',
        createdAt: new Date().toISOString(),
      },
      jobKind: 'motion-transfer',
      processor: 'webhook',
    },
    {
      async acquireJobLock() {
        return null;
      },
      async updateJobReceipt() {
        assert.fail('updateJobReceipt should not run while another processor holds the lock');
      },
      async extractOutputUrls() {
        assert.fail('extractOutputUrls should not run while another processor holds the lock');
        return [];
      },
      async persistVideoOutput() {
        assert.fail('persistVideoOutput should not run while another processor holds the lock');
        return { assetId: 'asset-2', url: 'https://blob.example.com/motion.mp4' };
      },
      async settleEnergy() {
        assert.fail('settleEnergy should not run while another processor holds the lock');
        return {};
      },
      async refundEnergy() {
        assert.fail('refundEnergy should not run while another processor holds the lock');
      },
    }
  );

  assert.deepEqual(result, {
    status: 'processing',
    outputUrl: null,
    provider: 'replicate',
  });
}

async function testFailLegacyReplicateJobRefundsAndClearsLock() {
  let refunded = false;
  let updatedReceipt: Record<string, unknown> | null = null;

  const result = await failLegacyReplicateJob(
    {
      predictionId: 'pred-legacy-3',
      prediction: {
        id: 'pred-legacy-3',
        status: 'failed',
        error: 'provider failed',
      },
      receipt: {
        ventureId: 'venture-1',
        userId: 'user-1',
        model: 'wan-animate',
        cost: 12,
        reservationId: 'reservation-3',
        createdAt: new Date().toISOString(),
        processingId: 'lock-3',
        processingAt: new Date().toISOString(),
        processingBy: 'webhook',
      },
      jobKind: 'motion-transfer',
    },
    {
      async updateJobReceipt(jobKind, predictionId, updates) {
        assert.equal(jobKind, 'motion-transfer');
        assert.equal(predictionId, 'pred-legacy-3');
        updatedReceipt = updates;
        return null;
      },
      async refundEnergy(reservationId, reason) {
        refunded = true;
        assert.equal(reservationId, 'reservation-3');
        assert.equal(reason, 'motion-transfer-failed');
        return {};
      },
    }
  );

  assert.equal(refunded, true);
  assert.equal(result.status, 'failed');
  assert.equal(result.error, 'provider failed');
  assert.equal(updatedReceipt?.processingId, null);
  assert.equal(updatedReceipt?.error, 'provider failed');
  assert.ok(typeof updatedReceipt?.refundedAt === 'string');
}

async function testHandleLegacyReplicateWebhookJobRoutesToSharedUseCases() {
  let completedLegacyJob = false;

  const result = await handleLegacyReplicateWebhookJob(
    {
      predictionId: 'pred-legacy-4',
      prediction: {
        id: 'pred-legacy-4',
        status: 'succeeded',
        output: ['https://example.com/output.mp4'],
      },
    },
    {
      async findFaceSwapJobReceipt() {
        return null;
      },
      async findMotionTransferJobReceipt() {
        return {
          ventureId: 'venture-1',
          userId: 'user-1',
          model: 'wan-animate',
          cost: 12,
          reservationId: 'reservation-4',
          createdAt: new Date().toISOString(),
        };
      },
      async completeLegacyReplicateJob(input) {
        completedLegacyJob = true;
        assert.equal(input.jobKind, 'motion-transfer');
        assert.equal(input.processor, 'webhook');
        return { status: 'succeeded', outputUrl: 'https://blob.example.com/motion.mp4' };
      },
      async failLegacyReplicateJob() {
        assert.fail('failLegacyReplicateJob should not run on success');
      },
    }
  );

  assert.equal(completedLegacyJob, true);
  assert.equal(result, 'legacy-motion-transfer');
}

async function testHandleLegacyReplicateWebhookJobReturnsUnknown() {
  const result = await handleLegacyReplicateWebhookJob(
    {
      predictionId: 'pred-legacy-5',
      prediction: { id: 'pred-legacy-5', status: 'processing' },
    },
    {
      async findFaceSwapJobReceipt() {
        return null;
      },
      async findMotionTransferJobReceipt() {
        return null;
      },
      async completeLegacyReplicateJob() {
        assert.fail('completeLegacyReplicateJob should not run for unknown jobs');
      },
      async failLegacyReplicateJob() {
        assert.fail('failLegacyReplicateJob should not run for unknown jobs');
      },
    }
  );

  assert.equal(result, 'unknown');
}

async function testGetLegacyReplicateJobStatusUsesSharedCompletionPath() {
  let completed = false;

  const result = await getLegacyReplicateJobStatus(
    {
      userEmail: 'founder@example.com',
      ventureId: 'venture-1',
      predictionId: 'pred-legacy-6',
      jobKind: 'faceswap',
    },
    {
      async findUserByEmail(email) {
        assert.equal(email, 'founder@example.com');
        return { id: 'user-1' };
      },
      async findJobReceipt(jobKind, predictionId) {
        assert.equal(jobKind, 'faceswap');
        assert.equal(predictionId, 'pred-legacy-6');
        return {
          ventureId: 'venture-1',
          userId: 'user-1',
          model: 'lucataco/faceswap',
          cost: 7,
          reservationId: 'reservation-6',
          createdAt: new Date().toISOString(),
        };
      },
      async getPrediction(userId, predictionId) {
        assert.equal(userId, 'user-1');
        assert.equal(predictionId, 'pred-legacy-6');
        return {
          id: 'pred-legacy-6',
          status: 'succeeded',
          output: ['https://example.com/output.mp4'],
        };
      },
      async completeLegacyReplicateJob(input) {
        completed = true;
        assert.equal(input.jobKind, 'faceswap');
        assert.equal(input.processor, 'poll');
        return {
          status: 'succeeded',
          outputUrl: 'https://blob.example.com/faceswap.mp4',
          provider: 'replicate',
        };
      },
      async failLegacyReplicateJob() {
        assert.fail('failLegacyReplicateJob should not run on success');
      },
    }
  );

  assert.equal(completed, true);
  assert.deepEqual(result, {
    status: 'succeeded',
    outputUrl: 'https://blob.example.com/faceswap.mp4',
    provider: 'replicate',
  });
}

async function testGetLegacyReplicateJobStatusNotFound() {
  await assert.rejects(
    () =>
      getLegacyReplicateJobStatus(
        {
          userEmail: 'missing@example.com',
          ventureId: 'venture-1',
          predictionId: 'pred-legacy-7',
          jobKind: 'motion-transfer',
        },
        {
          async findUserByEmail() {
            return null;
          },
          async findJobReceipt() {
            return null;
          },
          async getPrediction() {
            assert.fail('getPrediction should not run when user is missing');
            return { id: 'pred-legacy-7', status: 'processing' };
          },
          async completeLegacyReplicateJob() {
            assert.fail('completeLegacyReplicateJob should not run when user is missing');
            return { status: 'succeeded' };
          },
          async failLegacyReplicateJob() {
            assert.fail('failLegacyReplicateJob should not run when user is missing');
            return { status: 'failed', error: 'failed' };
          },
        }
      ),
    LegacyReplicateNotFoundError
  );
}

async function testStartFaceSwapGeneration() {
  const formData = {
    get(name: string) {
      const values: Record<string, unknown> = {
        model: 'lucataco-faceswap',
        swapCondition: 'first',
        face: {
          name: 'face.png',
          type: 'image/png',
          size: 8,
          async arrayBuffer() {
            return new TextEncoder().encode('face').buffer;
          },
        },
        video: {
          name: 'clip.mp4',
          type: 'video/mp4',
          size: 8,
          async arrayBuffer() {
            return new TextEncoder().encode('video').buffer;
          },
        },
      };

      return (values[name] ?? null) as FormDataEntryValue | null;
    },
  } as unknown as FormData;

  let reserved = false;

  const result = await startFaceSwapGeneration(
    {
      userEmail: 'founder@example.com',
      ventureId: 'venture-1',
      requestId: 'req-face-1',
      formData,
      isDryRun: false,
      isDevelopment: false,
    },
    {
      async findUserByEmail(email) {
        assert.equal(email, 'founder@example.com');
        return { id: 'user-1' };
      },
      async findOwnedVenture(ventureId, ownerId) {
        assert.equal(ventureId, 'venture-1');
        assert.equal(ownerId, 'user-1');
        return { id: ventureId };
      },
      async reserveEnergy(input) {
        reserved = true;
        assert.equal(input.feature, 'marketing.faceswap');
        return { reservationId: 'reservation-face-1' };
      },
      async refundEnergy() {
        assert.fail('refundEnergy should not run on successful faceswap start');
      },
      async checkMonthlyAvatarQuota() {
        return { allowed: true, limit: 10, remaining: 9, resetAt: new Date() };
      },
      async checkDailyVideoQuota() {
        return { allowed: true, limit: 5, remaining: 4, resetAt: new Date() };
      },
      async uploadInputs(input) {
        assert.equal(input.userId, 'user-1');
        return {
          faceUrl: 'https://blob.example.com/face.png',
          videoUrl: 'https://blob.example.com/video.mp4',
        };
      },
      async createPrediction(input) {
        assert.equal(input.model, 'lucataco/faceswap');
        assert.deepEqual(input.input, {
          target_video: 'https://blob.example.com/video.mp4',
          swap_image: 'https://blob.example.com/face.png',
          swap_condition: 'first',
        });
        return {
          prediction: { id: 'pred-face-1', status: 'starting' },
          source: 'user',
        };
      },
      async saveJobReceipt(predictionId, receipt) {
        assert.equal(predictionId, 'pred-face-1');
        assert.equal(receipt.userId, 'user-1');
        assert.equal(receipt.reservationId, 'reservation-face-1');
      },
    }
  );

  assert.equal(reserved, true);
  assert.deepEqual(result, {
    predictionId: 'pred-face-1',
    status: 'starting',
    provider: 'replicate',
    model: 'Face Swap Pro (Roop)',
    creditsUsed: 50,
  });
}

async function testStartMotionTransferGenerationQuotaExceeded() {
  const formData = {
    get(name: string) {
      const values: Record<string, unknown> = {
        model: 'wan-2.2-animate',
        resolution: '720',
        drivingVideo: {
          name: 'drive.mp4',
          type: 'video/mp4',
          size: 8,
          async arrayBuffer() {
            return new TextEncoder().encode('drive').buffer;
          },
        },
        characterImage: {
          name: 'character.png',
          type: 'image/png',
          size: 8,
          async arrayBuffer() {
            return new TextEncoder().encode('character').buffer;
          },
        },
      };

      return (values[name] ?? null) as FormDataEntryValue | null;
    },
  } as unknown as FormData;

  let refundedReason: string | null = null;

  await assert.rejects(
    () =>
      startMotionTransferGeneration(
        {
          userEmail: 'founder@example.com',
          ventureId: 'venture-1',
          requestId: 'req-motion-1',
          formData,
          isDryRun: false,
          isDevelopment: false,
        },
        {
          async findUserByEmail() {
            return { id: 'user-1' };
          },
          async findOwnedVenture() {
            return { id: 'venture-1' };
          },
          async getUserTier() {
            return 'pro';
          },
          async reserveEnergy() {
            return { reservationId: 'reservation-motion-1' };
          },
          async refundEnergy(_, reason) {
            refundedReason = reason;
          },
          async checkDailyVideoQuota() {
            return {
              allowed: false,
              limit: 1,
              remaining: 0,
              resetAt: new Date(Date.now() + 60_000),
            };
          },
          async uploadInputs() {
            assert.fail('uploadInputs should not run after quota rejection');
            return {
              drivingVideoUrl: 'https://blob.example.com/drive.mp4',
              characterImageUrl: 'https://blob.example.com/character.png',
            };
          },
          async createPrediction() {
            assert.fail('createPrediction should not run after quota rejection');
            return {
              prediction: { id: 'pred-motion-1', status: 'starting' },
              source: 'user',
            };
          },
          async saveJobReceipt() {
            assert.fail('saveJobReceipt should not run after quota rejection');
          },
        }
      ),
    LegacyReplicateQuotaExceededError
  );

  assert.equal(refundedReason, 'daily-quota-exceeded');
}

async function run() {
  await testCompleteLegacyReplicateJobPersistsFaceSwapOutput();
  await testCompleteLegacyReplicateJobReturnsProcessingWhenLocked();
  await testFailLegacyReplicateJobRefundsAndClearsLock();
  await testHandleLegacyReplicateWebhookJobRoutesToSharedUseCases();
  await testHandleLegacyReplicateWebhookJobReturnsUnknown();
  await testGetLegacyReplicateJobStatusUsesSharedCompletionPath();
  await testGetLegacyReplicateJobStatusNotFound();
  await testStartFaceSwapGeneration();
  await testStartMotionTransferGenerationQuotaExceeded();

  console.log('Legacy Replicate job flow tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
