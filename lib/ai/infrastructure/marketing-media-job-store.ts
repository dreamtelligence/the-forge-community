import { prisma } from '@/lib/database/prisma';
import { generateUUID } from '@/lib/utils/uuid';
import type { MarketingMediaJobReceipt } from '@/lib/ai/contracts/marketing-media';
import { isFreshMarketingMediaLock } from '@/lib/ai/domain/marketing-media';

const JOB_TTL_MS = 1000 * 60 * 60 * 6;

const jobKeyForPrediction = (predictionId: string) => `replicate:media:${predictionId}`;

export const findMarketingMediaJobReceipt = async (
  predictionId: string
): Promise<MarketingMediaJobReceipt | null> => {
  const record = await prisma.systemCache.findUnique({
    where: { key: jobKeyForPrediction(predictionId) },
  });

  if (!record) return null;

  try {
    return JSON.parse(record.value) as MarketingMediaJobReceipt;
  } catch (error) {
    console.error('Failed to parse marketing media job receipt', error);
    return null;
  }
};

export const saveMarketingMediaJobReceipt = async (
  predictionId: string,
  payload: MarketingMediaJobReceipt
) => {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  await prisma.systemCache.upsert({
    where: { key: jobKeyForPrediction(predictionId) },
    update: { value: JSON.stringify(payload), expiresAt },
    create: { key: jobKeyForPrediction(predictionId), value: JSON.stringify(payload), expiresAt },
  });
};

export const updateMarketingMediaJobReceipt = async (
  predictionId: string,
  updates: Partial<MarketingMediaJobReceipt>
) => {
  const existing = await findMarketingMediaJobReceipt(predictionId);
  if (!existing) return null;
  const next = { ...existing, ...updates } as MarketingMediaJobReceipt;
  await saveMarketingMediaJobReceipt(predictionId, next);
  return next;
};

export const acquireMarketingMediaJobLock = async (
  predictionId: string,
  holder: string
) => {
  const current = await findMarketingMediaJobReceipt(predictionId);
  if (!current) return null;
  if (isFreshMarketingMediaLock(current.processingId, current.processingAt)) return null;

  const lockId = generateUUID();
  await updateMarketingMediaJobReceipt(predictionId, {
    processingId: lockId,
    processingAt: new Date().toISOString(),
    processingBy: holder,
  });

  const confirmed = await findMarketingMediaJobReceipt(predictionId);
  if (!confirmed || confirmed.processingId !== lockId) return null;
  return confirmed;
};
