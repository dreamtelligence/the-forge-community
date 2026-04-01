import { NextResponse } from 'next/server';
import { getFinancialSummary } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getFinancialSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in financial summary API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial summary' },
      { status: 500 }
    );
  }
}
