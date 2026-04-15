import {
  type MarketingMediaJobReceipt,
  type MarketingMediaPrediction,
  type MarketingMediaStatusResult,
} from '@/lib/ai/contracts/marketing-media';
import {
  hasCompletedMarketingMediaAssets,
  normalizeMarketingMediaProcessingError,
} from '@/lib/ai/domain/marketing-media';

type CompleteReplicateJobInput = {
  predictionId: string;
  prediction: MarketingMediaPrediction;
  receipt: MarketingMediaJobReceipt;
  ventureId: string;
  userId: string;
  processor?: string;
};

type CompleteReplicateJobDependencies = {
  acquireJobLock: (
    predictionId: string,
    holder: string
  ) => Promise<MarketingMediaJobReceipt | null>;
  updateJobReceipt: (
    predictionId: string,
    updates: Partial<MarketingMediaJobReceipt>
  ) => Promise<MarketingMediaJobReceipt | null>;
  extractOutputUrls: (output: unknown) => Promise<string[]>;
  persistOutputs: (input: {
    outputUrls: string[];
    outputType: 'image' | 'video';
    ventureId: string;
    userId: string;
    prompt: string;
    model: string;
    mode: import('@/lib/ai/contracts/marketing-media').MarketingMediaMode;
    originTag?: string;
    aspectRatio: string;
  }) => Promise<import('@/lib/ai/contracts/marketing-media').MarketingMediaCachedAsset[]>;
  settleEnergy: (input: {
    reservationId: string;
    finalCost: number;
    provider: string;
    model: string;
    metadata: Record<string, unknown>;
  }) => Promise<{ creditsRemaining?: number } | null>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
};

const loadDefaultDependencies = async (): Promise<CompleteReplicateJobDependencies> => {
  const [jobStore, replicate, storage, energy] = await Promise.all([
    import('@/lib/ai/infrastructure/marketing-media-job-store'),
    import('@/lib/ai/infrastructure/marketing-media-replicate'),
    import('@/lib/ai/infrastructure/marketing-media-storage'),
    import('@/lib/finance/energy'),
  ]);

  return {
    acquireJobLock: jobStore.acquireMarketingMediaJobLock,
    updateJobReceipt: jobStore.updateMarketingMediaJobReceipt,
    extractOutputUrls: replicate.extractMarketingMediaOutputUrls,
    persistOutputs: storage.persistMarketingMediaOutputs,
    settleEnergy: energy.settleEnergy,
    refundEnergy: energy.refundEnergy,
  };
};

export async function completeReplicateJob(
  input: CompleteReplicateJobInput,
  dependencies?: CompleteReplicateJobDependencies
): Promise<MarketingMediaStatusResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  if (hasCompletedMarketingMediaAssets(input.receipt)) {
    return {
      status: input.prediction.status,
      assets: input.receipt.assets ?? null,
      provider: 'replicate',
      creditsRemaining: input.receipt.creditsRemaining ?? null,
    };
  }

  const lockedJob = await resolvedDependencies.acquireJobLock(
    input.predictionId,
    input.processor || 'poll'
  );
  if (!lockedJob) {
    return {
      status: 'processing',
      assets: input.receipt.assets ?? null,
      provider: 'replicate',
      creditsRemaining: input.receipt.creditsRemaining ?? null,
    };
  }

  if (hasCompletedMarketingMediaAssets(lockedJob)) {
    return {
      status: input.prediction.status,
      assets: lockedJob.assets ?? null,
      provider: 'replicate',
      creditsRemaining: lockedJob.creditsRemaining ?? null,
    };
  }

  try {
    const outputUrls = await resolvedDependencies.extractOutputUrls(input.prediction.output);
    if (!outputUrls.length) {
      await resolvedDependencies.updateJobReceipt(input.predictionId, {
        error: 'Kein Output von Replicate',
        processingId: null,
        processingAt: null,
        processingBy: null,
      });
      return { status: 'failed', error: 'Kein Output von Replicate' };
    }

    const assets = await resolvedDependencies.persistOutputs({
      outputUrls,
      outputType: lockedJob.outputType,
      ventureId: input.ventureId,
      userId: input.userId,
      prompt: lockedJob.prompt,
      model: lockedJob.model,
      mode: lockedJob.mode,
      originTag: lockedJob.originTag,
      aspectRatio: lockedJob.aspectRatio,
    });

    let creditsRemaining = lockedJob.creditsRemaining;
    if (lockedJob.reservationId) {
      const settlement = await resolvedDependencies.settleEnergy({
        reservationId: lockedJob.reservationId,
        finalCost: lockedJob.cost,
        provider: 'replicate',
        model: lockedJob.model,
        metadata: {
          providerCostEur: lockedJob.estimatedProviderCostEur,
          providerCostUsd: lockedJob.estimatedProviderCostUsd,
          fxRate: lockedJob.fxRate,
        },
      });

      if (settlement?.creditsRemaining !== undefined) {
        creditsRemaining = settlement.creditsRemaining;
      }
    }

    const updated = await resolvedDependencies.updateJobReceipt(input.predictionId, {
      assets,
      settledAt: new Date().toISOString(),
      creditsRemaining,
      processingId: null,
      processingAt: null,
      processingBy: null,
    });

    return {
      status: input.prediction.status,
      assets: updated?.assets ?? assets,
      provider: 'replicate',
      creditsRemaining: updated?.creditsRemaining ?? creditsRemaining ?? null,
    };
  } catch (error) {
    const message = normalizeMarketingMediaProcessingError(error) || 'Output-Verarbeitung fehlgeschlagen';
    let refundedAt = lockedJob.refundedAt;

    if (lockedJob.reservationId && !lockedJob.refundedAt) {
      try {
        await resolvedDependencies.refundEnergy(lockedJob.reservationId, 'output-processing-failed');
        refundedAt = new Date().toISOString();
      } catch (refundError) {
        console.error('Failed to refund energy after output processing error', refundError);
      }
    }

    await resolvedDependencies.updateJobReceipt(input.predictionId, {
      error: message,
      refundedAt,
      processingId: null,
      processingAt: null,
      processingBy: null,
    });

    return { status: 'failed', error: message };
  }
}
