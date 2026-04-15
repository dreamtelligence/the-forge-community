import type {
  LegacyReplicateJobKind,
  LegacyReplicateJobReceipt,
  LegacyReplicateJobStatusResult,
} from '@/lib/ai/contracts/legacy-replicate-job';
import { LegacyReplicateNotFoundError } from '@/lib/ai/contracts/legacy-replicate-job';
import { completeLegacyReplicateJob } from '@/lib/ai/application/complete-legacy-replicate-job';
import { failLegacyReplicateJob } from '@/lib/ai/application/fail-legacy-replicate-job';

type GetLegacyReplicateJobStatusInput = {
  userEmail: string;
  ventureId: string;
  predictionId: string;
  jobKind: LegacyReplicateJobKind;
};

type GetLegacyReplicateJobStatusDependencies = {
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  findJobReceipt: (
    jobKind: LegacyReplicateJobKind,
    predictionId: string
  ) => Promise<LegacyReplicateJobReceipt | null>;
  getPrediction: (
    userId: string,
    predictionId: string
  ) => Promise<import('@/lib/ai/contracts/legacy-replicate-job').LegacyReplicatePrediction>;
  completeLegacyReplicateJob: typeof completeLegacyReplicateJob;
  failLegacyReplicateJob: typeof failLegacyReplicateJob;
};

const loadDefaultDependencies = async (): Promise<GetLegacyReplicateJobStatusDependencies> => {
  const [repository, jobStore, replicate] = await Promise.all([
    import('@/lib/ai/infrastructure/marketing-media-repository'),
    import('@/lib/ai/infrastructure/legacy-replicate-job-store'),
    import('@/lib/ai/infrastructure/marketing-media-replicate'),
  ]);

  return {
    findUserByEmail: repository.findMarketingMediaUserByEmail,
    findJobReceipt: jobStore.findLegacyReplicateJobReceipt,
    getPrediction: replicate.getReplicatePrediction,
    completeLegacyReplicateJob,
    failLegacyReplicateJob,
  };
};

export async function getLegacyReplicateJobStatus(
  input: GetLegacyReplicateJobStatusInput,
  dependencies?: GetLegacyReplicateJobStatusDependencies
): Promise<LegacyReplicateJobStatusResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const user = await resolvedDependencies.findUserByEmail(input.userEmail);
  if (!user) {
    throw new LegacyReplicateNotFoundError('Benutzer nicht gefunden');
  }

  const receipt = await resolvedDependencies.findJobReceipt(input.jobKind, input.predictionId);
  if (!receipt || receipt.userId !== user.id || receipt.ventureId !== input.ventureId) {
    throw new LegacyReplicateNotFoundError('Prediction nicht gefunden.');
  }

  if (receipt.error && !receipt.outputUrl) {
    return { status: 'failed', error: receipt.error };
  }

  const prediction = await resolvedDependencies.getPrediction(user.id, input.predictionId);

  if (prediction.status === 'succeeded') {
    return resolvedDependencies.completeLegacyReplicateJob({
      predictionId: input.predictionId,
      prediction,
      receipt,
      jobKind: input.jobKind,
      processor: 'poll',
    });
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    return resolvedDependencies.failLegacyReplicateJob({
      predictionId: input.predictionId,
      prediction,
      receipt,
      jobKind: input.jobKind,
    });
  }

  return { status: prediction.status };
}
