import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { consumeHourlyQuota, InsufficientEnergyError, reserveEnergy, refundEnergy, settleEnergy } from '@/lib/finance/energy';
import { estimateElevenLabsTtsCredits } from '@/lib/billing/credit-pricing';
import { put } from '@vercel/blob';
import { generateUUID } from '@/lib/utils/uuid';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_CONFIG_ERROR = 'ELEVENLABS_NOT_CONFIGURED';

const parseLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
};

const MAX_TTS_CHARS = parseLimit(process.env.MARKETING_VOICE_MAX_CHARS, 5000);
const VOICE_COST_FALLBACK = parseLimit(process.env.MARKETING_VOICE_CREDITS, 5);
const HOURLY_VOICE_LIMIT = parseLimit(process.env.MARKETING_VOICE_HOURLY_LIMIT, 40);

const clamp01 = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
};

const MODEL_ALIASES: Record<string, string> = {
  eleven_v2_5_flash: 'eleven_flash_v2_5',
  eleven_v2_flash: 'eleven_flash_v2',
};

const normalizeElevenModelId = (value: string) => MODEL_ALIASES[value] || value;

const extractElevenLabsError = (errorData: any): string => {
  if (!errorData) return 'ElevenLabs Anfrage fehlgeschlagen.';

  if (typeof errorData === 'string') return errorData;
  if (typeof errorData?.detail === 'string') return errorData.detail;
  if (typeof errorData?.error === 'string') return errorData.error;

  if (errorData?.detail && typeof errorData.detail === 'object') {
    if (typeof errorData.detail?.message === 'string') return errorData.detail.message;
    if (typeof errorData.detail?.error === 'string') return errorData.detail.error;
    return JSON.stringify(errorData.detail);
  }

  if (errorData?.error && typeof errorData.error === 'object') {
    if (typeof errorData.error?.message === 'string') return errorData.error.message;
    return JSON.stringify(errorData.error);
  }

  return 'ElevenLabs Anfrage fehlgeschlagen.';
};

