import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const venture = await prisma.venture.findFirst({
      where: {
        id,
        OR: [
          { ownerId: user.id },
          {
            squad: {
              members: {
                some: { userId: user.id, leftAt: null }
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found or access denied' }, { status: 404 });
    }

    const reports = await prisma.trendReport.findMany({
      where: { ventureId: id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({ reports });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}
