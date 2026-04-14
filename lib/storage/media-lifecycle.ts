/**
 * Media Asset Lifecycle Management
 *
 * Handles automatic cleanup of generated media assets to prevent unbounded storage growth.
 *
 * Features:
 * - Auto-delete assets after retention period
 * - Soft-delete (metadata preserved for audit)
 * - Favorite protection (user can exclude assets)
 * - Dry-run mode for testing
 *
 * @module lib/storage/media-lifecycle
 */

import { prisma } from '@/lib/database/prisma';
import { del } from '@vercel/blob';
import { resolvePlatformAccess } from '@/lib/security/platform-access';

/**
 * Cleanup configuration
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const LIFECYCLE_CONFIG = {
  // Retention by tier (days). <=0 means "keep indefinitely".
  RETENTION_DAYS_FREE: parseInt(
    process.env.MEDIA_RETENTION_DAYS_FREE || process.env.MEDIA_RETENTION_DAYS || '90',
    10
  ),
  RETENTION_DAYS_PRO: parseInt(process.env.MEDIA_RETENTION_DAYS_PRO || '365', 10),
  RETENTION_DAYS_ENTERPRISE: parseInt(process.env.MEDIA_RETENTION_DAYS_ENTERPRISE || '0', 10),

  // Feature flags
  ENABLE_CLEANUP: process.env.ENABLE_MEDIA_CLEANUP !== 'false',
  DRY_RUN: process.env.MEDIA_CLEANUP_DRY_RUN === 'true',

  // Batch size (process in chunks to avoid timeouts)
  BATCH_SIZE: parseInt(process.env.MEDIA_CLEANUP_BATCH_SIZE || '100', 10),
} as const;

/**
 * Cleanup result metrics
 */
export type CleanupResult = {
  success: boolean;
  assetsFound: number;
  assetsDeleted: number;
  bytesFreed: number;
  errors: string[];
  dryRun: boolean;
  duration: number; // milliseconds
};

/**
 * Media asset eligibility for cleanup
 */
type CleanupEligibility = {
  eligible: boolean;
  reason?: string;
};

type OwnerPlan = {
  founderNumber?: number | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  role?: string | null;
};

const isActivePaid = (plan: OwnerPlan) => resolvePlatformAccess(plan).hasPlatformAccess;

export function resolveRetentionDays(plan: OwnerPlan): number | null {
  const access = resolvePlatformAccess(plan);

  if (access.effectiveSubscriptionTier === 'enterprise') {
    return LIFECYCLE_CONFIG.RETENTION_DAYS_ENTERPRISE <= 0
      ? null
      : LIFECYCLE_CONFIG.RETENTION_DAYS_ENTERPRISE;
  }

  if (isActivePaid(plan)) {
    if (access.effectiveSubscriptionTier === 'pro') {
      return LIFECYCLE_CONFIG.RETENTION_DAYS_PRO <= 0
        ? null
        : LIFECYCLE_CONFIG.RETENTION_DAYS_PRO;
    }
  }

  return LIFECYCLE_CONFIG.RETENTION_DAYS_FREE;
}

/**
 * Check if media asset is eligible for cleanup
 *
 * Criteria:
 * - Must be generated (not uploaded by user)
 * - Must be older than retention period
 * - Must not be favorited
 * - Must not already be archived
 *
 * @param asset - MediaAsset record
 * @param retentionDate - Cutoff date (assets older than this are eligible)
 * @returns Eligibility status with reason
 */
export function isEligibleForCleanup(
  asset: {
    source: string;
    createdAt: Date;
    isFavorite: boolean;
    isArchived: boolean;
    owner?: OwnerPlan | null;
  },
  nowMs: number
): CleanupEligibility {
  const retentionDays = resolveRetentionDays(asset.owner ?? {});
  if (retentionDays === null) {
    return { eligible: false, reason: 'Retention: keep indefinitely' };
  }

  // Only clean up generated assets (not user uploads)
  if (asset.source !== 'GENERATED') {
    return { eligible: false, reason: 'Not generated' };
  }

  // Already archived - skip
  if (asset.isArchived) {
    return { eligible: false, reason: 'Already archived' };
  }

  // User favorited - protect from deletion
  if (asset.isFavorite) {
    return { eligible: false, reason: 'Favorited by user' };
  }

  // Not old enough yet
  const retentionCutoffMs = nowMs - retentionDays * MS_PER_DAY;
  if (asset.createdAt.getTime() > retentionCutoffMs) {
    return { eligible: false, reason: `Within retention (${retentionDays} days)` };
  }

  return { eligible: true };
}

