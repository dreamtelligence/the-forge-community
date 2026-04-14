import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getVentureAccessByEmail } from '@/lib/ventures/index/access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { id } = await params;
  const access = await getVentureAccessByEmail(session.user.email, id);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const campaigns = await prisma.marketingCampaign.findMany({
      where: { ventureId: access.ventureId },
      include: {
        _count: {
          select: { posts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { id } = await params;
  const access = await getVentureAccessByEmail(session.user.email, id);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const data = await req.json();

    const campaign = await prisma.marketingCampaign.create({
      data: {
        ...data,
        ventureId: access.ventureId,
        createdById: access.userId,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        budgetAmount: data.budgetAmount ? parseFloat(data.budgetAmount) : null,
      }
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
