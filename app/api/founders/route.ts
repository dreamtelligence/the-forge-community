import { NextResponse } from 'next/server';
import { getFounders } from '@/lib/notion';

export async function GET() {
  try {
    const founders = await getFounders();
    const count = founders.filter(f => f.status === 'active').length;

    return NextResponse.json({
      success: true,
      count,
      founders: founders.map(f => ({
        founderNumber: f.founderNumber,
        name: f.name,
        joinedDate: f.joinedDate,
        status: f.status,
      })),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch founders' },
      { status: 500 }
    );
  }
}
