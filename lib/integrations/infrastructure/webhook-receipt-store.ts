import { prisma } from '@/lib/database/prisma';
import type { WebhookReceiptAcquireResult } from '@/lib/ai/contracts/replicate-webhook';

const namespacedWebhookEventId = (provider: string, deliveryId: string) => `${provider}:${deliveryId}`;

export const acquireWebhookDeliveryReceipt = async (
  provider: string,
  deliveryId: string
): Promise<WebhookReceiptAcquireResult> => {
  const receiptId = namespacedWebhookEventId(provider, deliveryId);

  try {
    await prisma.webhookEvent.create({
      data: {
        eventId: receiptId,
        processedAt: null,
      },
    });

    return { kind: 'acquired', receiptId };
  } catch (error: unknown) {
    if (!error || typeof error !== 'object' || (error as { code?: string }).code !== 'P2002') {
      throw error;
    }

    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: receiptId },
      select: { processedAt: true },
    });

    if (existing?.processedAt) {
      return { kind: 'duplicate_processed', receiptId };
    }

    return { kind: 'duplicate_in_progress', receiptId };
  }
};

export const markWebhookDeliveryProcessed = async (provider: string, deliveryId: string) => {
  await prisma.webhookEvent.update({
    where: { eventId: namespacedWebhookEventId(provider, deliveryId) },
    data: { processedAt: new Date() },
  });
};

export const releaseWebhookDeliveryReceipt = async (provider: string, deliveryId: string) => {
  await prisma.webhookEvent.delete({
    where: { eventId: namespacedWebhookEventId(provider, deliveryId) },
  });
};
