import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';

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
  let desiredPublic: boolean | undefined;
  try {
    const body = await request.json();
    assetId = String(body?.assetId || '').trim();
    if (typeof body?.isPublic === 'boolean') {
      desiredPublic = body.isPublic;
    }
  } catch {
    assetId = '';
  }

  if (!assetId) {
    return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: { id: true, ownerId: true, isPublic: true },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
  }

  const canManage = user.role === 'ADMIN' || asset.ownerId === user.id;
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nextValue = typeof desiredPublic === 'boolean' ? desiredPublic : !asset.isPublic;

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { isPublic: nextValue, updatedAt: new Date() },
    select: { id: true, isPublic: true },
  });

  return NextResponse.json(updated);
}
