import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, VideoGenerationReferenceType, GenerateVideosOperation } from '@google/genai/node';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';
import { reserveEnergy, settleEnergy, refundEnergy, checkDailyVideoQuota } from '@/lib/finance/energy';
import { estimateVideoCredits } from '@/lib/billing/credit-pricing';
import { generateUUID } from '@/lib/utils/uuid';
import { put } from '@vercel/blob';
import { GOOGLE_AI_STUDIO_KEY_ENV_HINT, resolveGoogleAIStudioApiKey } from '@/lib/ai/google';

export const runtime = 'nodejs';
export const maxDuration = 300;

type GenerationMode = 'text-to-video' | 'image-to-video' | 'references-to-video' | 'extend-video';
type VeoModelKey = 'veo-3.1' | 'veo-3.1-fast';
type AspectRatio = '16:9' | '9:16';
type Resolution = '720p' | '1080p' | '4k';

type CachedAsset = {
  id?: string;
  url: string;
  type: 'video';
  isPublic?: boolean;
};

type VeoJobCache = {
  ventureId: string;
  userId: string;
  mode: GenerationMode;
  model: VeoModelKey;
  modelId: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number | null;
  generateAudio: boolean;
  cost: number;
  reservationId: string | null;
  creditsRemaining?: number;
  outputType: 'video';
  assets?: CachedAsset[];
  error?: string;
  settledAt?: string;
  refundedAt?: string;
  estimatedProviderCostEur?: number;
  estimatedProviderCostUsd?: number;
  fxRate?: number;
  processingId?: string | null;
  processingAt?: string | null;
  processingBy?: string | null;
  createdAt: string;
};

const JOB_TTL_MS = 1000 * 60 * 60 * 6;
const PROCESSING_LOCK_TTL_MS = 1000 * 60 * 3;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const parseModelCandidates = (value: string | undefined, fallback: string[]) => {
  const preferred = value
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
  const merged = [...preferred, ...fallback].filter(Boolean);
  return Array.from(new Set(merged));
};

const VEO_STANDARD_MODEL_CANDIDATES = parseModelCandidates(
  process.env.VEO_3_1_MODEL_ID,
  ['veo-3.1-generate-preview', 'veo-3.0-generate-preview', 'veo-2.0-generate-001']
);

const VEO_FAST_MODEL_CANDIDATES = parseModelCandidates(
  process.env.VEO_3_1_FAST_MODEL_ID,
  ['veo-3.1-fast-generate-preview', 'veo-3.0-fast-generate-preview', 'veo-2.0-generate-001']
);

const MODEL_CANDIDATES_BY_KEY: Record<VeoModelKey, string[]> = {
  'veo-3.1': VEO_STANDARD_MODEL_CANDIDATES,
  'veo-3.1-fast': VEO_FAST_MODEL_CANDIDATES,
};

const PRICING_MODEL_BY_KEY: Record<VeoModelKey, string> = {
  'veo-3.1': 'google/veo-3.1',
  'veo-3.1-fast': 'google/veo-3.1-fast',
};

const isModelNotFoundError = (error: unknown) => {
  const message = String((error as any)?.message || '').toLowerCase();
  return (
    message.includes('not_found') ||
    message.includes('model') && message.includes('not found') ||
    message.includes('is not found for api version')
  );
};

const isUnsupportedGenerateAudioError = (error: unknown) => {
  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('generateaudio') && message.includes('not supported');
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error || 'Unbekannter Fehler');
};

const MODE_CONSTRAINTS: Record<GenerationMode, {
  maxReferences?: number;
}> = {
  'text-to-video': {},
  'image-to-video': {},
  'references-to-video': {
    maxReferences: 3,
  },
  'extend-video': {},
};

const ALLOWED_ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16'];
const ALLOWED_RESOLUTIONS: Resolution[] = ['720p', '1080p', '4k'];
const ALLOWED_DURATIONS = [4, 6, 8];

const requiresEightSeconds = (mode: GenerationMode, resolution: string) => {
  return mode === 'references-to-video' || mode === 'extend-video' || resolution !== '720p';
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && 'type' in value);
};

