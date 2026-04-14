import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';
import { put } from '@vercel/blob';
import { consumeHourlyQuota, InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/finance/energy';
import { generateUUID } from '@/lib/utils/uuid';
import { GOOGLE_AI_STUDIO_KEY_ENV_HINT, resolveGoogleAIStudioApiKey } from '@/lib/ai/google';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_PROMPT = 'High-quality marketing photo, cohesive lighting, premium aesthetic';

const MAX_PROMPT_CHARS = Number.isFinite(Number(process.env.MARKETING_MEDIA_MAX_PROMPT_CHARS))
  ? Math.max(1, Number(process.env.MARKETING_MEDIA_MAX_PROMPT_CHARS))
  : 1200;

const HOURLY_LIMIT = Number.isFinite(Number(process.env.MARKETING_MEDIA_IMAGE_HOURLY_LIMIT))
  ? Math.max(0, Math.floor(Number(process.env.MARKETING_MEDIA_IMAGE_HOURLY_LIMIT)))
  : 50;
const PROVIDER_COST_EUR_PER_RUN = Number.isFinite(Number(process.env.NANO_BANANA_PROVIDER_COST_EUR))
  ? Math.max(0, Number(process.env.NANO_BANANA_PROVIDER_COST_EUR))
  : 0;

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

const MODEL_STANDARD_CANDIDATES = parseModelCandidates(
  process.env.GEMINI_IMAGE_MODEL,
  ['gemini-2.5-flash-image-preview', 'gemini-2.5-flash-image']
);

const MODEL_PRO_CANDIDATES = parseModelCandidates(
  process.env.GEMINI_IMAGE_MODEL_PRO,
  ['gemini-2.5-flash-image-preview']
);
const API_VERSION = process.env.GEMINI_IMAGE_API_VERSION || 'v1beta';

const MODE_TEXT = 'text-to-image';
const MODE_IMAGE = 'image-to-image';
const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '4:5', '9:16', '16:9', '3:2']);

type NanoMode = typeof MODE_TEXT | typeof MODE_IMAGE;

const resolveMode = (value: string): NanoMode | null => {
  if (value === MODE_TEXT || value === MODE_IMAGE) return value;
  return null;
};

const isModelNotFoundMessage = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes('not_found') ||
    (lower.includes('model') && lower.includes('not found')) ||
    lower.includes('is not found for api version')
  );
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && 'type' in value);
};

