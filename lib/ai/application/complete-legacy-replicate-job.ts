import type {
  LegacyReplicateJobKind,
  LegacyReplicateJobReceipt,
  LegacyReplicateJobStatusResult,
  LegacyReplicatePrediction,
} from '@/lib/ai/contracts/legacy-replicate-job';
import {
  getLegacyReplicateJobProcessingError,
  getLegacyReplicateJobTags,
} from '@/lib/ai/contracts/legacy-replicate-job';

type CompleteLegacyReplicateJobInput = {
  predictionId: string;
  prediction: LegacyReplicatePrediction;
  receipt: LegacyReplicateJobReceipt;
  jobKind: LegacyReplicateJobKind;
  processor?: string;
};

type CompleteLegacyReplicateJobDependencies = {
  acquireJobLock: (
    jobKind: LegacyReplicateJobKind,
    predictionId: string,
    holder: string
  ) => Promise<LegacyReplicateJobReceipt | null>;
  updateJobReceipt: (
    jobKind: LegacyReplicateJobKind,
    predictionId: string,
    updates: Partial<LegacyReplicateJobReceipt>
  ) => Promise<LegacyReplicateJobReceipt | null>;
  extractOutputUrls: (output: unknown) => Promise<string[]>;
  persistVideoOutput: (input: {
    storagePrefix: LegacyReplicateJobKind;
    predictionOutputUrl: string;
    ventureId: string;
    userId: string;
    model: string;
    tags: string[];
  }) => Promise<{ assetId: string; url: string }>;
  settleEnergy: (input: {
    reservationId: string;
    finalCost: number;
    provider: string;
    model: string;
    metadata: Record<string, unknown>;
  }) => Promise<unknown>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
};

const loadDefaultDependencies = async (): Promise<CompleteLegacyReplicateJobDependencies> => {
  const [jobStore, storage, energy, replicate] = await Promise.all([
    import('@/lib/ai/infrastructure/legacy-replicate-job-store'),
    import('@/lib/ai/infrastructure/legacy-replicate-video-storage'),
    import('@/lib/finance/energy'),
    import('@/lib/ai/infrastructure/marketing-media-replicate'),
  ]);

  return {
    acquireJobLock: jobStore.acquireLegacyReplicateJobLock,
    updateJobReceipt: jobStore.updateLegacyReplicateJobReceipt,
    extractOutputUrls: replicate.extractReplicateOutputUrls,
    persistVideoOutput: storage.persistLegacyReplicateVideoOutput,
    settleEnergy: energy.settleEnergy,
    refundEnergy: energy.refundEnergy,
  };
};

export async function completeLegacyReplicateJob(
  input: CompleteLegacyReplicateJobInput,
  dependencies?: CompleteLegacyReplicateJobDependencies
): Promise<LegacyReplicateJobStatusResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());

  if (input.receipt.outputUrl) {
    return {
      status: input.prediction.status,
      outputUrl: input.receipt.outputUrl,
      provider: 'replicate',
    };
  }

  const lockedJob = await resolvedDependencies.acquireJobLock(
    input.jobKind,
    input.predictionId,
    input.processor || 'poll'
  );

  if (!lockedJob) {
    return {
      status: 'processing',
      outputUrl: input.receipt.outputUrl ?? null,
      provider: 'replicate',
    };
  }

  if (lockedJob.outputUrl) {
    return {
      status: input.prediction.status,
      outputUrl: lockedJob.outputUrl,
      provider: 'replicate',
    };
  }

  try {
    const outputUrls = await resolvedDependencies.extractOutputUrls(input.prediction.output);
    if (!outputUrls.length) {
      throw new Error('Kein Output von Replicate');
    }

    const persisted = await resolvedDependencies.persistVideoOutput({
      storagePrefix: input.jobKind,
      predictionOutputUrl: outputUrls[0],
      ventureId: lockedJob.ventureId,
      userId: lockedJob.userId,
      model: lockedJob.model,
      tags: getLegacyReplicateJobTags(input.jobKind),
    });

    if (lockedJob.reservationId) {
      await resolvedDependencies.settleEnergy({
        reservationId: lockedJob.reservationId,
        finalCost: lockedJob.cost,
        provider: 'replicate',
        model: lockedJob.model,
        metadata: { assetId: persisted.assetId },
      });
    }

    const updated = await resolvedDependencies.updateJobReceipt(input.jobKind, input.predictionId, {
      outputUrl: persisted.url,
      settledAt: new Date().toISOString(),
      processingId: null,
      processingAt: null,
      processingBy: null,
    });

    return {
      status: input.prediction.status,
      outputUrl: updated?.outputUrl ?? persisted.url,
      provider: 'replicate',
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : getLegacyReplicateJobProcessingError(input.jobKind);
    let refundedAt = lockedJob.refundedAt;

    if (lockedJob.reservationId && !lockedJob.refundedAt) {
      try {
        await resolvedDependencies.refundEnergy(lockedJob.reservationId, 'output-processing-failed');
        refundedAt = new Date().toISOString();
      } catch (refundError) {
        console.error('Failed to refund energy after legacy output processing error', refundError);
      }
    }

    await resolvedDependencies.updateJobReceipt(input.jobKind, input.predictionId, {
      error: message,
      refundedAt,
      processingId: null,
      processingAt: null,
      processingBy: null,
    });

    return { status: 'failed', error: message };
  }
}
