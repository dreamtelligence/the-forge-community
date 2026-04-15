import { completeLegacyReplicateJob } from '@/lib/ai/application/complete-legacy-replicate-job';
import { failLegacyReplicateJob } from '@/lib/ai/application/fail-legacy-replicate-job';
import type {
  LegacyReplicateJobReceipt,
  LegacyReplicateJobKind,
  LegacyReplicatePrediction,
  LegacyReplicateWebhookJobType,
} from '@/lib/ai/contracts/legacy-replicate-job';
import { toLegacyReplicateWebhookJobType } from '@/lib/ai/contracts/legacy-replicate-job';

type LegacyWebhookJobType = LegacyReplicateWebhookJobType | 'unknown';

type HandleLegacyReplicateWebhookJobInput = {
  predictionId: string;
  prediction: LegacyReplicatePrediction;
};

type HandleLegacyReplicateWebhookJobDependencies = {
  findFaceSwapJobReceipt: (predictionId: string) => Promise<LegacyReplicateJobReceipt | null>;
  findMotionTransferJobReceipt: (
    predictionId: string
  ) => Promise<LegacyReplicateJobReceipt | null>;
  completeLegacyReplicateJob: typeof completeLegacyReplicateJob;
  failLegacyReplicateJob: typeof failLegacyReplicateJob;
};

const loadDefaultDependencies = async (): Promise<HandleLegacyReplicateWebhookJobDependencies> => {
  const jobStore = await import('@/lib/ai/infrastructure/legacy-replicate-job-store');

  return {
    findFaceSwapJobReceipt: jobStore.findFaceSwapJobReceipt,
    findMotionTransferJobReceipt: jobStore.findMotionTransferJobReceipt,
    completeLegacyReplicateJob,
    failLegacyReplicateJob,
  };
};

const resolveLegacyJob = async (
  predictionId: string,
  dependencies: HandleLegacyReplicateWebhookJobDependencies
): Promise<{ jobKind: LegacyReplicateJobKind; receipt: LegacyReplicateJobReceipt } | null> => {
  const faceSwapReceipt = await dependencies.findFaceSwapJobReceipt(predictionId);
  if (faceSwapReceipt) {
    return { jobKind: 'faceswap', receipt: faceSwapReceipt };
  }

  const motionTransferReceipt = await dependencies.findMotionTransferJobReceipt(predictionId);
  if (motionTransferReceipt) {
    return { jobKind: 'motion-transfer', receipt: motionTransferReceipt };
  }

  return null;
};

export async function handleLegacyReplicateWebhookJob(
  input: HandleLegacyReplicateWebhookJobInput,
  dependencies?: HandleLegacyReplicateWebhookJobDependencies
): Promise<LegacyWebhookJobType> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const legacyJob = await resolveLegacyJob(input.predictionId, resolvedDependencies);

  if (!legacyJob) {
    return 'unknown';
  }

  if (input.prediction.status === 'succeeded') {
    await resolvedDependencies.completeLegacyReplicateJob({
      predictionId: input.predictionId,
      prediction: input.prediction,
      receipt: legacyJob.receipt,
      jobKind: legacyJob.jobKind,
      processor: 'webhook',
    });
  } else if (
    input.prediction.status === 'failed' ||
    input.prediction.status === 'canceled'
  ) {
    await resolvedDependencies.failLegacyReplicateJob({
      predictionId: input.predictionId,
      prediction: input.prediction,
      receipt: legacyJob.receipt,
      jobKind: legacyJob.jobKind,
    });
  }

  return toLegacyReplicateWebhookJobType(legacyJob.jobKind);
}
