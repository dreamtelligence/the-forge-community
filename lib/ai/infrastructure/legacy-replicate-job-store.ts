import { prisma } from '@/lib/database/prisma';
import { generateUUID } from '@/lib/utils/uuid';

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

const JOB_TTL_MS = 1000 * 60 * 60 * 6;
const PROCESSING_LOCK_TTL_MS = 1000 * 60 * 10;

const faceSwapJobKeyForPrediction = (predictionId: string) => `faceswap:${predictionId}`;
const motionTransferJobKeyForPrediction = (predictionId: string) => `motion-transfer:${predictionId}`;

const readLegacyJob = async (key: string): Promise<LegacyReplicateJobReceipt | null> => {
  const record = await prisma.systemCache.findUnique({ where: { key } });
  if (!record) return null;
  try {
    return JSON.parse(record.value) as LegacyReplicateJobReceipt;
  } catch {
    return null;
  }
};

const writeLegacyJob = async (key: string, payload: LegacyReplicateJobReceipt) => {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  await prisma.systemCache.upsert({
    where: { key },
    update: { value: JSON.stringify(payload), expiresAt },
    create: { key, value: JSON.stringify(payload), expiresAt },
  });
};

const updateLegacyJob = async (key: string, updates: Partial<LegacyReplicateJobReceipt>) => {
  const existing = await readLegacyJob(key);
  if (!existing) return null;
  const next = { ...existing, ...updates };
  await writeLegacyJob(key, next);
  return next;
};

const isFreshLock = (lockId?: string | null, lockAt?: string | null) => {
  if (!lockId || !lockAt) return false;
  const lockTime = Date.parse(lockAt);
  if (Number.isNaN(lockTime)) return false;
  return Date.now() - lockTime < PROCESSING_LOCK_TTL_MS;
};

const acquireLegacyProcessingLock = async (key: string, holder: string) => {
  const current = await readLegacyJob(key);
  if (!current) return null;
  if (isFreshLock(current.processingId, current.processingAt)) return null;

  const lockId = generateUUID();
  await updateLegacyJob(key, {
    processingId: lockId,
    processingAt: new Date().toISOString(),
    processingBy: holder,
  });

  const confirmed = await readLegacyJob(key);
  if (!confirmed || confirmed.processingId !== lockId) return null;
  return confirmed;
};

export const findFaceSwapJobReceipt = (predictionId: string) =>
  readLegacyJob(faceSwapJobKeyForPrediction(predictionId));

export const updateFaceSwapJobReceipt = (
  predictionId: string,
  updates: Partial<LegacyReplicateJobReceipt>
) => updateLegacyJob(faceSwapJobKeyForPrediction(predictionId), updates);

export const acquireFaceSwapJobLock = (predictionId: string, holder: string) =>
  acquireLegacyProcessingLock(faceSwapJobKeyForPrediction(predictionId), holder);

export const findMotionTransferJobReceipt = (predictionId: string) =>
  readLegacyJob(motionTransferJobKeyForPrediction(predictionId));

export const updateMotionTransferJobReceipt = (
  predictionId: string,
  updates: Partial<LegacyReplicateJobReceipt>
) => updateLegacyJob(motionTransferJobKeyForPrediction(predictionId), updates);

export type { LegacyReplicateJobReceipt };