/**
 * Clean up old generated media assets
 *
 * Process:
 * 1. Query eligible assets (generated, old, not favorited)
 * 2. Delete from Vercel Blob storage
 * 3. Soft-delete in database (set isArchived=true)
 * 4. Return metrics
 *
 * @param options - Cleanup options
 * @returns Cleanup result with metrics
 *
 * @example
 * // Dry run (log what would be deleted)
 * const result = await cleanupOldMediaAssets({ dryRun: true });
 * console.log(`Would delete ${result.assetsDeleted} assets`);
 *
 * // Production run
 * const result = await cleanupOldMediaAssets();
 * console.log(`Freed ${result.bytesFreed / 1024 / 1024} MB`);
 */
export async function cleanupOldMediaAssets(options?: {
  dryRun?: boolean;
  batchSize?: number;
  retentionDays?: number;
}): Promise<CleanupResult> {
  const startTime = Date.now();

  const dryRun = options?.dryRun ?? LIFECYCLE_CONFIG.DRY_RUN;
  const batchSize = options?.batchSize ?? LIFECYCLE_CONFIG.BATCH_SIZE;
  const retentionDays = options?.retentionDays ?? null;

  // Feature flag check
  if (!LIFECYCLE_CONFIG.ENABLE_CLEANUP && !dryRun) {
    return {
      success: false,
      assetsFound: 0,
      assetsDeleted: 0,
      bytesFreed: 0,
      errors: ['Cleanup disabled (ENABLE_MEDIA_CLEANUP=false)'],
      dryRun: false,
      duration: Date.now() - startTime
    };
  }

  const result: CleanupResult = {
    success: true,
    assetsFound: 0,
    assetsDeleted: 0,
    bytesFreed: 0,
    errors: [],
    dryRun,
    duration: 0
  };

  try {
    const retentionCandidates = [
      LIFECYCLE_CONFIG.RETENTION_DAYS_FREE,
      LIFECYCLE_CONFIG.RETENTION_DAYS_PRO,
      LIFECYCLE_CONFIG.RETENTION_DAYS_ENTERPRISE
    ].filter((days) => days > 0);

    const minRetentionDays =
      retentionDays ??
      (retentionCandidates.length ? Math.min(...retentionCandidates) : 0);

    if (minRetentionDays <= 0) {
      return {
        success: true,
        assetsFound: 0,
        assetsDeleted: 0,
        bytesFreed: 0,
        errors: [],
        dryRun,
        duration: Date.now() - startTime
      };
    }

    const minRetentionCutoff = new Date(Date.now() - minRetentionDays * MS_PER_DAY);

    console.log(
      `[Media Cleanup] Starting cleanup (dry-run: ${dryRun}, min retention: ${minRetentionDays} days, cutoff: ${minRetentionCutoff.toISOString()})`
    );

    // Query eligible assets
    const assets = await prisma.mediaAsset.findMany({
      where: {
        source: 'GENERATED',
        createdAt: { lt: minRetentionCutoff },
        isArchived: false,
        isFavorite: false
      },
      select: {
        id: true,
        url: true,
        size: true,
        type: true,
        createdAt: true,
        ventureId: true,
        owner: {
          select: {
            founderNumber: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            role: true,
          }
        }
      },
      take: batchSize,
      orderBy: { createdAt: 'asc' } // Delete oldest first
    });

    result.assetsFound = assets.length;

    console.log(`[Media Cleanup] Found ${assets.length} eligible assets`);

    if (assets.length === 0) {
      result.duration = Date.now() - startTime;
      return result;
    }

    // Process each asset
    const nowMs = Date.now();

    for (const asset of assets) {
      try {
        const eligibility = isEligibleForCleanup(
          {
            source: 'GENERATED',
            createdAt: asset.createdAt,
            isFavorite: false,
            isArchived: false,
            owner: asset.owner ?? {},
          },
          nowMs
        );

        if (!eligibility.eligible) {
          continue;
        }

        if (dryRun) {
          // Dry run: Log what would be deleted
          console.log(`[Media Cleanup] [DRY RUN] Would delete: ${asset.url} (${asset.size} bytes, created: ${asset.createdAt.toISOString()})`);
          result.assetsDeleted++;
          result.bytesFreed += asset.size || 0;
        } else {
          // Production: Actually delete
          console.log(`[Media Cleanup] Deleting: ${asset.url}`);

          // Delete from Vercel Blob
          try {
            await del(asset.url);
          } catch (blobError) {
            // Blob might already be deleted - log warning but continue
            console.warn(`[Media Cleanup] Blob delete failed (may already be deleted): ${asset.url}`, blobError);
          }

          // Soft-delete in database (preserve metadata for audit)
          await prisma.mediaAsset.update({
            where: { id: asset.id },
            data: {
              isArchived: true,
              updatedAt: new Date()
            }
          });

          result.assetsDeleted++;
          result.bytesFreed += asset.size || 0;

          console.log(`[Media Cleanup] Deleted: ${asset.url} (${asset.size} bytes freed)`);
        }
      } catch (assetError) {
        const errorMsg = assetError instanceof Error ? assetError.message : String(assetError);
        console.error(`[Media Cleanup] Failed to delete asset ${asset.id}:`, errorMsg);
        result.errors.push(`Asset ${asset.id}: ${errorMsg}`);
        result.success = false; // Mark as partial failure
      }
    }

    result.duration = Date.now() - startTime;

    console.log(`[Media Cleanup] Completed: ${result.assetsDeleted}/${result.assetsFound} assets deleted, ${(result.bytesFreed / 1024 / 1024).toFixed(2)} MB freed (${result.duration}ms)`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Media Cleanup] Cleanup failed:', errorMsg);

    result.success = false;
    result.errors.push(errorMsg);
    result.duration = Date.now() - startTime;

    return result;
  }
}

