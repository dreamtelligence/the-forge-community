#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import {
  MarketingMediaNotFoundError,
  type MarketingMediaJobReceipt,
  type MarketingMediaPrediction,
  type MarketingMediaUploadFile,
} from '@/lib/ai/contracts/marketing-media';
import { resolveMarketingMediaGenerationPlan } from '@/lib/ai/domain/marketing-media';
import { reserveCreditsForGeneration } from '@/lib/ai/application/reserve-credits-for-generation';
import { completeReplicateJob } from '@/lib/ai/application/complete-replicate-job';
import { startMarketingMediaGeneration } from '@/lib/ai/application/start-marketing-media-generation';

function createMockFile(name: string, type: string, size = 8): MarketingMediaUploadFile {
  return {
    name,
    type,
    size,
    async arrayBuffer() {
      return new TextEncoder().encode('mockdata').buffer;
    },
  };
}

async function testStartMarketingMediaGeneration() {
  const formData = new FormData();
  formData.set('mode', 'text-to-image');
  formData.set('prompt', 'A premium studio product shot');
  formData.set('model', 'black-forest-labs/flux-2-pro');
  formData.set('aspectRatio', '1:1');

  const captured: Record<string, unknown> = {};

  const result = await startMarketingMediaGeneration(
    {
      userEmail: 'founder@example.com',
      ventureId: 'venture-1',
      requestId: 'req-1',
      formData,
    },
    {
      async findUserByEmail(email) {
        assert.equal(email, 'founder@example.com');
        return { id: 'user-1' };
      },
      async findOwnedVenture(ventureId, ownerId) {
        assert.equal(ventureId, 'venture-1');
        assert.equal(ownerId, 'user-1');
        return { id: ventureId, brandDNA: null };
      },
      async uploadInputs() {
        return { imageUrl: undefined, endImageUrl: undefined };
      },
      async reserveCreditsForGeneration(input) {
        captured.reserve = input;
        return { reservationId: 'reservation-1' };
      },
      async createPrediction(input) {
        captured.prediction = input;
        return {
          prediction: { id: 'pred-1', status: 'starting' },
          source: 'user' as const,
        };
      },
      async saveJobReceipt(predictionId, receipt) {
        captured.receipt = { predictionId, receipt };
      },
      async refundEnergy() {
        assert.fail('refundEnergy should not run on happy path');
      },
    }
  );

  assert.deepEqual(result, {
    predictionId: 'pred-1',
    status: 'starting',
    provider: 'replicate',
    creditsUsed: 4,
  });

  assert.deepEqual(captured.reserve, {
    userId: 'user-1',
    ventureId: 'venture-1',
    requestId: 'req-1',
    mode: 'text-to-image',
    modelId: 'black-forest-labs/flux-2-pro',
    cost: 4,
    hourlyLimit: 50,
    isVideoOutput: false,
    estimatedProviderCostEur: undefined,
    estimatedProviderCostUsd: undefined,
  });

  assert.equal(
    (captured.prediction as { input: { prompt: string } }).input.prompt,
    'A premium studio product shot'
  );
  assert.equal(
    (captured.receipt as { predictionId: string }).predictionId,
    'pred-1'
  );
}

async function testStartMarketingMediaGenerationNotFound() {
  const formData = new FormData();
  formData.set('mode', 'text-to-image');
  formData.set('prompt', 'test');

  await assert.rejects(
    () =>
      startMarketingMediaGeneration(
        {
          userEmail: 'missing@example.com',
          ventureId: 'venture-1',
          requestId: 'req-1',
          formData,
        },
        {
          async findUserByEmail() {
            return null;
          },
          async findOwnedVenture() {
            return { id: 'venture-1', brandDNA: null };
          },
          async uploadInputs() {
            return { imageUrl: undefined, endImageUrl: undefined };
          },
          async reserveCreditsForGeneration() {
            return { reservationId: 'reservation-1' };
          },
          async createPrediction() {
            return {
              prediction: { id: 'pred-1', status: 'starting' },
              source: 'user' as const,
            };
          },
          async saveJobReceipt() {},
          async refundEnergy() {},
        }
      ),
    MarketingMediaNotFoundError
  );
}

