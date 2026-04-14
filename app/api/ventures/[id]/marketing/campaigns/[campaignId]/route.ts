import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getVentureAccessByEmail } from '@/lib/ventures/access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string, campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { id, campaignId } = await params;
  const access = await getVentureAccessByEmail(session.user.email, id);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: campaignId, ventureId: access.ventureId },
      include: {
        posts: {
          orderBy: { scheduledFor: 'asc' }
        },
        _count: {
          select: { posts: true }
        }
      }
    });

    if (!campaign) return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 });

    return NextResponse.json(campaign);
  } catch (_error) {
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, campaignId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { id, campaignId } = await params;
  const access = await getVentureAccessByEmail(session.user.email, id);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const data = await req.json();
    
    // Date conversion if present
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.budgetAmount) data.budgetAmount = parseFloat(data.budgetAmount);

    const campaign = await prisma.marketingCampaign.update({
      where: { id: campaignId, ventureId: access.ventureId },
      data
    });

    return NextResponse.json(campaign);
  } catch (_error) {
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