const jobKeyForOperation = (operationName: string) => `genai:veo:${operationName}`;

const readJobCache = async (operationName: string) => {
  const record = await prisma.systemCache.findUnique({ where: { key: jobKeyForOperation(operationName) } });
  if (!record) return null;
  try {
    return JSON.parse(record.value) as VeoJobCache;
  } catch (error) {
    console.error('Failed to parse job cache', error);
    return null;
  }
};

const writeJobCache = async (operationName: string, payload: VeoJobCache) => {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  await prisma.systemCache.upsert({
    where: { key: jobKeyForOperation(operationName) },
    update: { value: JSON.stringify(payload), expiresAt },
    create: { key: jobKeyForOperation(operationName), value: JSON.stringify(payload), expiresAt },
  });
};

const updateJobCache = async (operationName: string, updates: Partial<VeoJobCache>) => {
  const existing = await readJobCache(operationName);
  if (!existing) return null;
  const next = { ...existing, ...updates } as VeoJobCache;
  await writeJobCache(operationName, next);
  return next;
};

const isFreshLock = (lockId?: string | null, lockAt?: string | null) => {
  if (!lockId || !lockAt) return false;
  const lockTime = Date.parse(lockAt);
  if (Number.isNaN(lockTime)) return false;
  return Date.now() - lockTime < PROCESSING_LOCK_TTL_MS;
};

const acquireProcessingLock = async (operationName: string, holder: string) => {
  const current = await readJobCache(operationName);
  if (!current) return null;
  if (isFreshLock(current.processingId, current.processingAt)) return null;

  const lockId = generateUUID();
  await updateJobCache(operationName, {
    processingId: lockId,
    processingAt: new Date().toISOString(),
    processingBy: holder,
  });

  const confirmed = await readJobCache(operationName);
  if (!confirmed || confirmed.processingId !== lockId) return null;
  return confirmed;
};

const fileToImage = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    imageBytes: buffer.toString('base64'),
    mimeType: file.type || 'image/png',
  };
};

const fileToVideo = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    videoBytes: buffer.toString('base64'),
    mimeType: file.type || 'video/mp4',
  };
};

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

const resolveDimensions = (aspectRatio: string, resolution: string) => {
  const isPortrait = aspectRatio === '9:16';
  const isSquare = aspectRatio === '1:1';
  const is4k = resolution === '4k';
  const is1080 = resolution === '1080p';

  if (isSquare) {
    if (is4k) return { width: 2160, height: 2160 };
    if (is1080) return { width: 1080, height: 1080 };
    return { width: 720, height: 720 };
  }

  const longSide = is4k ? 3840 : is1080 ? 1920 : 1280;
  const shortSide = is4k ? 2160 : is1080 ? 1080 : 720;
  return {
    width: isPortrait ? shortSide : longSide,
    height: isPortrait ? longSide : shortSide,
  };
};

