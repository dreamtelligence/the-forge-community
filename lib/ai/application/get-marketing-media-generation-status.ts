import {
  type MarketingMediaStatusResult,
  MarketingMediaNotFoundError,
} from '@/lib/ai/contracts/marketing-media';
import { completeReplicateJob } from '@/lib/ai/application/complete-replicate-job';
import { failReplicateJob } from '@/lib/ai/application/fail-replicate-job';

type GetMarketingMediaGenerationStatusInput = {
  userEmail: string;
  ventureId: string;
  predictionId: string;
};

type GetMarketingMediaGenerationStatusDependencies = {
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  findJobReceipt: (
    predictionId: string
  ) => Promise<import('@/lib/ai/contracts/marketing-media').MarketingMediaJobReceipt | null>;
  getPrediction: (
    userId: string,
    predictionId: string
  ) => Promise<import('@/lib/ai/contracts/marketing-media').MarketingMediaPrediction>;
  completeReplicateJob: typeof completeReplicateJob;
  failReplicateJob: typeof failReplicateJob;
};

const loadDefaultDependencies = async (): Promise<GetMarketingMediaGenerationStatusDependencies> => {
  const [repository, jobStore, replicate] = await Promise.all([
    import('@/lib/ai/infrastructure/marketing-media-repository'),
    import('@/lib/ai/infrastructure/marketing-media-job-store'),
    import('@/lib/ai/infrastructure/marketing-media-replicate'),
  ]);

  return {
    findUserByEmail: repository.findMarketingMediaUserByEmail,
    findJobReceipt: jobStore.findMarketingMediaJobReceipt,
    getPrediction: replicate.getMarketingMediaPrediction,
    completeReplicateJob,
    failReplicateJob,
  };
};

export async function getMarketingMediaGenerationStatus(
  input: GetMarketingMediaGenerationStatusInput,
  dependencies?: GetMarketingMediaGenerationStatusDependencies
): Promise<MarketingMediaStatusResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const user = await resolvedDependencies.findUserByEmail(input.userEmail);
  if (!user) {
    throw new MarketingMediaNotFoundError('Benutzer nicht gefunden');
  }

  const receipt = await resolvedDependencies.findJobReceipt(input.predictionId);
  if (!receipt || receipt.userId !== user.id || receipt.ventureId !== input.ventureId) {
    throw new MarketingMediaNotFoundError('Prediction nicht gefunden.');
  }

  if (receipt.error && !receipt.assets) {
    return { status: 'failed', error: receipt.error };
  }

  const prediction = await resolvedDependencies.getPrediction(user.id, input.predictionId);

  if (prediction.status === 'succeeded') {
    return resolvedDependencies.completeReplicateJob({
      predictionId: input.predictionId,
      prediction,
      receipt,
      ventureId: input.ventureId,
      userId: user.id,
      processor: 'poll',
    });
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    return resolvedDependencies.failReplicateJob({
      predictionId: input.predictionId,
      prediction,
      receipt,
    });
  }

  return { status: prediction.status };
}
