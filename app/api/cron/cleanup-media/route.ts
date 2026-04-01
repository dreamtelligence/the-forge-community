/**
 * Media Cleanup Cron Job
 *
 * Automatically deletes old generated media assets to prevent unbounded storage growth.
 *
 * Schedule: Daily at 02:00 UTC (configured in vercel.json)
 * Duration: Max 60 seconds (Vercel Pro plan required for longer)
 *
 * Security:
 * - Protected by Vercel Cron secret (only Vercel can call this)
 * - Fails gracefully (doesn't crash on errors)
 * - Logs all operations for monitoring
 *
 * @module app/api/cron/cleanup-media
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldMediaAssets, getCleanupStats } from '@/lib/storage/media-lifecycle';

export const maxDuration = 60; // Max duration for cron job

/**
 * Vercel Cron Job Handler
 *
 * Protected by Authorization header (Vercel sets this automatically)
 *
 * @see https://vercel.com/docs/cron-jobs/manage-cron-jobs
 */
export async function GET(request: NextRequest) {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Unauthorized cron job attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Cron] Media cleanup job started');

    // Step 1: Get current statistics
    const stats = await getCleanupStats();
    console.log(`[Cron] Found ${stats.eligibleAssets} assets eligible for cleanup (${(stats.totalSize / 1024 / 1024).toFixed(2)} MB)`);

    if (stats.eligibleAssets === 0) {
      console.log('[Cron] No assets to clean up');
      return NextResponse.json({
        success: true,
        message: 'No assets to clean up',
        stats
      });
    }

    // Step 2: Run cleanup
    const result = await cleanupOldMediaAssets();

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`[Cron] Cleanup completed successfully in ${duration}ms`);
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${result.assetsDeleted} assets`,
        result,
        stats,
        duration
      });
    } else {
      console.error(`[Cron] Cleanup completed with errors in ${duration}ms`, result.errors);
      return NextResponse.json({
        success: false,
        message: `Partial cleanup: ${result.assetsDeleted} deleted, ${result.errors.length} errors`,
        result,
        stats,
        duration
      }, { status: 207 }); // 207 Multi-Status (partial success)
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(`[Cron] Cleanup job failed after ${duration}ms:`, errorMsg);

    return NextResponse.json({
      success: false,
      error: errorMsg,
      duration
    }, { status: 500 });
  }
}