/**
 * Get cleanup statistics (without actually cleaning)
 *
 * Useful for monitoring/dashboards.
 *
 * @returns Current cleanup eligibility stats
 */
export async function getCleanupStats(): Promise<{
  eligibleAssets: number;
  totalSize: number; // bytes
  oldestAsset: Date | null;
  retentionCutoff: Date;
}> {
  const retentionCandidates = [
    LIFECYCLE_CONFIG.RETENTION_DAYS_FREE,
    LIFECYCLE_CONFIG.RETENTION_DAYS_PRO,
    LIFECYCLE_CONFIG.RETENTION_DAYS_ENTERPRISE
  ].filter((days) => days > 0);

  const minRetentionDays = retentionCandidates.length ? Math.min(...retentionCandidates) : 0;
  const retentionCutoff = new Date(Date.now() - minRetentionDays * MS_PER_DAY);

  if (minRetentionDays <= 0) {
    return {
      eligibleAssets: 0,
      totalSize: 0,
      oldestAsset: null,
      retentionCutoff
    };
  }

  const assets = await prisma.mediaAsset.findMany({
    where: {
      source: 'GENERATED',
      createdAt: { lt: retentionCutoff },
      isArchived: false,
      isFavorite: false
    },
    select: {
      createdAt: true,
      size: true,
      owner: {
        select: {
          founderNumber: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          role: true,
        }
      }
    }
  });

  const nowMs = Date.now();
  let eligibleAssets = 0;
  let totalSize = 0;
  let oldestAsset: Date | null = null;

  for (const asset of assets) {
    const eligibility = isEligibleForCleanup(
      {
        source: 'GENERATED',
        createdAt: asset.createdAt,
        isFavorite: false,
        isArchived: false,
        owner: asset.owner ?? {},
      },
      nowMs
    );
    if (!eligibility.eligible) continue;
    eligibleAssets += 1;
    totalSize += asset.size || 0;
    if (!oldestAsset || asset.createdAt < oldestAsset) {
      oldestAsset = asset.createdAt;
    }
  }

  return {
    eligibleAssets,
    totalSize,
    oldestAsset,
    retentionCutoff
  };
}
