import { prisma } from '@/lib/database/prisma';
import type {
  LegacyReplicateJobKind,
  LegacyReplicateJobReceipt,
} from '@/lib/ai/contracts/legacy-replicate-job';
import { generateUUID } from '@/lib/utils/uuid';

const JOB_TTL_MS = 1000 * 60 * 60 * 6;
const PROCESSING_LOCK_TTL_MS = 1000 * 60 * 10;

const faceSwapJobKeyForPrediction = (predictionId: string) => `faceswap:${predictionId}`;
const motionTransferJobKeyForPrediction = (predictionId: string) => `motion-transfer:${predictionId}`;
const keyForLegacyJob = (jobKind: LegacyReplicateJobKind, predictionId: string) =>
  jobKind === 'faceswap'
    ? faceSwapJobKeyForPrediction(predictionId)
    : motionTransferJobKeyForPrediction(predictionId);

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

export const findLegacyReplicateJobReceipt = (
  jobKind: LegacyReplicateJobKind,
  predictionId: string
) => readLegacyJob(keyForLegacyJob(jobKind, predictionId));

export const writeLegacyReplicateJobReceipt = (
  jobKind: LegacyReplicateJobKind,
  predictionId: string,
  payload: LegacyReplicateJobReceipt
) => writeLegacyJob(keyForLegacyJob(jobKind, predictionId), payload);

export const updateLegacyReplicateJobReceipt = (
  jobKind: LegacyReplicateJobKind,
  predictionId: string,
  updates: Partial<LegacyReplicateJobReceipt>
) => updateLegacyJob(keyForLegacyJob(jobKind, predictionId), updates);

export const acquireLegacyReplicateJobLock = (
  jobKind: LegacyReplicateJobKind,
  predictionId: string,
  holder: string
) => acquireLegacyProcessingLock(keyForLegacyJob(jobKind, predictionId), holder);

export const findFaceSwapJobReceipt = (predictionId: string) =>
  findLegacyReplicateJobReceipt('faceswap', predictionId);

export const writeFaceSwapJobReceipt = (predictionId: string, payload: LegacyReplicateJobReceipt) =>
  writeLegacyReplicateJobReceipt('faceswap', predictionId, payload);

export const updateFaceSwapJobReceipt = (
  predictionId: string,
  updates: Partial<LegacyReplicateJobReceipt>
) => updateLegacyReplicateJobReceipt('faceswap', predictionId, updates);

export const acquireFaceSwapJobLock = (predictionId: string, holder: string) =>
  acquireLegacyReplicateJobLock('faceswap', predictionId, holder);

export const findMotionTransferJobReceipt = (predictionId: string) =>
  findLegacyReplicateJobReceipt('motion-transfer', predictionId);

export const writeMotionTransferJobReceipt = (
  predictionId: string,
  payload: LegacyReplicateJobReceipt
) => writeLegacyReplicateJobReceipt('motion-transfer', predictionId, payload);

export const updateMotionTransferJobReceipt = (
  predictionId: string,
  updates: Partial<LegacyReplicateJobReceipt>
) => updateLegacyReplicateJobReceipt('motion-transfer', predictionId, updates);

export const acquireMotionTransferJobLock = (predictionId: string, holder: string) =>
  acquireLegacyReplicateJobLock('motion-transfer', predictionId, holder);

export type { LegacyReplicateJobReceipt };