const mimeToExt = (mimeType: string | null) => {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/png':
    default:
      return 'png';
  }
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

  const { id } = await params;
  const formData = await request.formData();
  const modeValue = String(formData.get('mode') || '').trim();
  const mode = resolveMode(modeValue);
  const modelValue = String(formData.get('model') || '').trim();
  const promptRaw = String(formData.get('prompt') || '').trim();
  const aspectRatioRaw = String(formData.get('aspectRatio') || '').trim();
  const originTag = String(formData.get('originTag') || '').trim().toLowerCase();
  const extraTags = originTag && /^[a-z0-9-]+$/.test(originTag) ? [originTag] : [];

  if (!mode) {
    return NextResponse.json({ error: 'Ungültiger Modus.' }, { status: 400 });
  }

  let aspectRatio: string | null = '1:1';
  if (aspectRatioRaw) {
    if (aspectRatioRaw === 'match_input_image' && mode === MODE_IMAGE) {
      aspectRatio = null;
    } else if (ALLOWED_ASPECT_RATIOS.has(aspectRatioRaw)) {
      aspectRatio = aspectRatioRaw;
    } else {
      return NextResponse.json({ error: 'Ungültiges Aspect Ratio.' }, { status: 400 });
    }
  }

  const modelCandidates =
    modelValue === 'google/nano-banana-pro' || modelValue === 'nano-banana-pro'
      ? MODEL_PRO_CANDIDATES
      : MODEL_STANDARD_CANDIDATES;
  const modelTag =
    modelValue === 'google/nano-banana-pro' || modelValue === 'nano-banana-pro'
      ? 'nano-banana-pro'
      : 'nano-banana';
  const requestedModelId = modelCandidates[0];

  if (promptRaw.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: 'Prompt ist zu lang.' }, { status: 400 });
  }

  const imageFiles = formData.getAll('images');
  if (mode === MODE_IMAGE) {
    if (imageFiles.length < 1 || imageFiles.length > 3) {
      return NextResponse.json({ error: 'Bitte lade 1-3 Referenzbilder hoch.' }, { status: 400 });
    }
    if (!imageFiles.every(isFileLike)) {
      return NextResponse.json({ error: 'Ungültige Bilddaten.' }, { status: 415 });
    }
  } else if (!promptRaw) {
    return NextResponse.json({ error: 'Bitte gib einen Prompt an.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const venture = await prisma.venture.findFirst({
    where: { id, ownerId: user.id }
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  let reservationId: string | null = null;
  const requestId = request.headers.get('x-request-id') || generateUUID();
  const cost = 5;

  try {
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: cost,
      feature: 'marketing.media',
      requestId,
      metadata: {
        ventureId: id,
        mode,
        cost,
        model: requestedModelId,
        providerCostEur: PROVIDER_COST_EUR_PER_RUN > 0 ? PROVIDER_COST_EUR_PER_RUN : undefined,
      }
    });
    reservationId = reservation.reservationId;

    const { checkDailyImageQuota } = await import('@/lib/finance/energy');
    const dailyQuota = await checkDailyImageQuota(user.id);
    if (!dailyQuota.allowed) {
      await refundEnergy(reservationId, 'daily-quota-exceeded');
      return NextResponse.json({
        error: `Tageslimit für Bild-Generierung erreicht (${dailyQuota.limit}/Tag). Nächster Reset: ${dailyQuota.resetAt.toLocaleTimeString('de-DE')}`,
        quota: {
          type: 'image',
          limit: dailyQuota.limit,
          remaining: dailyQuota.remaining,
          resetAt: dailyQuota.resetAt.toISOString()
        }
      }, { status: 429 });
    }

    const hourlyQuota = await consumeHourlyQuota({
      userId: user.id,
      feature: 'marketing.media.image',
      limit: HOURLY_LIMIT
    });

    if (!hourlyQuota.allowed) {
      await refundEnergy(reservationId, 'hourly-rate-limit');
      return NextResponse.json({
        error: 'Stundenlimit erreicht.',
        retryAfter: Math.ceil((hourlyQuota.resetAt.getTime() - Date.now()) / 1000)
      }, { status: 429 });
    }

    const prompt = promptRaw || DEFAULT_PROMPT;
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    if (prompt) parts.push({ text: prompt });

    if (mode === MODE_IMAGE) {
      for (const file of imageFiles as File[]) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`Bild "${file.name}" ist zu groß.`);
        }
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
          throw new Error(`Ungültiger Typ für "${file.name}".`);
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        parts.push({
          inline_data: {
            mime_type: file.type,
            data: buffer.toString('base64'),
          }
        });
      }
    }

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(aspectRatio ? { imageConfig: { aspectRatio } } : {})
      }
    };

    let data: any = null;
    let resolvedModelId = requestedModelId;
    let lastModelNotFoundError = '';
    for (const candidateModel of modelCandidates) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${API_VERSION}/models/${candidateModel}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': googleKey.key,
          },
          body: JSON.stringify(requestBody)
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        data = payload;
        resolvedModelId = candidateModel;
        break;
      }

      const errorMessage =
        payload?.error?.message || payload?.error || 'Nano Banana request failed';
      if (isModelNotFoundMessage(String(errorMessage))) {
        lastModelNotFoundError = String(errorMessage);
        continue;
      }
      throw new Error(String(errorMessage));
    }

    if (!data) {
      throw new Error(lastModelNotFoundError || 'Kein kompatibles Nano-Banana Modell gefunden.');
    }

    const responseParts = data?.candidates?.[0]?.content?.parts || [];
    const imageParts = responseParts.filter((part: any) =>
      part?.inline_data?.data || part?.inlineData?.data
    );

    if (!imageParts.length) {
      const blockReason = data?.promptFeedback?.blockReason || data?.promptFeedback?.block_reason;
      if (blockReason) {
        throw new Error(`Gemini blockiert: ${blockReason}`);
      }
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason) {
        throw new Error(`Kein Bild-Output (finishReason: ${finishReason}).`);
      }
      throw new Error('Kein Bild-Output erhalten.');
    }

    const assets = await Promise.all(
      imageParts.map(async (part: any, index: number) => {
        const inline = part.inline_data || part.inlineData;
        const mimeType = inline?.mime_type || inline?.mimeType || 'image/png';
        const ext = mimeToExt(mimeType);
        const buffer = Buffer.from(inline?.data || '', 'base64');
        if (!buffer.length) throw new Error('Leeres Bild empfangen.');

        const filename = `marketing/${user.id}/${Date.now()}-nano-banana-${index}.${ext}`;
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: mimeType,
        });

        const created = await prisma.mediaAsset.create({
          data: {
            ventureId: id,
            ownerId: user.id,
            type: 'IMAGE',
            url: blob.url,
            filename,
            mimeType,
            size: buffer.length,
            source: 'GENERATED',
            prompt,
            model: resolvedModelId,
            tags: [mode, 'google', modelTag, ...extraTags]
          },
          select: {
            id: true,
            url: true,
            type: true,
            isPublic: true
          }
        });

        return {
          id: created.id,
          url: created.url,
          type: 'image' as const,
          isPublic: created.isPublic
        };
      })
    );

    const settlement = reservationId
      ? await settleEnergy({
          reservationId,
          finalCost: cost,
          provider: 'google',
          model: resolvedModelId,
          metadata: {
            providerCostEur: PROVIDER_COST_EUR_PER_RUN > 0 ? PROVIDER_COST_EUR_PER_RUN : undefined,
          }
        })
      : null;

    return NextResponse.json({
      status: 'succeeded',
      assets,
      provider: 'google',
      creditsUsed: cost,
      creditsRemaining: settlement?.creditsRemaining ?? null
    });
  } catch (error: unknown) {
    if (reservationId) await refundEnergy(reservationId, 'generation-failed');
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
    const message = error instanceof Error ? error.message : String(error || 'Generation failed');
    console.error('Nano Banana Error:', error);
    return NextResponse.json(
      { error: message || 'Generation failed' },
      { status: isModelNotFoundMessage(message) ? 502 : 500 }
    );
  }
}
