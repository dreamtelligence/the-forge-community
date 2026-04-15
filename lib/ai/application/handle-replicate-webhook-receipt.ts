import type {
  ReplicateWebhookOutcome,
  VerifiedReplicateWebhook,
} from '@/lib/ai/contracts/replicate-webhook';
import { ReplicateWebhookProcessingError } from '@/lib/ai/contracts/replicate-webhook';
import { completeReplicateJob } from '@/lib/ai/application/complete-replicate-job';
import { failReplicateJob } from '@/lib/ai/application/fail-replicate-job';
import { handleLegacyReplicateWebhookJob } from '@/lib/ai/application/handle-legacy-replicate-webhook-job';

type HandleReplicateWebhookReceiptDependencies = {
  acquireDeliveryReceipt: (
    provider: string,
    deliveryId: string
  ) => Promise<import('@/lib/ai/contracts/replicate-webhook').WebhookReceiptAcquireResult>;
  markDeliveryProcessed: (provider: string, deliveryId: string) => Promise<void>;
  releaseDeliveryReceipt: (provider: string, deliveryId: string) => Promise<void>;
  findMarketingMediaJobReceipt: (
    predictionId: string
  ) => Promise<import('@/lib/ai/contracts/marketing-media').MarketingMediaJobReceipt | null>;
  completeReplicateJob: typeof completeReplicateJob;
  failReplicateJob: typeof failReplicateJob;
  handleLegacyReplicateWebhookJob: typeof handleLegacyReplicateWebhookJob;
};

const PROVIDER = 'replicate';

const loadDefaultDependencies = async (): Promise<HandleReplicateWebhookReceiptDependencies> => {
  const [receiptStore, marketingJobStore] = await Promise.all([
    import('@/lib/integrations/infrastructure/webhook-receipt-store'),
    import('@/lib/ai/infrastructure/marketing-media-job-store'),
  ]);

  return {
    acquireDeliveryReceipt: receiptStore.acquireWebhookDeliveryReceipt,
    markDeliveryProcessed: receiptStore.markWebhookDeliveryProcessed,
    releaseDeliveryReceipt: receiptStore.releaseWebhookDeliveryReceipt,
    findMarketingMediaJobReceipt: marketingJobStore.findMarketingMediaJobReceipt,
    completeReplicateJob,
    failReplicateJob,
    handleLegacyReplicateWebhookJob,
  };
};

export async function handleReplicateWebhookReceipt(
  webhook: VerifiedReplicateWebhook,
  dependencies?: HandleReplicateWebhookReceiptDependencies
): Promise<ReplicateWebhookOutcome> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const receipt = await resolvedDependencies.acquireDeliveryReceipt(PROVIDER, webhook.deliveryId);

  if (receipt.kind === 'duplicate_processed') {
    return { kind: 'duplicate_processed', deliveryId: webhook.deliveryId };
  }

  if (receipt.kind === 'duplicate_in_progress') {
    return { kind: 'duplicate_in_progress', deliveryId: webhook.deliveryId };
  }

  try {
    const marketingMediaReceipt = await resolvedDependencies.findMarketingMediaJobReceipt(
      webhook.prediction.id
    );

    if (marketingMediaReceipt) {
      if (webhook.prediction.status === 'succeeded') {
        await resolvedDependencies.completeReplicateJob({
          predictionId: webhook.prediction.id,
          prediction: webhook.prediction,
          receipt: marketingMediaReceipt,
          ventureId: marketingMediaReceipt.ventureId,
          userId: marketingMediaReceipt.userId,
          processor: 'webhook',
        });
      } else if (
        webhook.prediction.status === 'failed' ||
        webhook.prediction.status === 'canceled'
      ) {
        await resolvedDependencies.failReplicateJob({
          predictionId: webhook.prediction.id,
          prediction: webhook.prediction,
          receipt: marketingMediaReceipt,
        });
      }

      await resolvedDependencies.markDeliveryProcessed(PROVIDER, webhook.deliveryId);
      return {
        kind: 'processed',
        deliveryId: webhook.deliveryId,
        predictionId: webhook.prediction.id,
        jobType: 'marketing-media',
      };
    }

    const legacyJobType = await resolvedDependencies.handleLegacyReplicateWebhookJob({
      predictionId: webhook.prediction.id,
      prediction: webhook.prediction,
    });

    if (legacyJobType === 'unknown') {
      throw new ReplicateWebhookProcessingError('Replicate job receipt not found', {
        predictionId: webhook.prediction.id,
      });
    }

    await resolvedDependencies.markDeliveryProcessed(PROVIDER, webhook.deliveryId);

    return {
      kind: 'processed',
      deliveryId: webhook.deliveryId,
      predictionId: webhook.prediction.id,
      jobType: legacyJobType,
    };
  } catch (error) {
    await resolvedDependencies.releaseDeliveryReceipt(PROVIDER, webhook.deliveryId);
    throw error;
  }
}
