import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';
import { reserveEnergy, refundEnergy, settleEnergy, InsufficientEnergyError, checkDailyVideoQuota, getUserTier } from '@/lib/finance/energy';
import { getReplicateClientForUser } from '@/lib/integrations/provider-keys';
import { put } from '@vercel/blob';
import { generateUUID } from '@/lib/utils/uuid';
import { LIPSYNC_MODELS } from '@/lib/media-models';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_VIDEO_BYTES = 120 * 1024 * 1024; // 120MB
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
]);

type LipSyncMode = 'preview' | 'final';

type LipSyncJobCache = {
  ventureId: string;
  userId: string;
  replicateAuthSource?: 'user' | 'platform';
  model: string;
  mode: LipSyncMode;
  cost: number;
  reservationId: string | null;
  videoUrl: string;
  audioUrl: string;
  outputUrl?: string;
  error?: string;
  settledAt?: string;
  refundedAt?: string;
  createdAt: string;
};

const jobKeyForPrediction = (predictionId: string) => `lipsync:${predictionId}`;

const readJobCache = async (predictionId: string) => {
  const record = await prisma.systemCache.findUnique({ where: { key: jobKeyForPrediction(predictionId) } });
  if (!record) return null;
  try {
    return JSON.parse(record.value) as LipSyncJobCache;
  } catch {
    return null;
  }
};

const writeJobCache = async (predictionId: string, payload: LipSyncJobCache) => {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 6);
  await prisma.systemCache.upsert({
    where: { key: jobKeyForPrediction(predictionId) },
    update: { value: JSON.stringify(payload), expiresAt },
    create: { key: jobKeyForPrediction(predictionId), value: JSON.stringify(payload), expiresAt },
  });
};

const updateJobCache = async (predictionId: string, updates: Partial<LipSyncJobCache>) => {
  const existing = await readJobCache(predictionId);
  if (!existing) return null;
  const next = { ...existing, ...updates };
  await writeJobCache(predictionId, next);
  return next;
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && 'type' in value);
};

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

