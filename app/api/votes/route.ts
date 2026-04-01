import { NextResponse } from 'next/server';
import { getVotes, updateVoteCount } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const votes = await getVotes();
    return NextResponse.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, delta } = body;

    if (!id || typeof delta !== 'number') {
      return NextResponse.json(
        { error: 'Missing id or delta' },
        { status: 400 }
      );
    }

    const nextVotes = await updateVoteCount(id, delta);
    return NextResponse.json({ id, votes: nextVotes });
  } catch (error) {
    console.error('Error updating vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
}