async function testReserveCreditsForGenerationHourlyQuota() {
  let refunded = false;

  await assert.rejects(
    () =>
      reserveCreditsForGeneration(
        {
          userId: 'user-1',
          ventureId: 'venture-1',
          requestId: 'req-1',
          mode: 'text-to-video',
          modelId: 'google/veo-3.1',
          cost: 35,
          hourlyLimit: 1,
          isVideoOutput: true,
        },
        {
          async reserveEnergy() {
            return {
              reservationId: 'reservation-1',
              reservedCredits: 35,
              balanceAfter: 100,
              status: 'RESERVED',
            };
          },
          async refundEnergy() {
            refunded = true;
          },
          async consumeHourlyQuota() {
            return {
              allowed: false,
              remaining: 0,
              limit: 1,
              resetAt: new Date(Date.now() + 10_000),
            };
          },
          async checkDailyImageQuota() {
            return { allowed: true, remaining: 1, limit: 1, resetAt: new Date() };
          },
          async checkDailyVideoQuota() {
            return { allowed: true, remaining: 1, limit: 1, resetAt: new Date() };
          },
        }
      ),
    /Stundenlimit erreicht/
  );

  assert.equal(refunded, true);
}

async function testCompleteReplicateJob() {
  const receipt: MarketingMediaJobReceipt = {
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

  const prediction: MarketingMediaPrediction = {
    id: 'pred-1',
    status: 'succeeded',
    output: ['https://example.com/output.png'],
  };

  const result = await completeReplicateJob(
    {
      predictionId: 'pred-1',
      prediction,
      receipt,
      ventureId: 'venture-1',
      userId: 'user-1',
    },
    {
      async acquireJobLock() {
        return receipt;
      },
      async updateJobReceipt(_predictionId, updates) {
        return { ...receipt, ...updates };
      },
      async extractOutputUrls(output) {
        return output as string[];
      },
      async persistOutputs() {
        return [{ id: 'asset-1', url: 'https://cdn.example.com/asset.png', type: 'image', isPublic: true }];
      },
      async settleEnergy() {
        return { creditsRemaining: 96 };
      },
      async refundEnergy() {
        assert.fail('refundEnergy should not run on completion success');
      },
    }
  );

  assert.deepEqual(result, {
    status: 'succeeded',
    assets: [{ id: 'asset-1', url: 'https://cdn.example.com/asset.png', type: 'image', isPublic: true }],
    provider: 'replicate',
    creditsRemaining: 96,
  });
}

function testResolveMarketingMediaGenerationPlan() {
  const plan = resolveMarketingMediaGenerationPlan({
    modeValue: 'image-to-image',
    prompt: 'blend three product references',
    model: 'google/nano-banana',
    rawAspectRatio: '16:9',
    useBrandContext: false,
    useCharacterPrompt: false,
    negativePrompt: '',
    outputResolution: 'invalid',
    originTag: 'Campaign-A',
    imageFile: null,
    endImageFile: null,
    existingImageUrl: null,
    existingEndImageUrl: null,
    imageFiles: [createMockFile('a.png', 'image/png'), createMockFile('b.png', 'image/png')],
  });

  assert.equal(plan.mode, 'image-to-image');
  assert.equal(plan.modelConfig.id, 'google/nano-banana');
  assert.equal(plan.originTag, 'campaign-a');
  assert.equal(plan.outputResolution, null);
}

async function run() {
  testResolveMarketingMediaGenerationPlan();
  await testStartMarketingMediaGeneration();
  await testStartMarketingMediaGenerationNotFound();
  await testReserveCreditsForGenerationHourlyQuota();
  await testCompleteReplicateJob();

  console.log('Marketing media flow tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
