import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; decisionId: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: ventureId, decisionId } = await params;

  try {
    const body = await req.json();
    const choice = typeof body.choice === 'string' ? body.choice.trim() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim() : null;

    if (!choice) {
      return NextResponse.json({ error: 'Choice is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if decision exists and user has access via squad
    const decision = await prisma.decision.findUnique({
      where: { id: decisionId },
      select: {
        id: true,
        ventureId: true,
        type: true,
        options: true,
        status: true,
        deadline: true,
        squad: {
          select: {
            members: {
              where: {
                userId: user.id,
                leftAt: null
              }
            }
          }
        }
      },
    });

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.ventureId !== ventureId) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // Check if user is member of the squad
    if (decision.squad.members.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this squad' }, { status: 403 });
    }

    // Check if voting is open
    if (decision.status !== 'open') {
        return NextResponse.json({ error: 'Voting is closed' }, { status: 400 });
    }

    if (decision.deadline && new Date() > decision.deadline) {
        return NextResponse.json({ error: 'Voting deadline has passed' }, { status: 400 });
    }

    const allowedChoices = decision.type === 'YES_NO' ? ['Ja', 'Nein'] : decision.options;
    if (!allowedChoices.includes(choice)) {
      return NextResponse.json({ error: 'Invalid choice for this decision' }, { status: 400 });
    }

    // Cast vote (upsert to allow changing vote)
    const vote = await prisma.voteResponse.upsert({
      where: {
        decisionId_userId: {
          decisionId: decisionId,
          userId: user.id
        }
      },
      create: {
        decisionId: decisionId,
        userId: user.id,
        choice,
        comment
      },
      update: {
        choice,
        comment,
        votedAt: new Date() // Update timestamp
      }
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error('Failed to submit vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
