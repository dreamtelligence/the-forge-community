import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { RateLimiters } from '@/lib/rate-limit';
import { del } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const rateLimitResponse = await RateLimiters.api(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let assetId = '';
  try {
    const body = await request.json();
    assetId = String(body?.assetId || '').trim();
  } catch {
    assetId = '';
  }

  if (!assetId) {
    return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
      select: { id: true, url: true, thumbnailUrl: true, isArchived: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
    }

    const deleteTargets = [asset.url, asset.thumbnailUrl]
      .filter((value): value is string => Boolean(value))
      .filter((value, index, self) => self.indexOf(value) === index);

    for (const target of deleteTargets) {
      try {
        await del(target);
      } catch (blobError) {
        console.warn(`[Media Delete] Blob delete failed (${target})`, blobError);
      }
    }

    if (!asset.isArchived) {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { isArchived: true, updatedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, archived: true });
  } catch (error) {
    console.error('Error deleting media asset:', error);
    return NextResponse.json({ error: 'Failed to delete media asset' }, { status: 500 });
  }
}
