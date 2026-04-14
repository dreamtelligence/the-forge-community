import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { consumeHourlyQuota, InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/finance/energy';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_CONFIG_ERROR = 'ELEVENLABS_NOT_CONFIGURED';

const parseLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
};

const SFX_COST = parseLimit(process.env.MARKETING_SFX_CREDITS, 3);
const HOURLY_SFX_LIMIT = parseLimit(process.env.MARKETING_SFX_HOURLY_LIMIT, 40);

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');
const isMissingElevenLabsKeyError = (error: unknown) =>
  error instanceof Error && error.message === 'ElevenLabs API Key fehlt';

const elevenLabsNotConfiguredResponse = () =>
  NextResponse.json(
    {
      error: 'Voice Provider ist nicht konfiguriert (ELEVENLABS_API_KEY fehlt).',
      code: ELEVENLABS_CONFIG_ERROR
    },
    { status: 503 }
  );

const elevenlabsRequest = async (path: string, options: RequestInit) => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API Key fehlt');
  }
  const res = await fetch(`${ELEVENLABS_API_URL}${path}`, {
    ...options,
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      ...(options.headers || {})
    }
  });
  return res;
};

const resolveAudioExt = (contentType: string | null, outputFormat: string | undefined) => {
  if (outputFormat?.startsWith('wav')) return 'wav';
  if (outputFormat?.startsWith('mp3')) return 'mp3';
  if (contentType?.includes('wav')) return 'wav';
  if (contentType?.includes('mpeg') || contentType?.includes('mp3')) return 'mp3';
  if (contentType?.includes('ogg')) return 'ogg';
  return 'mp3';
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (!ELEVENLABS_API_KEY) {
    return elevenLabsNotConfiguredResponse();
  }

  const { id } = await params;
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request' }, { status: 400 });
  }

  const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
  const outputFormat = typeof payload?.outputFormat === 'string' ? payload.outputFormat.trim() : 'mp3_44100_128';
  const originTag = typeof payload?.originTag === 'string' ? payload.originTag.trim() : undefined;

  if (!text) {
    return NextResponse.json({ error: 'Beschreibung fehlt.' }, { status: 400 });
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
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: SFX_COST,
      feature: 'marketing.voice.sfx',
      requestId,
      metadata: { ventureId: id }
    });
    reservationId = reservation.reservationId;

    const quota = await consumeHourlyQuota({
      userId: user.id,
      feature: 'marketing.voice.sfx',
      limit: HOURLY_SFX_LIMIT
    });

    if (!quota.allowed) {
      await refundEnergy(reservationId, 'rate-limit');
      return NextResponse.json({ error: 'Stundenlimit erreicht.' }, { status: 429 });
    }

    const path = `/sound-generation${outputFormat ? `?output_format=${outputFormat}` : ''}`;

    const response = await elevenlabsRequest(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.detail || errorData?.error || 'Sound-Generierung fehlgeschlagen.';
      if (reservationId) {
        await refundEnergy(reservationId, `provider-${response.status}`);
        reservationId = null;
      }
      return NextResponse.json({ error: message, providerStatus: response.status }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const ext = resolveAudioExt(contentType, outputFormat);
    const safeName = sanitizeFilename(`sfx-${text.slice(0, 32)}`);
    const filename = `marketing/${user.id}/${Date.now()}-${safeName}.${ext}`;

    const blob = await put(filename, audioBuffer, {
      access: 'public',
      contentType,
    });

    const asset = await prisma.mediaAsset.create({
      data: {
        ventureId: id,
        ownerId: user.id,
        type: 'AUDIO',
        url: blob.url,
        filename,
        mimeType: contentType,
        size: audioBuffer.length,
        source: 'GENERATED',
        prompt: text,
        model: 'elevenlabs-sfx',
        tags: ['audio', 'sfx', 'elevenlabs', ...(originTag ? [originTag] : [])]
      }
    });

    const settlement = reservationId
      ? await settleEnergy({
          reservationId,
          finalCost: SFX_COST,
          provider: 'elevenlabs',
          model: 'sound-generation',
          metadata: { outputFormat }
        })
      : null;

    return NextResponse.json({
      asset,
      creditsUsed: SFX_COST,
      creditsRemaining: settlement?.creditsRemaining ?? null
    });
  } catch (error: any) {
    if (reservationId) await refundEnergy(reservationId, 'sfx-failed');
    if (isMissingElevenLabsKeyError(error)) {
      return elevenLabsNotConfiguredResponse();
    }
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
    console.error('ElevenLabs SFX error:', error);
    return NextResponse.json({ error: error.message || 'Sound-Generierung fehlgeschlagen' }, { status: 500 });
  }
}
