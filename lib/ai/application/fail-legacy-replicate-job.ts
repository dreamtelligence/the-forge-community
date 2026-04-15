import type {
  LegacyReplicateJobKind,
  LegacyReplicateJobReceipt,
  LegacyReplicateJobStatusResult,
  LegacyReplicatePrediction,
} from '@/lib/ai/contracts/legacy-replicate-job';
import {
  getLegacyReplicateJobDefaultError,
  getLegacyReplicateJobFailureReason,
} from '@/lib/ai/contracts/legacy-replicate-job';

type FailLegacyReplicateJobInput = {
  predictionId: string;
  prediction: LegacyReplicatePrediction;
  receipt: LegacyReplicateJobReceipt;
  jobKind: LegacyReplicateJobKind;
};

type FailLegacyReplicateJobDependencies = {
  updateJobReceipt: (
    jobKind: LegacyReplicateJobKind,
    predictionId: string,
    updates: Partial<LegacyReplicateJobReceipt>
  ) => Promise<LegacyReplicateJobReceipt | null>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
};

const loadDefaultDependencies = async (): Promise<FailLegacyReplicateJobDependencies> => {
  const [jobStore, energy] = await Promise.all([
    import('@/lib/ai/infrastructure/legacy-replicate-job-store'),
    import('@/lib/finance/energy'),
  ]);

  return {
    updateJobReceipt: jobStore.updateLegacyReplicateJobReceipt,
    refundEnergy: energy.refundEnergy,
  };
};

export async function failLegacyReplicateJob(
  input: FailLegacyReplicateJobInput,
  dependencies?: FailLegacyReplicateJobDependencies
): Promise<LegacyReplicateJobStatusResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const error =
    typeof input.prediction.error === 'string' && input.prediction.error.trim()
      ? input.prediction.error
      : input.receipt.error || getLegacyReplicateJobDefaultError(input.jobKind);

  let refundedAt = input.receipt.refundedAt ?? null;
  if (!input.receipt.refundedAt && input.receipt.reservationId) {
    await resolvedDependencies.refundEnergy(
      input.receipt.reservationId,
      getLegacyReplicateJobFailureReason(input.jobKind)
    );
    refundedAt = new Date().toISOString();
  }

  await resolvedDependencies.updateJobReceipt(input.jobKind, input.predictionId, {
    refundedAt,
    error,
    processingId: null,
    processingAt: null,
    processingBy: null,
  });

  return {
    status: input.prediction.status,
    error,
  };
}