const normalizeOutputUrl = (output: unknown) => {
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && typeof output[0] === 'string') return output[0];
  return null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await RateLimiters.heavy(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id: ventureId } = await params;
  const formData = await request.formData();

  const mode = (String(formData.get('mode') || 'preview') as LipSyncMode) === 'final' ? 'final' : 'preview';
  const videoFile = formData.get('video');
  const audioFile = formData.get('audio');
  const audioUrl = typeof formData.get('audioUrl') === 'string' ? String(formData.get('audioUrl')).trim() : '';
  const optionsRaw = typeof formData.get('options') === 'string' ? String(formData.get('options')) : '';

  const hasVideo = isFileLike(videoFile);
  const hasAudioFile = isFileLike(audioFile);
  const hasAudio = hasAudioFile || Boolean(audioUrl);

  if (!hasVideo) {
    return NextResponse.json({ error: 'Video ist erforderlich' }, { status: 400 });
  }
  if (!hasAudio) {
    return NextResponse.json({ error: 'Audio ist erforderlich' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });
  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, ownerId: user.id },
  });
  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const tier = await getUserTier(user.id);
  const isPaid = tier === 'paid';
  if (mode === 'final' && !isPaid) {
    return NextResponse.json(
      {
        error: 'Final Render ist nur für Pro verfügbar.',
        code: 'PRO_REQUIRED'
      },
      { status: 402 }
    );
  }

  const modelConfig = LIPSYNC_MODELS[mode];
  if (!modelConfig) {
    return NextResponse.json({ error: 'Ungültiger Modus' }, { status: 400 });
  }

  const replicateClientContext = await getReplicateClientForUser(user.id);
  if (!replicateClientContext) {
    return NextResponse.json(
      { error: 'Kein Replicate Key konfiguriert. Bitte BYOK oder Plattform-Key setzen.' },
      { status: 500 }
    );
  }

  const video = videoFile as File;
  if (video.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'Video ist zu groß (max 120MB)' }, { status: 413 });
  }
  if (!ALLOWED_VIDEO_TYPES.has(video.type)) {
    return NextResponse.json({ error: 'Ungültiges Video-Format (nur MP4/MOV)' }, { status: 415 });
  }

  if (hasAudioFile) {
    const audio = audioFile as File;
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio ist zu groß (max 20MB)' }, { status: 413 });
    }
    if (!ALLOWED_AUDIO_TYPES.has(audio.type)) {
      return NextResponse.json({ error: 'Ungültiges Audio-Format' }, { status: 415 });
    }
  }

  let reservationId: string | null = null;
  const requestId = request.headers.get('x-request-id') || generateUUID();
  const cost = modelConfig.cost;

  try {
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: cost,
      feature: 'marketing.lipsync',
      requestId,
      metadata: {
        ventureId,
        model: modelConfig.id,
        mode,
        cost,
      }
    });
    reservationId = reservation.reservationId;

    const dailyQuota = await checkDailyVideoQuota(user.id);
    if (!dailyQuota.allowed) {
      await refundEnergy(reservationId, 'daily-quota-exceeded');
      return NextResponse.json({
        error: `Tageslimit für Video erreicht (${dailyQuota.limit}/Tag). Reset: ${dailyQuota.resetAt.toLocaleTimeString('de-DE')}`,
        quota: {
          limit: dailyQuota.limit,
          remaining: dailyQuota.remaining,
          resetAt: dailyQuota.resetAt.toISOString()
        }
      }, { status: 429 });
    }

    const videoBuffer = Buffer.from(await video.arrayBuffer());
    const videoFilename = `lipsync/${user.id}/videos/${Date.now()}-${sanitizeFilename(video.name)}`;
    const videoBlob = await put(videoFilename, videoBuffer, {
      access: 'public',
      contentType: video.type,
    });

    let resolvedAudioUrl = audioUrl;
    if (hasAudioFile) {
      const audio = audioFile as File;
      const audioBuffer = Buffer.from(await audio.arrayBuffer());
      const audioFilename = `lipsync/${user.id}/audio/${Date.now()}-${sanitizeFilename(audio.name)}`;
      const audioBlob = await put(audioFilename, audioBuffer, {
        access: 'public',
        contentType: audio.type,
      });
      resolvedAudioUrl = audioBlob.url;
    }

    if (!resolvedAudioUrl) {
      throw new Error('Audio URL fehlt');
    }

    let options: Record<string, unknown> = {};
    if (optionsRaw) {
      try {
        options = JSON.parse(optionsRaw);
      } catch {
        options = {};
      }
    }

    const input: Record<string, unknown> = {
      video: videoBlob.url,
      audio: resolvedAudioUrl,
      ...options
    };

    const prediction = await replicateClientContext.client.predictions.create({
      model: modelConfig.id,
      input,
    });

    await writeJobCache(prediction.id, {
      ventureId,
      userId: user.id,
      replicateAuthSource: replicateClientContext.source,
      model: modelConfig.id,
      mode,
      cost,
      reservationId,
      videoUrl: videoBlob.url,
      audioUrl: resolvedAudioUrl,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
      provider: 'replicate',
      model: modelConfig.label,
      creditsUsed: cost,
      tier,
    });
  } catch (error: any) {
    if (reservationId) await refundEnergy(reservationId, 'lipsync-failed');
    if (error instanceof InsufficientEnergyError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: error.requiredCredits,
          creditsAvailable: error.creditsAvailable,
        },
        { status: 402 }
      );
    }
    console.error('LipSync Error:', error);
    return NextResponse.json({ error: error.message || 'Lip-Sync fehlgeschlagen' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id: ventureId } = await params;
  const predictionId = request.nextUrl.searchParams.get('predictionId');

  if (!predictionId) {
    return NextResponse.json({ error: 'predictionId fehlt' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });
  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const cachedJob = await readJobCache(predictionId);
  if (!cachedJob || cachedJob.userId !== user.id || cachedJob.ventureId !== ventureId) {
    return NextResponse.json({ error: 'Prediction nicht gefunden' }, { status: 404 });
  }

  const replicateClientContext = await getReplicateClientForUser(user.id);
  if (!replicateClientContext) {
    return NextResponse.json(
      { error: 'Kein Replicate Key verfügbar. Bitte BYOK oder Plattform-Key konfigurieren.' },
      { status: 500 }
    );
  }

  const prediction = await replicateClientContext.client.predictions.get(predictionId);

  if (prediction.status === 'succeeded') {
    if (!cachedJob.outputUrl) {
      const outputUrl = normalizeOutputUrl(prediction.output);
      if (!outputUrl) {
        return NextResponse.json({ status: 'failed', error: 'Kein Output von Replicate' });
      }

      const res = await fetch(outputUrl);
      if (!res.ok) throw new Error('Output konnte nicht geladen werden');
      const blobData = await res.blob();
      const buffer = Buffer.from(await blobData.arrayBuffer());

      const filename = `lipsync/${user.id}/outputs/${Date.now()}-result.mp4`;
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'video/mp4',
      });

      await prisma.mediaAsset.create({
        data: {
          ventureId,
          ownerId: user.id,
          type: 'VIDEO',
          url: blob.url,
          filename,
          mimeType: 'video/mp4',
          size: buffer.length,
          source: 'GENERATED',
          model: cachedJob.model,
          tags: ['lipsync', 'replicate', cachedJob.mode]
        }
      });

      if (cachedJob.reservationId) {
        await settleEnergy({
          reservationId: cachedJob.reservationId,
          finalCost: cachedJob.cost,
          provider: 'replicate',
          model: cachedJob.model
        });
      }

      await updateJobCache(predictionId, {
        outputUrl: blob.url,
        settledAt: new Date().toISOString(),
      });

      return NextResponse.json({
        status: 'succeeded',
        outputUrl: blob.url,
        provider: 'replicate',
      });
    }

    return NextResponse.json({
      status: 'succeeded',
      outputUrl: cachedJob.outputUrl,
      provider: 'replicate',
    });
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    if (!cachedJob.refundedAt && cachedJob.reservationId) {
      await refundEnergy(cachedJob.reservationId, 'lipsync-failed');
      await updateJobCache(predictionId, {
        refundedAt: new Date().toISOString(),
        error: String(prediction.error || 'Lip-Sync fehlgeschlagen'),
      });
    }
    return NextResponse.json({
      status: prediction.status,
      error: cachedJob.error || String(prediction.error) || 'Lip-Sync fehlgeschlagen'
    });
  }

  return NextResponse.json({ status: prediction.status });
}
