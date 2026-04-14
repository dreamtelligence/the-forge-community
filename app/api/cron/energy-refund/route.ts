import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { refundEnergy } from '@/lib/finance/energy';
import { requireCronSecret } from '@/lib/security/cron';

export const dynamic = 'force-dynamic';

/**
 * CRON JOB: Stale Reservation Refunder
 * This job finds energy reservations that have been in 'RESERVED' state for too long
 * (likely due to timeouts or crashes) and refunds them to the user.
 */
export async function GET(request: Request) {
  const cronCheck = requireCronSecret(request);
  if (cronCheck) return cronCheck;

  try {
    // Find reservations older than 10 minutes that are still RESERVED
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const staleReservations = await prisma.energyTransaction.findMany({
      where: {
        status: 'RESERVED',
        createdAt: { lt: tenMinutesAgo },
        type: 'SPEND'
      },
      select: { id: true, userId: true }
    });

    console.log(`[CRON] Found ${staleReservations.length} stale energy reservations.`);

    const results = await Promise.all(
      staleReservations.map(async (res) => {
        try {
          await refundEnergy(res.id, 'stale-reservation-cleanup');
          return { id: res.id, success: true };
        } catch (e) {
          console.error(`[CRON] Failed to refund ${res.id}:`, e);
          return { id: res.id, success: false };
        }
      })
    );

    return NextResponse.json({
      processed: staleReservations.length,
      results
    });

  } catch (error: any) {
    console.error('[CRON] Energy refund job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
