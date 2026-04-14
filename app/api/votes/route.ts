import { NextResponse } from 'next/server';
import { getVotes, updateVoteCount } from '@/lib/integrations/notion';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';

export const dynamic = 'force-dynamic';

const voteKeyForUser = (itemId: string, userId: string) => `notion_vote:${itemId}:${userId}`;

const parseStoredVote = (value: string | null | undefined) => {
  const parsed = Number(value);
  return parsed === 1 || parsed === -1 ? parsed : 0;
};

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
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, delta } = body;

    if (!id || (delta !== 1 && delta !== -1)) {
      return NextResponse.json(
        { error: 'Invalid id or delta' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const voteStateKey = voteKeyForUser(String(id), user.id);
    const existingVoteState = await prisma.systemCache.findUnique({
      where: { key: voteStateKey },
      select: { value: true },
    });

    const currentVote = parseStoredVote(existingVoteState?.value);
    const nextUserVote = currentVote === delta ? 0 : delta;
    const voteDelta = nextUserVote - currentVote;

    const nextVotes = voteDelta === 0 ? null : await updateVoteCount(id, voteDelta);

    if (nextUserVote === 0) {
      await prisma.systemCache.deleteMany({
        where: { key: voteStateKey },
      });
    } else {
      await prisma.systemCache.upsert({
        where: { key: voteStateKey },
        create: {
          key: voteStateKey,
          value: String(nextUserVote),
        },
        update: {
          value: String(nextUserVote),
        },
      });
    }

    return NextResponse.json({
      id,
      votes: nextVotes,
      userVote: nextUserVote,
    });
  } catch (error) {
    console.error('Error updating vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
}
