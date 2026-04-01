import { NextRequest, NextResponse } from 'next/server';
import { getLegalCorpusStatus, syncLegalCorpus } from '@/lib/legal-corpus';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === '1';

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const syncResult = await syncLegalCorpus({ force });
    const status = await getLegalCorpusStatus();
    return NextResponse.json({
      success: true,
      sync: syncResult,
      status,
    });
  } catch (error) {
    console.error('[Cron] legal-corpus-sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