const resolveAudioExt = (contentType: string | null, outputFormat: string | undefined) => {
  if (outputFormat?.startsWith('wav')) return 'wav';
  if (outputFormat?.startsWith('mp3')) return 'mp3';
  if (contentType?.includes('wav')) return 'wav';
  if (contentType?.includes('mpeg') || contentType?.includes('mp3')) return 'mp3';
  if (contentType?.includes('ogg')) return 'ogg';
  return 'mp3';
};

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
  
  const url = `${ELEVENLABS_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    cache: 'no-store', // Ensure we don't cache API errors or old results
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    console.error(`ElevenLabs API 401 Unauthorized for ${path}. Key might be invalid.`);
  } else if (!res.ok) {
    console.error(`ElevenLabs API Error ${res.status} for ${path}`);
  }

  return res;
};

export async function GET(
  _req: NextRequest
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (!ELEVENLABS_API_KEY) {
    return elevenLabsNotConfiguredResponse();
  }

  try {
    const voicesRes = await elevenlabsRequest('/voices', { method: 'GET' });
    const modelsRes = await elevenlabsRequest('/models', { method: 'GET' });

    const voicesData = await voicesRes.json().catch(() => ({}));
    const modelsData = await modelsRes.json().catch(() => ([]));

    if (!voicesRes.ok) {
      const detail = extractElevenLabsError(voicesData);
      console.error(`ElevenLabs voices error [${voicesRes.status}]:`, detail);
      
      // If it's an auth error from upstream, report it as 401 to help debugging
      const status = voicesRes.status === 401 ? 401 : 502;
      return NextResponse.json({ 
        error: detail, 
        providerStatus: voicesRes.status,
        message: voicesRes.status === 401 ? 'ElevenLabs API Key ist ungültig oder abgelaufen.' : detail
      }, { status });
    }
    if (!modelsRes.ok) {
      const detail = extractElevenLabsError(modelsData);
      console.error(`ElevenLabs models error [${modelsRes.status}]:`, detail);
      
      const status = modelsRes.status === 401 ? 401 : 502;
      return NextResponse.json({ 
        error: detail, 
        providerStatus: modelsRes.status,
        message: modelsRes.status === 401 ? 'ElevenLabs API Key ist ungültig oder abgelaufen.' : detail
      }, { status });
    }

    const voices = Array.isArray(voicesData?.voices) ? voicesData.voices : [];
    const models = Array.isArray(modelsData)
      ? modelsData.filter((model: any) => model?.can_do_text_to_speech)
      : [];

    return NextResponse.json({
      voices,
      models,
    });
  } catch (error: any) {
    if (isMissingElevenLabsKeyError(error)) {
      return elevenLabsNotConfiguredResponse();
    }
    console.error('ElevenLabs meta fetch failed:', error);
    return NextResponse.json({ error: error.message || 'ElevenLabs API Fehler' }, { status: 500 });
  }
}

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
  console.log(`[VOICE] Starting POST request for venture ${id}`);

  let payload: any;
  try {
    payload = await request.json();
    console.log(`[VOICE] Payload received:`, { 
      textLength: payload?.text?.length, 
      voiceId: payload?.voiceId,
      modelId: payload?.modelId 
    });
  } catch (err) {
    console.error(`[VOICE] Failed to parse JSON payload:`, err);
    return NextResponse.json({ error: 'Ungültiger Request' }, { status: 400 });
  }

  const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
  const voiceId = typeof payload?.voiceId === 'string' ? payload.voiceId.trim() : '';
  const modelId = typeof payload?.modelId === 'string' ? payload.modelId.trim() : '';
  const outputFormat = typeof payload?.outputFormat === 'string' ? payload.outputFormat.trim() : 'mp3_44100_128';
  const languageCode = typeof payload?.languageCode === 'string' ? payload.languageCode.trim() : undefined;
  const originTag = typeof payload?.originTag === 'string' ? payload.originTag.trim() : undefined;
  const voiceMultiplierRaw = Number(payload?.voiceCreditMultiplier);
  const voiceMultiplier = Number.isFinite(voiceMultiplierRaw) && voiceMultiplierRaw > 0 ? voiceMultiplierRaw : 1;

  if (!text) {
    return NextResponse.json({ error: 'Text fehlt.' }, { status: 400 });
  }
  if (text.length > MAX_TTS_CHARS) {
    return NextResponse.json({ error: 'Text ist zu lang.' }, { status: 400 });
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

  const voiceProfile = (prisma as any).voiceProfile;
  const profile = voiceProfile
    ? await voiceProfile.findUnique({ where: { ventureId: id } })
    : null;

  const resolvedVoiceId = voiceId || profile?.voiceId || '';
  const resolvedModelId = normalizeElevenModelId(modelId || profile?.modelId || 'eleven_multilingual_v2');
  const dictionaryId = typeof payload?.pronunciationDictionaryId === 'string'
    ? payload.pronunciationDictionaryId.trim()
    : profile?.pronunciationDictionaryId || '';
  const dictionaryVersionId = typeof payload?.pronunciationDictionaryVersionId === 'string'
    ? payload.pronunciationDictionaryVersionId.trim()
    : profile?.pronunciationDictionaryVersionId || '';

  if (!resolvedVoiceId) {
    return NextResponse.json({ error: 'Bitte wähle eine Stimme.' }, { status: 400 });
  }

  const pricingEstimate = estimateElevenLabsTtsCredits({
    textLength: text.length,
    modelId: resolvedModelId,
    voiceMultiplier,
    minimumCredits: 1
  });
  const creditCost = pricingEstimate.credits || VOICE_COST_FALLBACK;

  let reservationId: string | null = null;
  const requestId = request.headers.get('x-request-id') || generateUUID();

  try {
    // Step 1: Reserve credits (fail fast if insufficient)
    const reservation = await reserveEnergy({
      userId: user.id,
      amount: creditCost,
      feature: 'marketing.voice',
      requestId,
      metadata: {
        ventureId: id,
        model: resolvedModelId,
        voiceId: resolvedVoiceId,
        elevenCredits: pricingEstimate.elevenCredits,
        costEur: pricingEstimate.costEur,
        perCharCredits: pricingEstimate.perCharCredits
      }
    });
    reservationId = reservation.reservationId;

    // Step 2: Check hourly quota (existing protection)
    const hourlyQuota = await consumeHourlyQuota({
      userId: user.id,
      feature: 'marketing.voice.audio',
      limit: HOURLY_VOICE_LIMIT
    });

    if (!hourlyQuota.allowed) {
      await refundEnergy(reservationId, 'hourly-rate-limit');
      return NextResponse.json({
        error: 'Stundenlimit erreicht.',
        retryAfter: Math.ceil((hourlyQuota.resetAt.getTime() - Date.now()) / 1000)
      }, { status: 429 });
    }

    // Step 3: Check daily quota (NEW: prevent abuse)
    try {
      const { checkDailyVoiceQuota } = await import('@/lib/finance/energy');
      const dailyQuota = await checkDailyVoiceQuota(user.id);

      if (!dailyQuota.allowed) {
        await refundEnergy(reservationId, 'daily-quota-exceeded');
        return NextResponse.json({
          error: `Tageslimit erreicht (${dailyQuota.limit} Generierungen/Tag). Nächster Reset: ${dailyQuota.resetAt.toLocaleTimeString('de-DE')}`,
          quota: {
            limit: dailyQuota.limit,
            remaining: dailyQuota.remaining,
            resetAt: dailyQuota.resetAt.toISOString()
          }
        }, { status: 429 });
      }
    } catch (quotaError) {
      console.error('[VOICE] Daily quota check failed (skipping):', quotaError);
      // We continue if quota check fails to not block users on internal errors
    }

    const rawVoiceSettings = payload?.voiceSettings && typeof payload.voiceSettings === 'object'
      ? payload.voiceSettings
      : profile?.voiceSettings;

    const voiceSettings = rawVoiceSettings && typeof rawVoiceSettings === 'object'
      ? {
          stability: clamp01((rawVoiceSettings as any).stability, 0.4),
          similarity_boost: clamp01((rawVoiceSettings as any).similarity_boost, 0.8),
          style: clamp01((rawVoiceSettings as any).style, 0.2),
          use_speaker_boost: Boolean((rawVoiceSettings as any).use_speaker_boost)
        }
      : undefined;

    const requestBody: Record<string, any> = {
      text,
      model_id: resolvedModelId,
    };
    if (languageCode) requestBody.language_code = languageCode;
    if (voiceSettings) requestBody.voice_settings = voiceSettings;
    if (dictionaryId && dictionaryVersionId) {
      requestBody.pronunciation_dictionary_locators = [
        {
          pronunciation_dictionary_id: dictionaryId,
          version_id: dictionaryVersionId
        }
      ];
    }

    const path = `/text-to-speech/${resolvedVoiceId}${outputFormat ? `?output_format=${outputFormat}` : ''}`;

    console.log(`[VOICE] Calling ElevenLabs API: ${path}`);
    const response = await elevenlabsRequest(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify(requestBody)
    });
    console.log(`[VOICE] ElevenLabs response status: ${response.status}`);

    if (!response.ok) {
      const rawErrorText = await response.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = rawErrorText ? JSON.parse(rawErrorText) : {};
      } catch {
        errorData = rawErrorText || {};
      }

      const message = extractElevenLabsError(errorData);

      if (reservationId) {
        await refundEnergy(reservationId, `provider-${response.status}`);
        reservationId = null;
      }
      
      const status = response.status === 401 ? 401 : 502;
      return NextResponse.json({ 
        error: message, 
        providerStatus: response.status,
        message: response.status === 401 ? 'ElevenLabs API Key ist ungültig oder abgelaufen.' : message
      }, { status });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const ext = resolveAudioExt(contentType, outputFormat);
    const safeName = sanitizeFilename(`voice-${resolvedVoiceId}`);
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
        model: resolvedModelId,
        tags: ['audio', 'voice', 'elevenlabs', ...(originTag ? [originTag] : [])]
      }
    });

    const settlement = reservationId
      ? await settleEnergy({
          reservationId,
          finalCost: creditCost,
          provider: 'elevenlabs',
          model: resolvedModelId,
          metadata: {
            voiceId: resolvedVoiceId,
            outputFormat,
            characters: text.length,
            elevenCredits: pricingEstimate.elevenCredits,
            costEur: pricingEstimate.costEur,
            perCharCredits: pricingEstimate.perCharCredits
          }
        })
      : null;

    return NextResponse.json({
      asset,
      creditsUsed: creditCost,
      creditsRemaining: settlement?.creditsRemaining ?? null
    });
  } catch (error: any) {
    if (reservationId) await refundEnergy(reservationId, 'voice-failed');
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
    console.error('ElevenLabs voice error:', error);
    return NextResponse.json({ error: error.message || 'Voice-Generierung fehlgeschlagen' }, { status: 500 });
  }
}
