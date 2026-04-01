import { NextResponse } from 'next/server';
import { checkOverdueTasks } from '@/app/actions/ventures';

/**
 * Cron Job API Route for monitoring overdue tasks
 *
 * Setup in Vercel:
 * 1. Go to Project Settings → Cron Jobs
 * 2. Add: /api/cron/check-deadlines
 * 3. Schedule: 0 9 * * * (täglich um 9 Uhr)
 * 4. Region: Same as your functions
 *
 * Or use an external cron service (cron-job.org) to call this endpoint
 */

export async function GET(request: Request) {
  // Optional: Verify the request is from Vercel Cron or has a secret
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const overdueCount = await checkOverdueTasks();

    return NextResponse.json({
      success: true,
      overdueTasksFound: overdueCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to check deadlines' },
      { status: 500 }
    );
  }
}