const extractProgress = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, any>;
  const candidates = [
    record.progress,
    record.progressPercent,
    record.progress_percent,
    record.percent,
    record.percentage,
    record.progressPercentage,
    record?.progress?.percent,
    record?.progress?.percentage,
  ];
  for (const value of candidates) {
    if (typeof value !== 'number') continue;
    if (value <= 1) return Math.round(value * 100);
    if (value >= 0 && value <= 100) return Math.round(value);
  }
  return null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await RateLimiters.media(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const googleKey = resolveGoogleAIStudioApiKey();
  if (!googleKey) {
    return NextResponse.json(
      { error: `Google AI Studio Key fehlt (${GOOGLE_AI_STUDIO_KEY_ENV_HINT}).` },
      { status: 503 }
    );
  }
  const ai = new GoogleGenAI({
    apiKey: googleKey.key,
    apiVersion: process.env.GEMINI_VIDEO_API_VERSION || undefined,
  });

  const { id } = await params;
  const formData = await request.formData();

  const mode = String(formData.get('mode') || '').trim() as GenerationMode;
  const prompt = String(formData.get('prompt') || '').trim();
  const modelKey = (String(formData.get('model') || 'veo-3.1') || 'veo-3.1') as VeoModelKey;
  const aspectRatio = String(formData.get('aspectRatio') || '16:9');
  const resolution = String(formData.get('resolution') || '720p');
  const durationRaw = Number(formData.get('durationSeconds') || 0);
  let durationSeconds = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null;
  const fps = Number(formData.get('fps') || 0) || undefined;
  const seed = Number(formData.get('seed') || 0) || undefined;
  const negativePrompt = String(formData.get('negativePrompt') || '').trim();
  const generateAudio = String(formData.get('generateAudio') || 'true') !== 'false';

  if (!mode || !['text-to-video', 'image-to-video', 'references-to-video', 'extend-video'].includes(mode)) {
    return NextResponse.json({ error: 'Ungültiger Mode.' }, { status: 400 });
  }

  if (mode === 'text-to-video' && !prompt) {
    return NextResponse.json({ error: 'Prompt fehlt.' }, { status: 400 });
  }

  if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio as AspectRatio)) {
    return NextResponse.json({ error: 'Nur 16:9 oder 9:16 werden unterstützt.' }, { status: 400 });
  }
  if (!ALLOWED_RESOLUTIONS.includes(resolution as Resolution)) {
    return NextResponse.json({ error: 'Nur 720p, 1080p oder 4k werden unterstützt.' }, { status: 400 });
  }

  const mustBeEightSeconds = requiresEightSeconds(mode, resolution);
  if (!durationSeconds) {
    durationSeconds = mustBeEightSeconds ? 8 : 4;
  }
  if (!ALLOWED_DURATIONS.includes(durationSeconds)) {
    return NextResponse.json({ error: 'Nur 4s, 6s oder 8s Dauer sind erlaubt.' }, { status: 400 });
  }
  if (mustBeEightSeconds && durationSeconds !== 8) {
    return NextResponse.json(
      { error: 'Bei 1080p/4k, Character oder Extend muss die Dauer 8s sein.' },
      { status: 400 }
    );
  }
  if (mode === 'extend-video' && resolution !== '720p') {
    return NextResponse.json(
      { error: 'Extend Video unterstützt aktuell nur 720p.' },
      { status: 400 }
    );
  }

  const constraints = MODE_CONSTRAINTS[mode] || {};

  const modelCandidates = MODEL_CANDIDATES_BY_KEY[modelKey] || VEO_STANDARD_MODEL_CANDIDATES;
  const requestedModelId = modelCandidates[0];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await prisma.venture.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true }
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const startFrame = formData.get('startFrame');
  const endFrame = formData.get('endFrame');
  const inputVideo = formData.get('inputVideo');
  const referenceImages = formData.getAll('referenceImages');
  const styleImage = formData.get('styleImage');

  if (mode === 'image-to-video') {
    if (!isFileLike(startFrame)) {
      return NextResponse.json({ error: 'Bitte lade ein Startbild hoch.' }, { status: 400 });
    }
  }

  if (mode === 'extend-video') {
    if (!isFileLike(inputVideo)) {
      return NextResponse.json({ error: 'Bitte lade ein Input-Video hoch.' }, { status: 400 });
    }
  }

  if (mode === 'references-to-video') {
    const assetRefs = referenceImages.filter(isFileLike);
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt fehlt.' }, { status: 400 });
    }
    if (assetRefs.length === 0 && !isFileLike(styleImage)) {
      return NextResponse.json({ error: 'Bitte lade mindestens ein Referenzbild hoch.' }, { status: 400 });
    }
    const maxReferences = constraints.maxReferences ?? 3;
    if (assetRefs.length + (isFileLike(styleImage) ? 1 : 0) > maxReferences) {
      return NextResponse.json({ error: 'Maximal 3 Referenzbilder erlaubt.' }, { status: 400 });
    }
  }

  if (isFileLike(startFrame) && startFrame.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Startbild ist zu groß.' }, { status: 413 });
  }
  if (isFileLike(endFrame) && endFrame.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Endbild ist zu groß.' }, { status: 413 });
  }
  if (isFileLike(styleImage) && styleImage.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Stylebild ist zu groß.' }, { status: 413 });
  }
  if (isFileLike(inputVideo) && inputVideo.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'Input-Video ist zu groß.' }, { status: 413 });
  }

  const pricingModel = PRICING_MODEL_BY_KEY[modelKey] || 'google/veo-3.1';
  const pricingEstimate = estimateVideoCredits({
    modelId: pricingModel,
    durationSeconds,
    generateAudio,
    resolution,
    fallbackCredits: 40,
    minimumCredits: 1,
  });
  const cost = pricingEstimate.credits;
  const estimatedProviderCostEur = pricingEstimate.costEur ?? undefined;
  const estimatedProviderCostUsd =
    pricingEstimate.costEur && pricingEstimate.usdPerSecond && durationSeconds
      ? pricingEstimate.usdPerSecond * durationSeconds
      : undefined;

  const requestId = request.headers.get('x-request-id') || generateUUID();
  let reservationId: string | null = null;

  try {
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: cost,
      feature: 'marketing.media.veo',
      requestId,
      provider: 'gemini',
      model: requestedModelId,
      metadata: {
        ventureId: id,
        mode,
        model: requestedModelId,
        providerCostEur: estimatedProviderCostEur,
        providerCostUsd: estimatedProviderCostUsd,
      }
    });
    reservationId = reservation.reservationId;

    const dailyQuota = await checkDailyVideoQuota(user.id);
    if (!dailyQuota.allowed) {
      await refundEnergy(reservationId, 'daily-quota-exceeded');
      return NextResponse.json({
        error: `Tageslimit für Video-Generierung erreicht (${dailyQuota.limit}/Tag). Nächster Reset: ${dailyQuota.resetAt.toLocaleTimeString('de-DE')}`,
        quota: {
          type: 'video',
          limit: dailyQuota.limit,
          remaining: dailyQuota.remaining,
          resetAt: dailyQuota.resetAt.toISOString()
        }
      }, { status: 429 });
    }

    const source: Record<string, any> = {};
    if (prompt) source.prompt = prompt;

    if (mode === 'image-to-video' && isFileLike(startFrame)) {
      source.image = await fileToImage(startFrame);
    }

    if (mode === 'extend-video' && isFileLike(inputVideo)) {
      source.video = await fileToVideo(inputVideo);
    }

    const config: Record<string, any> = {
      numberOfVideos: 1,
      aspectRatio,
      resolution,
      durationSeconds: durationSeconds ?? undefined,
      fps,
      seed,
      negativePrompt: negativePrompt || undefined,
      generateAudio,
    };

    if (mode === 'image-to-video' && isFileLike(endFrame)) {
      config.lastFrame = await fileToImage(endFrame);
    }

    if (mode === 'references-to-video') {
      const refs: Array<{ image: any; referenceType: VideoGenerationReferenceType }> = [];
      for (const file of referenceImages) {
        if (!isFileLike(file)) continue;
        refs.push({
          image: await fileToImage(file),
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }
      if (isFileLike(styleImage)) {
        refs.push({
          image: await fileToImage(styleImage),
          referenceType: VideoGenerationReferenceType.STYLE,
        });
      }
      config.referenceImages = refs;
    }

    const tryGenerate = async (targetConfig: Record<string, any>) => {
      let lastNotFoundError: unknown = null;
      for (const candidateModel of modelCandidates) {
        try {
          const operation = await ai.models.generateVideos({
            model: candidateModel,
            source,
            config: targetConfig,
          });
          return { operation, resolvedModelId: candidateModel };
        } catch (error) {
          if (isModelNotFoundError(error)) {
            lastNotFoundError = error;
            continue;
          }
          throw error;
        }
      }

      if (lastNotFoundError) throw lastNotFoundError;
      throw new Error('Kein kompatibles Veo Modell gefunden.');
    };

    let operation: GenerateVideosOperation;
    let resolvedModelId = requestedModelId;
    let effectiveGenerateAudio = generateAudio;
    try {
      const initial = await tryGenerate(config);
      operation = initial.operation;
      resolvedModelId = initial.resolvedModelId;
    } catch (apiError: unknown) {
      if (isUnsupportedGenerateAudioError(apiError)) {
        const { generateAudio: _ignored, ...configWithoutAudioFlag } = config;
        const retried = await tryGenerate(configWithoutAudioFlag);
        operation = retried.operation;
        resolvedModelId = retried.resolvedModelId;
        effectiveGenerateAudio = false;
      } else {
        throw apiError;
      }
    }

    const operationName = operation.name;
    if (!operationName) {
      throw new Error('Kein Operation-Handle erhalten.');
    }

    await writeJobCache(operationName, {
      ventureId: id,
      userId: user.id,
      mode,
      model: modelKey,
      modelId: resolvedModelId,
      prompt,
      aspectRatio,
      resolution,
      durationSeconds,
      generateAudio: effectiveGenerateAudio,
      cost,
      reservationId,
      estimatedProviderCostEur,
      estimatedProviderCostUsd,
      fxRate: process.env.USD_EUR_RATE ? Number(process.env.USD_EUR_RATE) : undefined,
      outputType: 'video',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: 'starting',
      operationName,
      creditsUsed: cost,
      resolved: {
        model: modelKey,
        modelId: resolvedModelId,
        aspectRatio,
        resolution,
        durationSeconds,
        generateAudio: effectiveGenerateAudio,
      }
    });
  } catch (error: unknown) {
    if (reservationId) {
      await refundEnergy(reservationId, 'veo-generate-failed');
    }
    const message = getErrorMessage(error);
    const status = isModelNotFoundError(error) ? 502 : 500;
    return NextResponse.json({ error: message || 'Generierung fehlgeschlagen.' }, { status });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const operationName = request.nextUrl.searchParams.get('operation');
  if (!operationName) {
    return NextResponse.json({ error: 'operation fehlt.' }, { status: 400 });
  }

  const cachedJob = await readJobCache(operationName);
  if (!cachedJob) {
    return NextResponse.json({ error: 'Job nicht gefunden.' }, { status: 404 });
  }

  if (cachedJob.assets && cachedJob.assets.length > 0) {
    return NextResponse.json({ status: 'succeeded', assets: cachedJob.assets });
  }

  if (cachedJob.error) {
    return NextResponse.json({ status: 'failed', error: cachedJob.error });
  }

  const googleKey = resolveGoogleAIStudioApiKey();
  if (!googleKey) {
    const errorMessage = `Google AI Studio Key fehlt (${GOOGLE_AI_STUDIO_KEY_ENV_HINT}).`;
    return NextResponse.json({ status: 'failed', error: errorMessage });
  }

  const ai = new GoogleGenAI({
    apiKey: googleKey.key,
    apiVersion: process.env.GEMINI_VIDEO_API_VERSION || undefined,
  });

  try {
    const operation = new GenerateVideosOperation();
    operation.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation });

    if (!updated.done) {
      return NextResponse.json({ status: 'processing', progress: extractProgress(updated.metadata) });
    }

    if (updated.error) {
      const errorMessage =
        typeof updated.error === 'string' ? updated.error : JSON.stringify(updated.error);
      if (cachedJob.reservationId && !cachedJob.refundedAt) {
        await refundEnergy(cachedJob.reservationId, 'veo-operation-failed');
        await updateJobCache(operationName, { refundedAt: new Date().toISOString(), error: errorMessage });
      }
      return NextResponse.json({ status: 'failed', error: errorMessage });
    }

    const lockedJob = await acquireProcessingLock(operationName, 'poll');
    if (!lockedJob) {
      return NextResponse.json({ status: 'processing' });
    }

    const operationTag = `veo-op:${operationName}`;
    const existingAsset = await prisma.mediaAsset.findFirst({
      where: {
        tags: { has: operationTag },
        isArchived: false,
      },
      select: { id: true, url: true, isPublic: true },
    });

    if (existingAsset) {
      const assets = [{ id: existingAsset.id, url: existingAsset.url, type: 'video' as const, isPublic: existingAsset.isPublic }];
      await updateJobCache(operationName, { assets });
      return NextResponse.json({ status: 'succeeded', assets });
    }

    const generated = updated.response?.generatedVideos?.[0]?.video;
    if (!generated) {
      const errorMessage = 'Kein Video erhalten.';
      if (lockedJob.reservationId && !lockedJob.refundedAt) {
        await refundEnergy(lockedJob.reservationId, 'veo-no-output');
        await updateJobCache(operationName, { refundedAt: new Date().toISOString(), error: errorMessage });
      }
      return NextResponse.json({ status: 'failed', error: errorMessage });
    }

    let buffer: Buffer | null = null;
    if (generated.videoBytes) {
      buffer = Buffer.from(generated.videoBytes, 'base64');
    } else if (generated.uri) {
      const res = await fetch(generated.uri, {
        headers: {
          'x-goog-api-key': googleKey.key,
        },
      });
      if (!res.ok) {
        const reason = await res.text().catch(() => '');
        const errorMessage = reason
          ? `Video-Download fehlgeschlagen (${res.status}): ${reason}`
          : `Video-Download fehlgeschlagen (${res.status}).`;
        if (lockedJob.reservationId && !lockedJob.refundedAt) {
          await refundEnergy(lockedJob.reservationId, 'veo-download-failed');
          await updateJobCache(operationName, { refundedAt: new Date().toISOString(), error: errorMessage });
        }
        return NextResponse.json({ status: 'failed', error: errorMessage });
      }
      buffer = Buffer.from(await res.arrayBuffer());
    }

    if (!buffer) {
      const errorMessage = 'Video-Output fehlt.';
      if (lockedJob.reservationId && !lockedJob.refundedAt) {
        await refundEnergy(lockedJob.reservationId, 'veo-empty-output');
        await updateJobCache(operationName, { refundedAt: new Date().toISOString(), error: errorMessage });
      }
      return NextResponse.json({ status: 'failed', error: errorMessage });
    }

    const filename = `marketing/${lockedJob.userId}/veo/${Date.now()}-${sanitizeFilename(operationName)}.mp4`;
    const mimeType = generated.mimeType || 'video/mp4';
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    const dimensions = resolveDimensions(lockedJob.aspectRatio, lockedJob.resolution);

    const created = await prisma.mediaAsset.create({
      data: {
        ventureId: lockedJob.ventureId,
        ownerId: lockedJob.userId,
        type: 'VIDEO',
        url: blob.url,
        filename,
        mimeType,
        size: buffer.length,
        source: 'GENERATED',
        prompt: lockedJob.prompt,
        model: lockedJob.modelId,
        width: dimensions.width,
        height: dimensions.height,
        duration: lockedJob.durationSeconds ?? undefined,
        tags: ['veo', lockedJob.mode, `model:${lockedJob.model}`, operationTag],
      },
      select: { id: true, url: true, isPublic: true },
    });

    let creditsRemaining: number | undefined;
    if (lockedJob.reservationId && !lockedJob.settledAt) {
      const settlement = await settleEnergy({
        reservationId: lockedJob.reservationId,
        finalCost: lockedJob.cost,
        provider: 'gemini',
        model: lockedJob.modelId,
        metadata: {
          providerCostEur: lockedJob.estimatedProviderCostEur,
          providerCostUsd: lockedJob.estimatedProviderCostUsd,
          fxRate: lockedJob.fxRate,
        }
      });
      creditsRemaining = settlement.creditsRemaining;
    }

    const assets = [{ id: created.id, url: created.url, type: 'video' as const, isPublic: created.isPublic }];
    await updateJobCache(operationName, {
      assets,
      settledAt: new Date().toISOString(),
      creditsRemaining,
    });

    return NextResponse.json({ status: 'succeeded', assets, creditsRemaining });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Veo polling failed', { operationName, error: errorMessage });

    if (cachedJob.reservationId && !cachedJob.refundedAt) {
      await refundEnergy(cachedJob.reservationId, 'veo-polling-failed');
      await updateJobCache(operationName, { refundedAt: new Date().toISOString(), error: errorMessage });
    } else {
      await updateJobCache(operationName, { error: errorMessage });
    }

    return NextResponse.json({ status: 'failed', error: errorMessage });
  }
}
