import type {
  MarketingMediaJobReceipt,
  MarketingMediaPrediction,
  MarketingMediaStatusResult,
} from '@/lib/ai/contracts/marketing-media';
import { normalizeMarketingMediaPredictionError } from '@/lib/ai/domain/marketing-media';

type FailReplicateJobInput = {
  predictionId: string;
  prediction: MarketingMediaPrediction;
  receipt: MarketingMediaJobReceipt;
};

type FailReplicateJobDependencies = {
  updateJobReceipt: (
    predictionId: string,
    updates: Partial<MarketingMediaJobReceipt>
  ) => Promise<MarketingMediaJobReceipt | null>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
};

const loadDefaultDependencies = async (): Promise<FailReplicateJobDependencies> => {
  const [jobStore, energy] = await Promise.all([
    import('@/lib/ai/infrastructure/marketing-media-job-store'),
    import('@/lib/finance/energy'),
  ]);

  return {
    updateJobReceipt: jobStore.updateMarketingMediaJobReceipt,
    refundEnergy: energy.refundEnergy,
  };
};

export async function failReplicateJob(
  input: FailReplicateJobInput,
  dependencies?: FailReplicateJobDependencies
): Promise<MarketingMediaStatusResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const normalizedError = normalizeMarketingMediaPredictionError(input.prediction.error);

  if (!input.receipt.refundedAt && input.receipt.reservationId) {
    await resolvedDependencies.refundEnergy(input.receipt.reservationId, 'generation-failed');
    await resolvedDependencies.updateJobReceipt(input.predictionId, {
      refundedAt: new Date().toISOString(),
      error: normalizedError || 'Generation failed',
      processingId: null,
      processingAt: null,
      processingBy: null,
    });
  }

  return {
    status: input.prediction.status,
    error: normalizedError || input.receipt.error || 'Generation failed',
  };
}
