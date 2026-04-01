import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
        squadId: venture.squadId
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
        question: body.question,
        description: body.description,
        type: body.type || 'multiple-choice',
        options: body.options || [],
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
