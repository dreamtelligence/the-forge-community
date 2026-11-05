import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { reserveEnergy } from '@/lib/finance/energy';
import { expandPrompt } from '@/lib/ai/prompt-engine';
import { IMAGE_MODELS, VIDEO_MODELS, DEFAULT_MODELS } from '@/lib/media-models';
import { estimateVideoCredits } from '@/lib/billing/credit-pricing';
import { buildMarketingMediaReplicateInput } from '@/lib/ai/infrastructure/marketing-media-replicate';
import { normalizeAspectRatio, normalizeDuration } from '@/lib/ai/domain/marketing-media';
import { getReplicateClientForUser } from '@/lib/integrations/provider-keys';

export const runtime = 'nodejs';
export const maxDuration = 60; // Pro models and video need time

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { 
      prompt: rawPrompt, 
      type = 'image', 
      modelKey, 
      aspectRatio = '1:1',
      isForum = false,
      duration,
      generateAudio,
    } = await request.json();

    if (!rawPrompt) {
      return NextResponse.json({ error: 'Prompt fehlt' }, { status: 400 });
    }

    // 1. Resolve Model
    let modelDef = isForum ? DEFAULT_MODELS.forum : (type === 'video' ? DEFAULT_MODELS.studio_video : DEFAULT_MODELS.studio_image);
    
    if (modelKey) {
      const customModel = type === 'video' ? VIDEO_MODELS[modelKey] : IMAGE_MODELS[modelKey];
      if (customModel) modelDef = customModel;
    }

    if (modelDef.provider !== 'replicate') {
      return NextResponse.json({ error: 'Model nicht verfuegbar.' }, { status: 400 });
    }

    // 2. Pricing & User
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, credits: true }
    });

    if (!user) throw new Error('User not found');
    const replicateClientContext = await getReplicateClientForUser(user.id);
    if (!replicateClientContext) {
      return NextResponse.json(
        { error: 'Kein Replicate Key konfiguriert. Bitte BYOK oder Plattform-Key setzen.' },
        { status: 500 }
      );
    }

    const effectiveDuration = normalizeDuration(modelDef.id, typeof duration === 'number' ? duration : undefined);
    const cost = type === 'video'
      ? estimateVideoCredits({
          modelId: modelDef.id,
          durationSeconds: effectiveDuration ?? null,
          generateAudio: typeof generateAudio === 'boolean' ? generateAudio : true,
          fallbackCredits: modelDef.cost,
          minimumCredits: 1,
        }).credits
      : modelDef.cost;

    // 3. Reserve Credits
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: cost,
      feature: `forge.media.${type}.${modelDef.tier}`,
      metadata: { model: modelDef.id, tier: modelDef.tier }
    });

    // 4. Expand Prompt (only if not a tiny request)
    const refinedPrompt = await expandPrompt(rawPrompt, type as 'image' | 'video');

    // 5. Call Replicate - gleicher Input-Builder wie die Marketing-Pipeline (modellspezifische Feldnamen)
    const replicateInput = buildMarketingMediaReplicateInput(modelDef.id, {
      prompt: refinedPrompt,
      aspectRatio: normalizeAspectRatio(modelDef.id, aspectRatio),
      width: 0,
      height: 0,
      duration: effectiveDuration,
      generateAudio: typeof generateAudio === 'boolean' ? generateAudio : undefined,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    const webhookUrl =
      appUrl && appUrl.startsWith('https://') ? `${appUrl}/api/webhooks/replicate` : undefined;

    const prediction = await replicateClientContext.client.predictions.create({
      model: modelDef.id,
      input: replicateInput,
      ...(webhookUrl ? {
        webhook: webhookUrl,
        webhook_events_filter: ['start', 'output', 'logs', 'completed'],
      } : {}),
    });

    // 6. Cache the job (Reuse existing pattern)
    // We use the systemCache to track this prediction
    await prisma.systemCache.create({
      data: {
        key: `replicate:media:${prediction.id}`,
        value: JSON.stringify({
          userId: user.id,
          model: modelDef.id,
          prompt: refinedPrompt,
          rawPrompt,
          cost,
          replicateAuthSource: replicateClientContext.source,
          reservationId: reservation.reservationId,
          type
        }),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h
      }
    });

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
      model: modelDef.label,
      refinedPrompt: refinedPrompt
    });

  } catch (error: any) {
    console.error('Unified Media API Error:', error);
    return NextResponse.json({ error: error.message || 'Generierung fehlgeschlagen' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const predictionId = request.nextUrl.searchParams.get('predictionId');
  if (!predictionId) return NextResponse.json({ error: 'Missing predictionId' }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const cacheRecord = await prisma.systemCache.findUnique({
      where: { key: `replicate:media:${predictionId}` },
      select: { value: true },
    });
    if (!cacheRecord) {
      return NextResponse.json({ error: 'Prediction nicht gefunden' }, { status: 404 });
    }

    let cachedUserId: string | null = null;
    try {
      const parsed = JSON.parse(cacheRecord.value) as { userId?: string };
      cachedUserId = parsed?.userId ?? null;
    } catch {
      cachedUserId = null;
    }

    if (!cachedUserId || cachedUserId !== user.id) {
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

    let assets = null;
    if (prediction.status === 'succeeded' && prediction.output) {
      const outputs = Array.isArray(prediction.output) ? prediction.output : [prediction.output];
      const urls = await Promise.all(
        outputs.map(async (item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const record = item as { url?: string | (() => Promise<string> | string) };
            if (typeof record.url === 'string') return record.url;
            if (typeof record.url === 'function') return await record.url();
          }
          return null;
        })
      );
      assets = urls.filter(Boolean).map((url) => ({ url, type: 'image' }));
    }

    return NextResponse.json({
      status: prediction.status,
      assets,
      error: prediction.error
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
