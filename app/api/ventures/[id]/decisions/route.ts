import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const normalizeDecisionType = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : 'MULTIPLE_CHOICE';
  return normalized === 'YES_NO' ? 'YES_NO' : 'MULTIPLE_CHOICE';
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify access and get squadId
    const venture = await prisma.venture.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: user.id },
          {
            squad: {
              members: {
                some: {
                  userId: user.id,
                  leftAt: null
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        squadId: true
      }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
    }

    if (!venture.squadId) {
       // If no squad, return empty list (or should we allow solo decisions?)
       // Schema requires squadId, so we can't fetch squad decisions if no squad exists.
       return NextResponse.json([]);
    }

    const decisions = await prisma.decision.findMany({
      where: {
        squadId: venture.squadId,
        ventureId: venture.id,
      },
      include: {
        responses: true,
        createdBy: {
          select: {
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(decisions);
  } catch (error) {
    console.error('Failed to fetch decisions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const normalizedType = normalizeDecisionType(body.type);
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const options =
      normalizedType === 'YES_NO'
        ? ['Ja', 'Nein']
        : Array.isArray(body.options)
          ? body.options
              .map((option: unknown) => (typeof option === 'string' ? option.trim() : ''))
              .filter(Boolean)
          : [];

    if (question.length < 5) {
      return NextResponse.json({ error: 'Question is too short' }, { status: 400 });
    }

    if (normalizedType === 'MULTIPLE_CHOICE' && options.length < 2) {
      return NextResponse.json({ error: 'At least two options are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const venture = await prisma.venture.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: user.id },
          {
            squad: {
              members: {
                some: {
                  userId: user.id,
                  leftAt: null
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        squadId: true
      }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
    }

    if (!venture.squadId) {
      return NextResponse.json({ error: 'This venture is not part of a squad' }, { status: 400 });
    }

    const decision = await prisma.decision.create({
      data: {
        squadId: venture.squadId,
        ventureId: venture.id,
        question,
        description,
        type: normalizedType,
        options,
        deadline: body.deadline ? new Date(body.deadline) : null,
        createdById: user.id
      }
    });

    return NextResponse.json(decision);
  } catch (error) {
    console.error('Failed to create decision:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
