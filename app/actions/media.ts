'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { del, put } from '@vercel/blob';
import { settleEnergy, refundEnergy } from '@/lib/energy';
import { revalidatePath } from 'next/cache';

// Helper to manage media assets and storage flows

export async function getVentureMedia(ventureId: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error('Unauthorized');

  return prisma.mediaAsset.findMany({
    where: {
      ventureId,
      venture: { owner: { email: session.user.email } },
      isArchived: false,
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function saveGeneratedAsset(
  ventureId: string,
  base64Data: string,
  type: 'IMAGE' | 'VIDEO',
  metadata: any,
  cost: number,
  reservationId: string
) {
  const session = await auth();
  if (!session?.user?.email) throw new Error('Unauthorized');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });
  if (!user) throw new Error('User not found');

  try {
    // 1. Upload to Blob Storage
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${ventureId}/${Date.now()}.${type === 'VIDEO' ? 'mp4' : 'png'}`;
    
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: type === 'VIDEO' ? 'video/mp4' : 'image/png'
    });

    // 2. Create DB Entry
    const asset = await prisma.mediaAsset.create({
      data: {
        ventureId,
        ownerId: user.id,
        type,
        url: blob.url,
        filename: filename,
        mimeType: type === 'VIDEO' ? 'video/mp4' : 'image/png',
        size: buffer.length,
        source: 'GENERATED',
        prompt: metadata.prompt,
        model: metadata.model,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration
      }
    });

    // 3. Settle Energy Transaction
    await settleEnergy({
      reservationId,
      finalCost: cost,
      metadata: { assetId: asset.id }
    });

    revalidatePath(`/forge/${ventureId}/marketing`);
    return asset;

  } catch (error) {
    console.error('Save failed:', error);
    // Refund on failure
    await refundEnergy(reservationId, 'save-failed');
    throw error;
  }
}

export async function deleteAsset(assetId: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error('Unauthorized');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) throw new Error('User not found');

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      url: true,
      thumbnailUrl: true,
      isArchived: true,
      ventureId: true,
      venture: { select: { owner: { select: { email: true } } } },
    },
  });

  if (!asset) {
    throw new Error('Media asset not found');
  }

  const isOwner = asset.venture?.owner?.email === session.user.email;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new Error('Unauthorized');
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

  revalidatePath(`/forge/${asset.ventureId}/marketing`);
}
