import type { MarketingMediaPrediction } from '@/lib/ai/contracts/marketing-media';

type LegacyReplicateJobReceipt = {
  ventureId: string;
  userId: string;
  model: string;
  cost: number;
  reservationId?: string | null;
  outputUrl?: string | null;
  refundedAt?: string | null;
  settledAt?: string | null;
  error?: string | null;
  processingId?: string | null;
  processingAt?: string | null;
  processingBy?: string | null;
};

type LegacyWebhookJobType = 'legacy-faceswap' | 'legacy-motion-transfer' | 'unknown';

type HandleLegacyReplicateWebhookJobInput = {
  predictionId: string;
  prediction: MarketingMediaPrediction;
};

type HandleLegacyReplicateWebhookJobDependencies = {
  findFaceSwapJobReceipt: (predictionId: string) => Promise<LegacyReplicateJobReceipt | null>;
  findMotionTransferJobReceipt: (predictionId: string) => Promise<LegacyReplicateJobReceipt | null>;
  acquireFaceSwapJobLock: (predictionId: string, holder: string) => Promise<LegacyReplicateJobReceipt | null>;
  updateFaceSwapJobReceipt: (
    predictionId: string,
    updates: Partial<LegacyReplicateJobReceipt>
  ) => Promise<LegacyReplicateJobReceipt | null>;
  updateMotionTransferJobReceipt: (
    predictionId: string,
    updates: Partial<LegacyReplicateJobReceipt>
  ) => Promise<LegacyReplicateJobReceipt | null>;
  extractOutputUrls: (output: unknown) => Promise<string[]>;
  persistVideoOutput: (input: {
    storagePrefix: 'faceswap' | 'motion-transfer';
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

const loadDefaultDependencies = async (): Promise<HandleLegacyReplicateWebhookJobDependencies> => {
  const [jobStore, storage, energy, replicate] = await Promise.all([
    import('@/lib/ai/infrastructure/legacy-replicate-job-store'),
    import('@/lib/ai/infrastructure/legacy-replicate-video-storage'),
    import('@/lib/finance/energy'),
    import('@/lib/ai/infrastructure/marketing-media-replicate'),
  ]);

  return {
    findFaceSwapJobReceipt: jobStore.findFaceSwapJobReceipt,
    findMotionTransferJobReceipt: jobStore.findMotionTransferJobReceipt,
    acquireFaceSwapJobLock: jobStore.acquireFaceSwapJobLock,
    updateFaceSwapJobReceipt: jobStore.updateFaceSwapJobReceipt,
    updateMotionTransferJobReceipt: jobStore.updateMotionTransferJobReceipt,
    extractOutputUrls: replicate.extractMarketingMediaOutputUrls,
    persistVideoOutput: storage.persistLegacyReplicateVideoOutput,
    settleEnergy: energy.settleEnergy,
    refundEnergy: energy.refundEnergy,
  };
};

const processSucceededLegacyJob = async (params: {
  predictionId: string;
  jobType: Exclude<LegacyWebhookJobType, 'unknown'>;
  job: LegacyReplicateJobReceipt;
  prediction: MarketingMediaPrediction;
  dependencies: HandleLegacyReplicateWebhookJobDependencies;
}) => {
  if (params.job.outputUrl) return;

  const outputUrls = await params.dependencies.extractOutputUrls(params.prediction.output);
  if (!outputUrls.length) {
    throw new Error('No output URLs from prediction');
  }

  const outputUrl = outputUrls[0];
  const persisted = await params.dependencies.persistVideoOutput({
    storagePrefix: params.jobType === 'legacy-faceswap' ? 'faceswap' : 'motion-transfer',
    predictionOutputUrl: outputUrl,
    ventureId: params.job.ventureId,
    userId: params.job.userId,
    model: params.job.model,
    tags:
      params.jobType === 'legacy-faceswap'
        ? ['faceswap', 'replicate']
        : ['motion-transfer', 'wan-animate', 'replicate'],
  });

  if (params.job.reservationId) {
    await params.dependencies.settleEnergy({
      reservationId: params.job.reservationId,
      finalCost: params.job.cost,
      provider: 'replicate',
      model: params.job.model,
      metadata: { assetId: persisted.assetId },
    });
  }

  if (params.jobType === 'legacy-faceswap') {
    await params.dependencies.updateFaceSwapJobReceipt(params.predictionId, {
      outputUrl: persisted.url,
      settledAt: new Date().toISOString(),
      processingId: null,
      processingAt: null,
      processingBy: null,
    });
    return;
  }

  await params.dependencies.updateMotionTransferJobReceipt(params.predictionId, {
    outputUrl: persisted.url,
    settledAt: new Date().toISOString(),
  });
};

const processFailedLegacyJob = async (params: {
  predictionId: string;
  jobType: Exclude<LegacyWebhookJobType, 'unknown'>;
  job: LegacyReplicateJobReceipt;
  prediction: MarketingMediaPrediction;
  dependencies: HandleLegacyReplicateWebhookJobDependencies;
}) => {
  if (params.job.refundedAt || !params.job.reservationId) return;

  await params.dependencies.refundEnergy(
    params.job.reservationId,
    params.jobType === 'legacy-faceswap' ? 'faceswap-failed' : 'motion-transfer-failed'
  );

  const update = {
    refundedAt: new Date().toISOString(),
    error:
      params.jobType === 'legacy-faceswap'
        ? String(params.prediction.error || 'Avatar fehlgeschlagen')
        : String(params.prediction.error || 'Motion Transfer fehlgeschlagen'),
  };

  if (params.jobType === 'legacy-faceswap') {
    await params.dependencies.updateFaceSwapJobReceipt(params.predictionId, update);
    return;
  }

  await params.dependencies.updateMotionTransferJobReceipt(params.predictionId, update);
};

export async function handleLegacyReplicateWebhookJob(
  input: HandleLegacyReplicateWebhookJobInput,
  dependencies?: HandleLegacyReplicateWebhookJobDependencies
): Promise<LegacyWebhookJobType> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());

  let job = await resolvedDependencies.findFaceSwapJobReceipt(input.predictionId);
  if (job) {
    if (input.prediction.status === 'succeeded') {
      if (job.outputUrl) return 'legacy-faceswap';
      const lockedJob = await resolvedDependencies.acquireFaceSwapJobLock(input.predictionId, 'webhook');
      if (!lockedJob || lockedJob.outputUrl) return 'legacy-faceswap';
      job = lockedJob;
      try {
        await processSucceededLegacyJob({
          predictionId: input.predictionId,
          jobType: 'legacy-faceswap',
          job,
          prediction: input.prediction,
          dependencies: resolvedDependencies,
        });
      } catch (error) {
        let refundedAt = job.refundedAt;
        if (job.reservationId && !job.refundedAt) {
          try {
            await resolvedDependencies.refundEnergy(job.reservationId, 'output-processing-failed');
            refundedAt = new Date().toISOString();
          } catch (refundError) {
            console.error('Failed to refund faceswap energy after output processing error', refundError);
          }
        }
        await resolvedDependencies.updateFaceSwapJobReceipt(input.predictionId, {
          error: error instanceof Error ? error.message : 'Output-Verarbeitung fehlgeschlagen',
          refundedAt,
          processingId: null,
          processingAt: null,
          processingBy: null,
        });
      }
      return 'legacy-faceswap';
    }

    if (input.prediction.status === 'failed' || input.prediction.status === 'canceled') {
      await processFailedLegacyJob({
        predictionId: input.predictionId,
        jobType: 'legacy-faceswap',
        job,
        prediction: input.prediction,
        dependencies: resolvedDependencies,
      });
      return 'legacy-faceswap';
    }

    return 'legacy-faceswap';
  }

  job = await resolvedDependencies.findMotionTransferJobReceipt(input.predictionId);
  if (!job) {
    return 'unknown';
  }

  if (input.prediction.status === 'succeeded') {
    if (job.outputUrl) return 'legacy-motion-transfer';
    try {
      await processSucceededLegacyJob({
        predictionId: input.predictionId,
        jobType: 'legacy-motion-transfer',
        job,
        prediction: input.prediction,
        dependencies: resolvedDependencies,
      });
    } catch (error) {
      let refundedAt = job.refundedAt;
      if (job.reservationId && !job.refundedAt) {
        try {
          await resolvedDependencies.refundEnergy(job.reservationId, 'output-processing-failed');
          refundedAt = new Date().toISOString();
        } catch (refundError) {
          console.error('Failed to refund motion transfer energy after output processing error', refundError);
        }
      }
      await resolvedDependencies.updateMotionTransferJobReceipt(input.predictionId, {
        error:
          error instanceof Error ? error.message : 'Motion Transfer Output-Verarbeitung fehlgeschlagen',
        refundedAt,
      });
    }
    return 'legacy-motion-transfer';
  }

  if (input.prediction.status === 'failed' || input.prediction.status === 'canceled') {
    await processFailedLegacyJob({
      predictionId: input.predictionId,
      jobType: 'legacy-motion-transfer',
      job,
      prediction: input.prediction,
      dependencies: resolvedDependencies,
    });
    return 'legacy-motion-transfer';
  }

  return 'legacy-motion-transfer';
}
