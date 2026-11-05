import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';
import { reserveEnergy, settleEnergy, refundEnergy, checkDailyVideoQuota } from '@/lib/finance/energy';
import { estimateVideoCredits } from '@/lib/billing/credit-pricing';
import { generateUUID } from '@/lib/utils/uuid';
import { put } from '@vercel/blob';
import {
  createReplicatePrediction,
  extractReplicateOutputUrls,
  getReplicatePrediction,
} from '@/lib/ai/infrastructure/marketing-media-replicate';

/**
 * Veo Studio ueber Replicate (google/veo-3.1, google/veo-3.1-fast).
 * Die Veo-Preview-Modelle der Gemini API wurden am 22.10.2026 abgeschaltet.
 * Jobs laufen ohne Webhook und werden per GET ?operation=<predictionId> abgeholt.
 */

export const runtime = 'nodejs';
export const maxDuration = 300;

type GenerationMode = 'text-to-video' | 'image-to-video' | 'references-to-video';
type VeoModelKey = 'veo-3.1' | 'veo-3.1-fast';
type AspectRatio = '16:9' | '9:16';
type Resolution = '720p' | '1080p';

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

const REPLICATE_MODEL_BY_KEY: Record<VeoModelKey, string> = {
  'veo-3.1': 'google/veo-3.1',
  'veo-3.1-fast': 'google/veo-3.1-fast',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error || 'Unbekannter Fehler');
};

const ALLOWED_MODES: GenerationMode[] = ['text-to-video', 'image-to-video', 'references-to-video'];
const ALLOWED_ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16'];
const ALLOWED_RESOLUTIONS: Resolution[] = ['720p', '1080p'];
const ALLOWED_DURATIONS = [4, 6, 8];
const MAX_REFERENCES = 3;

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && 'type' in value);
};

