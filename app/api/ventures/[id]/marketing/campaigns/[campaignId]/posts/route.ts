import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getVentureAccessByEmail } from '@/lib/ventures/index/access';

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
    const posts = await prisma.contentPost.findMany({
      where: { campaignId, ventureId: access.ventureId },
      orderBy: { scheduledFor: 'asc' }
    });

    return NextResponse.json(posts);
  } catch (_error) {
    return NextResponse.json({ error: 'Fehler beim Laden der Posts' }, { status: 500 });
  }
}

export async function POST(
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

    const post = await prisma.contentPost.create({
      data: {
        ...data,
        ventureId: access.ventureId,
        campaignId,
        createdById: access.userId,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      }
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Failed to create post:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
