import { put } from '@vercel/blob';
import { prisma } from '@/lib/database/prisma';

const OUTPUT_FETCH_TIMEOUT_MS = 1000 * 60 * 2;

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = OUTPUT_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const persistLegacyReplicateVideoOutput = async (params: {
  storagePrefix: 'faceswap' | 'motion-transfer';
  predictionOutputUrl: string;
  ventureId: string;
  userId: string;
  model: string;
  tags: string[];
}) => {
  const response = await fetchWithTimeout(params.predictionOutputUrl);
  if (!response.ok) {
    throw new Error('Output konnte nicht geladen werden');
  }

  const blobData = await response.blob();
  const buffer = Buffer.from(await blobData.arrayBuffer());
  const filename = `${params.storagePrefix}/${params.userId}/outputs/${Date.now()}-result.mp4`;
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: 'video/mp4',
  });

  const asset = await prisma.mediaAsset.create({
    data: {
      ventureId: params.ventureId,
      ownerId: params.userId,
      type: 'VIDEO',
      url: blob.url,
      filename,
      mimeType: 'video/mp4',
      size: buffer.length,
      source: 'GENERATED',
      model: params.model,
      tags: params.tags,
    },
    select: { id: true, url: true },
  });

  return {
    assetId: asset.id,
    url: asset.url,
  };
};
