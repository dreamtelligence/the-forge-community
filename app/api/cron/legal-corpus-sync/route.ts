import { NextRequest, NextResponse } from 'next/server';
import { getLegalCorpusStatus, syncLegalCorpus } from '@/lib/legal/corpus';
import { requireCronSecret } from '@/lib/security/cron';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronCheck = requireCronSecret(request);
  if (cronCheck) return cronCheck;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === '1';

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
