import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import MediaFeedClient from './MediaFeedClient';
import type { MediaFeedItem } from './MediaFeedClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const INITIAL_LIMIT = 24;

async function getInitialFeed(email: string | null): Promise<{
  items: MediaFeedItem[];
  nextCursor: string | null;
  viewerRole: string | null;
}> {
  const assets = await prisma.mediaAsset.findMany({
    take: INITIAL_LIMIT + 1,
    where: {
      source: 'GENERATED',
      isArchived: false,
      isPublic: true,
      type: { in: ['IMAGE', 'VIDEO'] },
    },
    orderBy: [{ createdAt: 'desc' }],
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

  let nextCursor: string | null = null;
  if (assets.length > INITIAL_LIMIT) {
    assets.pop();
    nextCursor = assets[assets.length - 1]?.id ?? null;
  }

  let likedIds = new Set<string>();
  let viewerRole: string | null = null;
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        role: true,
        mediaAssetLikes: {
          where: { assetId: { in: assets.map((asset) => asset.id) } },
          select: { assetId: true },
        },
      },
    });
    viewerRole = user?.role ?? null;
    likedIds = new Set((user?.mediaAssetLikes || []).map((like) => like.assetId));
  }

  const items = assets
    .filter(
      (asset): asset is (typeof assets)[number] & { type: MediaFeedItem['type'] } =>
        asset.type === 'IMAGE' || asset.type === 'VIDEO'
    )
    .map((asset) => ({
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

  return { items, nextCursor, viewerRole };
}

export default async function MediaPage() {
  const session = await auth();
  const email = session?.user?.email || null;
  const { items, nextCursor, viewerRole } = await getInitialFeed(email);

  return (
    <MediaFeedClient
      initialItems={items}
      initialCursor={nextCursor}
      viewerRole={viewerRole}
    />
  );
}
