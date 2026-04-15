import { put } from '@vercel/blob';
import {
  type MarketingMediaCachedAsset,
  type MarketingMediaMode,
  type MarketingMediaUploadFile,
  MarketingMediaValidationError,
} from '@/lib/ai/contracts/marketing-media';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  getMarketingMediaAssetDimensions,
  getMarketingMediaContentInfo,
} from '@/lib/ai/domain/marketing-media';
import { createMarketingMediaAsset } from '@/lib/ai/infrastructure/marketing-media-repository';

const OUTPUT_FETCH_TIMEOUT_MS = 1000 * 60 * 2;

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = OUTPUT_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const isUploadFile = (value: unknown): value is MarketingMediaUploadFile =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'arrayBuffer' in value &&
      'name' in value &&
      'type' in value &&
      'size' in value
  );

const uploadInputFile = async (userId: string, file: MarketingMediaUploadFile, prefix: string) => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MarketingMediaValidationError(`Bild "${file.name}" ist zu groß.`);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new MarketingMediaValidationError(`Ungültiger Typ für "${file.name}".`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFilename(file.name || 'reference');
  const filename = `${prefix}/${userId}/inputs/${Date.now()}-${safeName}`;
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: file.type,
  });

  return blob.url;
};

export const uploadMarketingMediaInputs = async (params: {
  userId: string;
  mode: MarketingMediaMode;
  imageFile: unknown;
  endImageFile: unknown;
  existingImageUrl: unknown;
  existingEndImageUrl: unknown;
  imageFiles: unknown[];
  requiresImageInput: boolean;
}) => {
  let imageUrl: string | string[] | undefined;
  let endImageUrl: string | undefined;

  if (params.mode === 'image-to-image') {
    if (params.imageFiles.length < 2 || params.imageFiles.length > 3) {
      throw new MarketingMediaValidationError('Bitte lade 2-3 Referenzbilder hoch.');
    }

    if (!params.imageFiles.every(isUploadFile)) {
      throw new MarketingMediaValidationError('Ungültige Bilddaten.');
    }

    imageUrl = [];
    for (const file of params.imageFiles) {
      imageUrl.push(await uploadInputFile(params.userId, file, 'marketing'));
    }

    return { imageUrl, endImageUrl };
  }

  if (isUploadFile(params.imageFile)) {
    imageUrl = await uploadInputFile(params.userId, params.imageFile, 'marketing');
  } else if (typeof params.existingImageUrl === 'string' && params.existingImageUrl.trim()) {
    imageUrl = params.existingImageUrl;
  }

  if (isUploadFile(params.endImageFile)) {
    endImageUrl = await uploadInputFile(params.userId, params.endImageFile, 'marketing');
  } else if (typeof params.existingEndImageUrl === 'string' && params.existingEndImageUrl.trim()) {
    endImageUrl = params.existingEndImageUrl;
  }

  if (!imageUrl && params.requiresImageInput) {
    throw new MarketingMediaValidationError('Bitte lade ein Referenzbild hoch.');
  }

  return { imageUrl, endImageUrl };
};

export const persistMarketingMediaOutputs = async (params: {
  outputUrls: string[];
  outputType: 'image' | 'video';
  ventureId: string;
  userId: string;
  prompt: string;
  model: string;
  mode: MarketingMediaMode;
  originTag?: string;
  aspectRatio: string;
}): Promise<MarketingMediaCachedAsset[]> => {
  const dimensions = getMarketingMediaAssetDimensions(
    params.aspectRatio,
    params.outputType === 'video'
  );

  return Promise.all(
    params.outputUrls.map(async (url, index) => {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error('Output konnte nicht geladen werden');
      }

      const blobData = await response.blob();
      const buffer = Buffer.from(await blobData.arrayBuffer());
      const info = getMarketingMediaContentInfo(response.headers.get('content-type'), params.outputType);
      const filename = `marketing/${params.userId}/${Date.now()}-${index}.${info.ext}`;

      const uploaded = await put(filename, buffer, {
        access: 'public',
        contentType: info.contentType,
      });

      const created = await createMarketingMediaAsset({
        ventureId: params.ventureId,
        ownerId: params.userId,
        type: params.outputType === 'video' ? 'VIDEO' : 'IMAGE',
        url: uploaded.url,
        filename,
        mimeType: info.contentType,
        size: buffer.length,
        prompt: params.prompt,
        model: params.model,
        width: dimensions.width,
        height: dimensions.height,
        tags: [params.mode, 'replicate', ...(params.originTag ? [params.originTag] : [])],
      });

      return {
        id: created.id,
        url: created.url,
        type: params.outputType,
        isPublic: created.isPublic,
      };
    })
  );
};
