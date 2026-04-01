import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiters } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const rateLimitResponse = await RateLimiters.api(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit')) || 24, 60);
  const type = (searchParams.get('type') || 'all').toLowerCase();
  const sort = (searchParams.get('sort') || 'new').toLowerCase();

  const where: any = {
    source: 'GENERATED',
    isArchived: false,
    isPublic: true,
    type: { in: ['IMAGE', 'VIDEO'] },
  };

  if (type === 'image') where.type = 'IMAGE';
  if (type === 'video') where.type = 'VIDEO';

  const orderBy = sort === 'top'
    ? [{ likes: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ createdAt: 'desc' as const }];

  try {
    const assets = await prisma.mediaAsset.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where,
      orderBy,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            profileSlug: true,
            founderNumber: true,
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (assets.length > limit) {
      assets.pop();
      nextCursor = assets[assets.length - 1]?.id;
    }

    let likedIds = new Set<string>();
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          mediaAssetLikes: {
            where: { assetId: { in: assets.map((asset) => asset.id) } },
            select: { assetId: true },
          },
        },
      });
      likedIds = new Set((user?.mediaAssetLikes || []).map((like) => like.assetId));
    }

    const items = assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl,
      type: asset.type,
      prompt: asset.prompt,
      model: asset.model,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt.toISOString(),
      likes: asset.likes,
      owner: {
        id: asset.owner?.id || null,
        name: asset.owner?.name || 'Unknown',
        image: asset.owner?.image || null,
        profileSlug: asset.owner?.profileSlug || null,
        founderNumber: asset.owner?.founderNumber ?? 0,
      },
      userLiked: likedIds.has(asset.id),
    }));

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error('Error fetching media feed:', error);
    return NextResponse.json({ error: 'Failed to fetch media feed' }, { status: 500 });
  }
}