const jobKeyForOperation = (operationName: string) => `replicate:veo:${operationName}`;

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

  const { id } = await params;
  const formData = await request.formData();

  const mode = String(formData.get('mode') || '').trim() as GenerationMode;
  const prompt = String(formData.get('prompt') || '').trim();
  const requestedModelKey = (String(formData.get('model') || 'veo-3.1') || 'veo-3.1') as VeoModelKey;
  const aspectRatio = String(formData.get('aspectRatio') || '16:9');
  const resolution = String(formData.get('resolution') || '720p');
  const durationRaw = Number(formData.get('durationSeconds') || 0);
  let durationSeconds = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null;
  const seed = Number(formData.get('seed') || 0) || undefined;
  const negativePrompt = String(formData.get('negativePrompt') || '').trim();
  const generateAudio = String(formData.get('generateAudio') || 'true') !== 'false';

  if (mode === ('extend-video' as GenerationMode)) {
    return NextResponse.json(
      { error: 'Video verlaengern wird seit der Umstellung auf Replicate nicht mehr unterstuetzt.' },
      { status: 400 }
    );
  }
  if (!mode || !ALLOWED_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Ungültiger Mode.' }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt fehlt.' }, { status: 400 });
  }
  if (!(requestedModelKey in REPLICATE_MODEL_BY_KEY)) {
    return NextResponse.json({ error: 'Ungültiges Modell.' }, { status: 400 });
  }
  if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio as AspectRatio)) {
    return NextResponse.json({ error: 'Nur 16:9 oder 9:16 werden unterstützt.' }, { status: 400 });
  }
  if (!ALLOWED_RESOLUTIONS.includes(resolution as Resolution)) {
    return NextResponse.json({ error: 'Nur 720p oder 1080p werden unterstützt.' }, { status: 400 });
  }

  // Referenzbilder gibt es nur bei google/veo-3.1, nur 16:9 und nur 8s.
  const modelKey: VeoModelKey = mode === 'references-to-video' ? 'veo-3.1' : requestedModelKey;
  if (mode === 'references-to-video') {
    if (aspectRatio !== '16:9') {
      return NextResponse.json({ error: 'Character References gehen nur mit 16:9.' }, { status: 400 });
    }
    durationSeconds = 8;
  }
  if (!durationSeconds) durationSeconds = 8;
  if (!ALLOWED_DURATIONS.includes(durationSeconds)) {
    return NextResponse.json({ error: 'Nur 4s, 6s oder 8s Dauer sind erlaubt.' }, { status: 400 });
  }

  const replicateModelId = REPLICATE_MODEL_BY_KEY[modelKey];

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
  const referenceImages = formData.getAll('referenceImages').filter(isFileLike);
  const styleImage = formData.get('styleImage');
  // Replicate kennt keinen eigenen Style-Referenztyp - ein Stylebild zaehlt als weitere Referenz.
  const allReferences = isFileLike(styleImage) ? [...referenceImages, styleImage] : referenceImages;

  if (mode === 'image-to-video' && !isFileLike(startFrame)) {
    return NextResponse.json({ error: 'Bitte lade ein Startbild hoch.' }, { status: 400 });
  }

  if (mode === 'references-to-video') {
    if (allReferences.length === 0) {
      return NextResponse.json({ error: 'Bitte lade mindestens ein Referenzbild hoch.' }, { status: 400 });
    }
    if (allReferences.length > MAX_REFERENCES) {
      return NextResponse.json({ error: 'Maximal 3 Referenzbilder erlaubt.' }, { status: 400 });
    }
  }

  const imageFiles = [startFrame, endFrame, ...allReferences].filter(isFileLike);
  if (imageFiles.some((file) => file.size > MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: 'Ein Bild ist zu groß (max. 10 MB).' }, { status: 413 });
  }

  const pricingEstimate = estimateVideoCredits({
    modelId: replicateModelId,
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
      provider: 'replicate',
      model: replicateModelId,
      metadata: {
        ventureId: id,
        mode,
        model: replicateModelId,
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

    // Dateien direkt uebergeben: der Replicate-Client laedt sie selbst hoch.
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      duration: durationSeconds,
      generate_audio: generateAudio,
    };
    if (negativePrompt) input.negative_prompt = negativePrompt;
    if (seed) input.seed = seed;
    if (mode === 'image-to-video' && isFileLike(startFrame)) {
      input.image = startFrame;
      if (isFileLike(endFrame)) input.last_frame = endFrame;
    }
    if (mode === 'references-to-video') {
      input.reference_images = allReferences;
    }

    const { prediction } = await createReplicatePrediction({
      userId: user.id,
      model: replicateModelId,
      input,
      webhook: false,
    });

    const operationName = prediction.id;
    if (!operationName) {
      throw new Error('Kein Job-Handle von Replicate erhalten.');
    }

    await writeJobCache(operationName, {
      ventureId: id,
      userId: user.id,
      mode,
      model: modelKey,
      modelId: replicateModelId,
      prompt,
      aspectRatio,
      resolution,
      durationSeconds,
      generateAudio,
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
        modelId: replicateModelId,
        aspectRatio,
        resolution,
        durationSeconds,
        generateAudio,
      }
    });
  } catch (error: unknown) {
    if (reservationId) {
      await refundEnergy(reservationId, 'veo-generate-failed');
    }
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message || 'Generierung fehlgeschlagen.' }, { status: 500 });
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

  const sessionUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!sessionUser || sessionUser.id !== cachedJob.userId) {
    return NextResponse.json({ error: 'Job nicht gefunden.' }, { status: 404 });
  }

  if (cachedJob.assets && cachedJob.assets.length > 0) {
    return NextResponse.json({ status: 'succeeded', assets: cachedJob.assets });
  }

  if (cachedJob.error) {
    return NextResponse.json({ status: 'failed', error: cachedJob.error });
  }

  const failJob = async (reason: string, errorMessage: string) => {
    if (cachedJob.reservationId && !cachedJob.refundedAt) {
      await refundEnergy(cachedJob.reservationId, reason);
      await updateJobCache(operationName, { refundedAt: new Date().toISOString(), error: errorMessage });
    } else {
      await updateJobCache(operationName, { error: errorMessage });
    }
    return NextResponse.json({ status: 'failed', error: errorMessage });
  };

  try {
    const prediction = await getReplicatePrediction(cachedJob.userId, operationName);

    if (prediction.status === 'starting' || prediction.status === 'processing') {
      return NextResponse.json({ status: 'processing', progress: null });
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      const errorMessage =
        typeof prediction.error === 'string' && prediction.error
          ? prediction.error
          : prediction.status === 'canceled'
            ? 'Job abgebrochen.'
            : 'Generierung fehlgeschlagen.';
      return failJob('veo-operation-failed', errorMessage);
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

    const [outputUrl] = await extractReplicateOutputUrls(prediction.output);
    if (!outputUrl) {
      return failJob('veo-no-output', 'Kein Video erhalten.');
    }

    const res = await fetch(outputUrl);
    if (!res.ok) {
      return failJob('veo-download-failed', `Video-Download fehlgeschlagen (${res.status}).`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) {
      return failJob('veo-empty-output', 'Video-Output fehlt.');
    }

    const filename = `marketing/${lockedJob.userId}/veo/${Date.now()}-${sanitizeFilename(operationName)}.mp4`;
    const mimeType = res.headers.get('content-type')?.startsWith('video/')
      ? (res.headers.get('content-type') as string)
      : 'video/mp4';
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
        provider: 'replicate',
        model: lockedJob.modelId,
        metadata: {
          providerCostEur: lockedJob.estimatedProviderCostEur,
          providerCostUsd: lockedJob.estimatedProviderCostUsd,
          fxRate: lockedJob.fxRate,
          predictionId: operationName,
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
    return failJob('veo-polling-failed', errorMessage);
  }
}
