import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { RateLimiters } from '@/lib/security/rate-limit';
import { consumeHourlyQuota, InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/finance/energy';
import { generateUUID } from '@/lib/utils/uuid';
import { GEMINI_TEXT_MODELS, pickModel, withGeminiThinking } from '@/lib/ai/text-models';

export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const parseLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
};

const COST = parseLimit(process.env.MARKETING_CHARACTER_DNA_CREDITS, 2);
const HOURLY_LIMIT = parseLimit(process.env.MARKETING_CHARACTER_DNA_HOURLY_LIMIT, 30);

const MODEL = pickModel(process.env.GEMINI_CHARACTER_MODEL, process.env.GEMINI_MODEL, GEMINI_TEXT_MODELS.flash);
// v1beta: thinkingConfig ist dort dokumentiert
const API_VERSION = process.env.GEMINI_CHARACTER_API_VERSION || 'v1beta';

const CHARACTER_PROMPT = `Analyze the provided portrait(s) and write a compact image-generation prompt that recreates the face faithfully.\n\nRequirements:\n- If multiple images are provided, synthesize the consistent features across them.\n- Describe only visible physical attributes (face shape, jawline, cheekbones, eyes, eyebrows, nose, lips, hair style/color/texture, complexion, age range, expression).\n- Do NOT guess ethnicity, nationality, religion, gender, identity, or name.\n- Keep it concise: one comma-separated line, no full sentences, no quotes.\n- Add short camera/style notes: studio portrait, soft lighting, shallow depth of field, high detail.\n\nOutput only the prompt line.`;

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && 'type' in value);
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

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY fehlt' }, { status: 500 });
  }

  const { id: ventureId } = await params;
  const formData = await request.formData();
  const images = formData.getAll('images');
  const singleImage = formData.get('image');

  const files: File[] = [];
  if (images.length > 0) {
    if (!images.every(isFileLike)) {
      return NextResponse.json({ error: 'Ungültige Bilddaten.' }, { status: 415 });
    }
    files.push(...(images as File[]));
  } else if (isFileLike(singleImage)) {
    files.push(singleImage as File);
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'Bitte lade 1-3 Portraitbilder hoch.' }, { status: 400 });
  }
  if (files.length > 3) {
    return NextResponse.json({ error: 'Maximal 3 Bilder erlaubt.' }, { status: 400 });
  }

  for (const image of files) {
    if (image.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Bild ist zu groß (max 10MB).' }, { status: 413 });
    }
    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return NextResponse.json({ error: 'Ungültiges Bildformat (JPG/PNG/WebP).' }, { status: 415 });
    }
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
    select: { id: true, name: true }
  });

  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  let reservationId: string | null = null;
  const requestId = request.headers.get('x-request-id') || generateUUID();

  try {
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: COST,
      feature: 'marketing.character-dna',
      requestId,
      metadata: { ventureId, model: MODEL, cost: COST }
    });
    reservationId = reservation.reservationId;

    const hourlyQuota = await consumeHourlyQuota({
      userId: user.id,
      feature: 'marketing.character-dna',
      limit: HOURLY_LIMIT
    });

    if (!hourlyQuota.allowed) {
      await refundEnergy(reservationId, 'hourly-rate-limit');
      return NextResponse.json({
        error: 'Stundenlimit erreicht.',
        retryAfter: Math.ceil((hourlyQuota.resetAt.getTime() - Date.now()) / 1000)
      }, { status: 429 });
    }

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: CHARACTER_PROMPT }
    ];

    for (const image of files) {
      const buffer = Buffer.from(await image.arrayBuffer());
      parts.push({
        inline_data: {
          mime_type: image.type,
          data: buffer.toString('base64')
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY || ''
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 400,
            ...withGeminiThinking(MODEL)
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.error || 'Gemini request failed';
      throw new Error(errorMessage);
    }

    const responseParts = data?.candidates?.[0]?.content?.parts || [];
    const text = responseParts.map((part: any) => part?.text).filter(Boolean).join(' ').trim();

    if (!text) {
      const blockReason = data?.promptFeedback?.blockReason || data?.promptFeedback?.block_reason;
      if (blockReason) {
        throw new Error(`Gemini blockiert: ${blockReason}`);
      }
      throw new Error('Kein Prompt-Output erhalten.');
    }

    const finalPrompt = text.replace(/\s+/g, ' ').trim();

    const existing = await prisma.brandDNA.findUnique({
      where: { ventureId }
    });

    if (existing) {
      await prisma.brandDNA.update({
        where: { ventureId },
        data: { characterPrompt: finalPrompt }
      });
    } else {
      await prisma.brandDNA.create({
        data: {
          ventureId,
          brandName: venture.name || 'Untitled Venture',
          characterPrompt: finalPrompt
        }
      });
    }

    const usageMeta = data?.usageMetadata;
    const settlement = reservationId
      ? await settleEnergy({
          reservationId,
          finalCost: COST,
          provider: 'gemini',
          model: MODEL,
          usage: usageMeta ? {
            promptTokens: usageMeta.promptTokenCount,
            completionTokens: usageMeta.candidatesTokenCount,
            totalTokens: usageMeta.totalTokenCount
          } : undefined,
          metadata: { ventureId }
        })
      : null;

    return NextResponse.json({
      characterPrompt: finalPrompt,
      model: MODEL,
      creditsUsed: COST,
      creditsRemaining: settlement?.creditsRemaining ?? null
    });
  } catch (error: any) {
    if (reservationId) await refundEnergy(reservationId, 'character-dna-failed');
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
    console.error('Character DNA error:', error);
    return NextResponse.json({ error: error.message || 'Character DNA fehlgeschlagen' }, { status: 500 });
  }
}
