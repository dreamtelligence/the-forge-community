import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || '').toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const where: Record<string, any> = {
    ventureId: id,
    ownerId: user.id,
    isArchived: false,
  };

  if (type === 'video') where.type = 'VIDEO';
  if (type === 'image') where.type = 'IMAGE';

  const asset = await prisma.mediaAsset.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      type: true,
      isPublic: true,
      thumbnailUrl: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ asset: null });
  }

  return NextResponse.json({
    asset: {
      id: asset.id,
      url: asset.url,
      type: asset.type.toLowerCase(),
      isPublic: asset.isPublic,
      thumbnailUrl: asset.thumbnailUrl ?? null,
    },
  });
}
