import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiters } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const rateLimitResponse = await RateLimiters.api(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const assetId = String(body?.assetId || '').trim();
    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.findUnique({
        where: { id: assetId },
        select: { id: true, likes: true },
      });

      if (!asset) {
        throw new Error('MEDIA_NOT_FOUND');
      }

      const existing = await tx.mediaAssetLike.findUnique({
        where: { assetId_userId: { assetId, userId: user.id } },
        select: { id: true },
      });

      let likesDelta = 0;
      let userLiked = false;

      if (existing) {
        await tx.mediaAssetLike.delete({ where: { id: existing.id } });
        likesDelta = -1;
        userLiked = false;
      } else {
        await tx.mediaAssetLike.create({
          data: { assetId, userId: user.id },
        });
        likesDelta = 1;
        userLiked = true;
      }

      const nextLikes = Math.max(0, asset.likes + likesDelta);
      const updated = await tx.mediaAsset.update({
        where: { id: assetId },
        data: { likes: nextLikes },
        select: { likes: true },
      });

      return { likes: updated.likes, userLiked };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === 'MEDIA_NOT_FOUND') {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
    }
    console.error('Error updating media likes:', error);
    return NextResponse.json({ error: 'Failed to update media likes' }, { status: 500 });
  }
}
