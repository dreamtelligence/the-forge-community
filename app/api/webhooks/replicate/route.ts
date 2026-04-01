import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { settleEnergy, refundEnergy } from '@/lib/energy';

// We need the raw body for signature verification
export const dynamic = 'force-dynamic';

const JOB_TTL_MS = 1000 * 60 * 60 * 6;
const PROCESSING_LOCK_TTL_MS = 1000 * 60 * 10;
const WEBHOOK_TOLERANCE_SECONDS = 60 * 5;
const OUTPUT_FETCH_TIMEOUT_MS = 1000 * 60 * 2;
const jobKeyForPrediction = (predictionId: string) => `replicate:media:${predictionId}`;
const faceSwapJobKeyForPrediction = (predictionId: string) => `faceswap:${predictionId}`;
const motionTransferJobKeyForPrediction = (predictionId: string) => `motion-transfer:${predictionId}`;

const readJobCache = async (predictionId: string) => {
  const record = await prisma.systemCache.findUnique({ where: { key: jobKeyForPrediction(predictionId) } });
  if (!record) return null;
  try {
    return JSON.parse(record.value);
  } catch (_error) {
    return null;
  }
};

const writeJobCache = async (predictionId: string, payload: any) => {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  await prisma.systemCache.upsert({
    where: { key: jobKeyForPrediction(predictionId) },
    update: { value: JSON.stringify(payload), expiresAt },
    create: { key: jobKeyForPrediction(predictionId), value: JSON.stringify(payload), expiresAt },
  });
};

const updateJobCache = async (predictionId: string, updates: any) => {
  const existing = await readJobCache(predictionId);
  if (!existing) return null;
  const next = { ...existing, ...updates };
  await writeJobCache(predictionId, next);
  return next;
};

const readFaceSwapJobCache = async (predictionId: string) => {
  const record = await prisma.systemCache.findUnique({ where: { key: faceSwapJobKeyForPrediction(predictionId) } });
  if (!record) return null;
  try {
    return JSON.parse(record.value);
  } catch (_error) {
    return null;
  }
};

const writeFaceSwapJobCache = async (predictionId: string, payload: any) => {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  await prisma.systemCache.upsert({
    where: { key: faceSwapJobKeyForPrediction(predictionId) },
    update: { value: JSON.stringify(payload), expiresAt },
    create: { key: faceSwapJobKeyForPrediction(predictionId), value: JSON.stringify(payload), expiresAt },
  });
};

const updateFaceSwapJobCache = async (predictionId: string, updates: any) => {
  const existing = await readFaceSwapJobCache(predictionId);
  if (!existing) return null;
  const next = { ...existing, ...updates };
  await writeFaceSwapJobCache(predictionId, next);
  return next;
};

const readMotionTransferJobCache = async (predictionId: string) => {
  const record = await prisma.systemCache.findUnique({ where: { key: motionTransferJobKeyForPrediction(predictionId) } });
  if (!record) return null;
  try {
    return JSON.parse(record.value);
  } catch (_error) {
    return null;
  }
};

const writeMotionTransferJobCache = async (predictionId: string, payload: any) => {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  await prisma.systemCache.upsert({
    where: { key: motionTransferJobKeyForPrediction(predictionId) },
    update: { value: JSON.stringify(payload), expiresAt },
    create: { key: motionTransferJobKeyForPrediction(predictionId), value: JSON.stringify(payload), expiresAt },
  });
};

const updateMotionTransferJobCache = async (predictionId: string, updates: any) => {
  const existing = await readMotionTransferJobCache(predictionId);
  if (!existing) return null;
  const next = { ...existing, ...updates };
  await writeMotionTransferJobCache(predictionId, next);
  return next;
};

const normalizeOutputUrl = async (item: unknown) => {
  if (!item) return null;
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    const record = item as { url?: string | (() => Promise<string> | string) };
    if (typeof record.url === 'string') return record.url;
    if (typeof record.url === 'function') return await record.url();
  }
  return null;
};

const extractOutputUrls = async (output: unknown) => {
  if (!output) return [];
  if (Array.isArray(output)) {
    const urls = await Promise.all(output.map((item) => normalizeOutputUrl(item)));
    return urls.filter(Boolean) as string[];
  }
  const single = await normalizeOutputUrl(output);
  return single ? [single] : [];
};

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = OUTPUT_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeProcessingError = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    const serialized = JSON.stringify(value);
    return serialized === '{}' ? null : serialized;
  } catch {
    return null;
  }
};

const getContentInfo = (contentType: string | null, fallbackType: 'image' | 'video') => {
  if (contentType?.includes('image/jpeg') || contentType?.includes('image/jpg')) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (contentType?.includes('image/webp')) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  if (contentType?.includes('image/png')) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (contentType?.includes('video/mp4')) {
    return { contentType: 'video/mp4', ext: 'mp4' };
  }
  if (fallbackType === 'video') {
    return { contentType: 'video/mp4', ext: 'mp4' }; 
  }
  return { contentType: 'image/png', ext: 'png' };
};

const getAspectDimensions = (aspectRatio: string, isVideo: boolean) => {
  switch (aspectRatio) {
    case '16:9': return isVideo ? { width: 1280, height: 720 } : { width: 1024, height: 576 };
    case '9:16': return isVideo ? { width: 720, height: 1280 } : { width: 576, height: 1024 };
    case '4:5': return isVideo ? { width: 720, height: 900 } : { width: 1024, height: 1280 };
    case '3:2': return isVideo ? { width: 1280, height: 853 } : { width: 1152, height: 768 };
    default: return { width: 1024, height: 1024 };
  }
};

const isFreshLock = (lockId?: string | null, lockAt?: string | null) => {
  if (!lockId || !lockAt) return false;
  const lockTime = Date.parse(lockAt);
  if (Number.isNaN(lockTime)) return false;
  return Date.now() - lockTime < PROCESSING_LOCK_TTL_MS;
};

const acquireProcessingLock = async (predictionId: string, holder: string) => {
  const current = await readJobCache(predictionId);
  if (!current) return null;
  if (isFreshLock(current.processingId, current.processingAt)) return null;

  const lockId = crypto.randomUUID();
  await updateJobCache(predictionId, {
    processingId: lockId,
    processingAt: new Date().toISOString(),
    processingBy: holder,
  });

  const confirmed = await readJobCache(predictionId);
  if (!confirmed || confirmed.processingId !== lockId) return null;
  return confirmed;
};

const acquireFaceSwapProcessingLock = async (predictionId: string, holder: string) => {
  const current = await readFaceSwapJobCache(predictionId);
  if (!current) return null;
  if (isFreshLock(current.processingId, current.processingAt)) return null;

  const lockId = crypto.randomUUID();
  await updateFaceSwapJobCache(predictionId, {
    processingId: lockId,
    processingAt: new Date().toISOString(),
    processingBy: holder,
  });

  const confirmed = await readFaceSwapJobCache(predictionId);
  if (!confirmed || confirmed.processingId !== lockId) return null;
  return confirmed;
};

const decodeWebhookSecret = (secret: string) => {
  if (!secret.startsWith('whsec_')) {
    return Buffer.from(secret, 'utf8');
  }
  const raw = secret.slice('whsec_'.length).replace(/-/g, '+').replace(/_/g, '/');
  const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
};

const parseWebhookSignatures = (header: string) =>
  header
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(','))
    .filter(([version, signature]) => version === 'v1' && Boolean(signature))
    .map(([, signature]) => signature);

export async function POST(req: NextRequest) {
  try {
    const webhookId = req.headers.get('webhook-id');
    const webhookTimestamp = req.headers.get('webhook-timestamp');
    const webhookSignatures = req.headers.get('webhook-signature');
    const secret = process.env.REPLICATE_WEBHOOK_SECRET || process.env.REPLICATE_WEBHOOK_;

    if (!webhookId || !webhookTimestamp || !webhookSignatures || !secret) {
      return NextResponse.json({ error: 'Missing headers or secret' }, { status: 400 });
    }

    const body = await req.text();
    
    const parsedTimestamp = Number(webhookTimestamp);
    const timestampSeconds = parsedTimestamp > 1e12 ? Math.floor(parsedTimestamp / 1000) : parsedTimestamp;
    if (!Number.isFinite(timestampSeconds)) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
      return NextResponse.json({ error: 'Timestamp outside tolerance' }, { status: 400 });
    }

    // Signature Verification
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    const secretBytes = decodeWebhookSecret(secret);
    const computedSignature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64');

    const expectedSignatures = parseWebhookSignatures(webhookSignatures);
    const computedBytes = Buffer.from(computedSignature, 'base64');
    const isValid = expectedSignatures.some((expectedSig) => {
      const expectedBytes = Buffer.from(expectedSig, 'base64');
      if (expectedBytes.length !== computedBytes.length) return false;
      return crypto.timingSafeEqual(expectedBytes, computedBytes);
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const prediction = JSON.parse(body);
    const predictionId = prediction.id;
    const status = prediction.status;

    console.log(`[Replicate Webhook] Processing ${predictionId} with status ${status}`);

    let cachedJob = await readJobCache(predictionId);
    if (!cachedJob) {
      let faceSwapJob = await readFaceSwapJobCache(predictionId);
      if (!faceSwapJob) {
        const motionTransferJob = await readMotionTransferJobCache(predictionId);
        if (!motionTransferJob) {
          console.warn(`[Replicate Webhook] Job ${predictionId} not found in cache`);
          return NextResponse.json({ ok: true }); // Return OK so Replicate doesn't retry
        }

        // Motion Transfer Job Processing
        if (status === 'succeeded') {
          if (motionTransferJob.outputUrl) return NextResponse.json({ ok: true });

          try {
            const outputUrls = await extractOutputUrls(prediction.output);
            if (!outputUrls.length) {
              throw new Error('No output URLs from prediction');
            }

            const outputUrl = outputUrls[0];
            const res = await fetchWithTimeout(outputUrl);
            if (!res.ok) throw new Error('Output konnte nicht geladen werden');
            const blobData = await res.blob();
            const buffer = Buffer.from(await blobData.arrayBuffer());

            const filename = `motion-transfer/${motionTransferJob.userId}/outputs/${Date.now()}-result.mp4`;
            const blob = await put(filename, buffer, {
              access: 'public',
              contentType: 'video/mp4',
            });

            const asset = await prisma.mediaAsset.create({
              data: {
                ventureId: motionTransferJob.ventureId,
                ownerId: motionTransferJob.userId,
                type: 'VIDEO',
                url: blob.url,
                filename,
                mimeType: 'video/mp4',
                size: buffer.length,
                source: 'GENERATED',
                model: motionTransferJob.model,
                tags: ['motion-transfer', 'wan-animate', 'replicate']
              }
            });

            if (motionTransferJob.reservationId) {
              await settleEnergy({
                reservationId: motionTransferJob.reservationId,
                finalCost: motionTransferJob.cost,
                provider: 'replicate',
                model: motionTransferJob.model,
                metadata: { assetId: asset.id },
              });
            }

            await updateMotionTransferJobCache(predictionId, {
              outputUrl: blob.url,
              settledAt: new Date().toISOString(),
            });

            return NextResponse.json({ ok: true });
          } catch (error) {
            const message = normalizeProcessingError(error) || 'Motion Transfer Output-Verarbeitung fehlgeschlagen';
            if (motionTransferJob.reservationId && !motionTransferJob.refundedAt) {
              try {
                await refundEnergy(motionTransferJob.reservationId, 'output-processing-failed');
                motionTransferJob.refundedAt = new Date().toISOString();
              } catch (refundError) {
                console.error('Failed to refund motion transfer energy after output processing error', refundError);
              }
            }
            await updateMotionTransferJobCache(predictionId, {
              error: message,
              refundedAt: motionTransferJob.refundedAt,
            });
            return NextResponse.json({ ok: true });
          }
        }

        if (status === 'failed' || status === 'canceled') {
          if (!motionTransferJob.refundedAt && motionTransferJob.reservationId) {
            await refundEnergy(motionTransferJob.reservationId, 'motion-transfer-failed');
            await updateMotionTransferJobCache(predictionId, {
              refundedAt: new Date().toISOString(),
              error: String(prediction.error || 'Motion Transfer fehlgeschlagen'),
            });
          }
          return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: true });
      }

      if (status === 'succeeded') {
        if (faceSwapJob.outputUrl) return NextResponse.json({ ok: true });

        const lockedJob = await acquireFaceSwapProcessingLock(predictionId, 'webhook');
        if (!lockedJob) return NextResponse.json({ ok: true });
        faceSwapJob = lockedJob;
        if (faceSwapJob.outputUrl) return NextResponse.json({ ok: true });

        try {
          const outputUrls = await extractOutputUrls(prediction.output);
          if (!outputUrls.length) {
            throw new Error('No output URLs from prediction');
          }

          const outputUrl = outputUrls[0];
          const res = await fetchWithTimeout(outputUrl);
          if (!res.ok) throw new Error('Output konnte nicht geladen werden');
          const blobData = await res.blob();
          const buffer = Buffer.from(await blobData.arrayBuffer());

          const filename = `faceswap/${faceSwapJob.userId}/outputs/${Date.now()}-result.mp4`;
          const blob = await put(filename, buffer, {
            access: 'public',
            contentType: 'video/mp4',
          });

          const asset = await prisma.mediaAsset.create({
            data: {
              ventureId: faceSwapJob.ventureId,
              ownerId: faceSwapJob.userId,
              type: 'VIDEO',
              url: blob.url,
              filename,
              mimeType: 'video/mp4',
              size: buffer.length,
              source: 'GENERATED',
              model: faceSwapJob.model,
              tags: ['faceswap', 'replicate']
            }
          });

          if (faceSwapJob.reservationId) {
            await settleEnergy({
              reservationId: faceSwapJob.reservationId,
              finalCost: faceSwapJob.cost,
              provider: 'replicate',
              model: faceSwapJob.model,
              metadata: { assetId: asset.id },
            });
          }

          await updateFaceSwapJobCache(predictionId, {
            outputUrl: blob.url,
            settledAt: new Date().toISOString(),
            processingId: null,
            processingAt: null,
            processingBy: null,
          });

          return NextResponse.json({ ok: true });
        } catch (error) {
          const message = normalizeProcessingError(error) || 'Output-Verarbeitung fehlgeschlagen';
          if (faceSwapJob.reservationId && !faceSwapJob.refundedAt) {
            try {
              await refundEnergy(faceSwapJob.reservationId, 'output-processing-failed');
              faceSwapJob.refundedAt = new Date().toISOString();
            } catch (refundError) {
              console.error('Failed to refund faceswap energy after output processing error', refundError);
            }
          }
          await updateFaceSwapJobCache(predictionId, {
            error: message,
            refundedAt: faceSwapJob.refundedAt,
            processingId: null,
            processingAt: null,
            processingBy: null,
          });
          return NextResponse.json({ ok: true });
        }
      }

      if (status === 'failed' || status === 'canceled') {
        if (!faceSwapJob.refundedAt && faceSwapJob.reservationId) {
          await refundEnergy(faceSwapJob.reservationId, 'faceswap-failed');
          await updateFaceSwapJobCache(predictionId, {
            refundedAt: new Date().toISOString(),
            error: String(prediction.error || 'Avatar fehlgeschlagen'),
          });
        }
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    if (status === 'succeeded') {
      // Check if already processed
      if (cachedJob.assets) return NextResponse.json({ ok: true });
      if ((cachedJob.refundedAt || cachedJob.error) && !cachedJob.assets) {
        return NextResponse.json({ ok: true });
      }

      const lockedJob = await acquireProcessingLock(predictionId, 'webhook');
      if (!lockedJob) return NextResponse.json({ ok: true });
      cachedJob = lockedJob;
      if (cachedJob.assets) return NextResponse.json({ ok: true });

      try {
        const outputUrls = await extractOutputUrls(prediction.output);
        if (!outputUrls.length) {
          await updateJobCache(predictionId, {
            error: 'No output from Replicate',
            processingId: null,
            processingAt: null,
            processingBy: null,
          });
          return NextResponse.json({ ok: true });
        }

        const isVideoMode = cachedJob.outputType === 'video';
        const dimensions = getAspectDimensions(cachedJob.aspectRatio, isVideoMode);

        const resolvedAssets = await Promise.all(
          outputUrls.map(async (url, index) => {
            const res = await fetchWithTimeout(url);
            if (!res.ok) throw new Error('Could not fetch output');
            const blobData = await res.blob();
            const buffer = Buffer.from(await blobData.arrayBuffer());
            const info = getContentInfo(res.headers.get('content-type'), isVideoMode ? 'video' : 'image');

            const filename = `marketing/${cachedJob.userId}/${Date.now()}-${index}.${info.ext}`;
            const blob = await put(filename, buffer, {
              access: 'public',
              contentType: info.contentType,
            });

            const created = await prisma.mediaAsset.create({
              data: {
                ventureId: cachedJob.ventureId,
                ownerId: cachedJob.userId,
                type: isVideoMode ? 'VIDEO' : 'IMAGE',
                url: blob.url,
                filename,
                mimeType: info.contentType,
                size: buffer.length,
                source: 'GENERATED',
                prompt: cachedJob.prompt,
                model: cachedJob.model,
                width: dimensions.width,
                height: dimensions.height,
                tags: [cachedJob.mode, 'replicate', ...(cachedJob.originTag ? [cachedJob.originTag] : [])]
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
              type: isVideoMode ? 'video' : 'image',
              isPublic: created.isPublic
            };
          })
        );

        // Settle Energy
        let creditsRemaining = cachedJob.creditsRemaining;
        if (cachedJob.reservationId) {
          const settlement = await settleEnergy({
            reservationId: cachedJob.reservationId,
            finalCost: cachedJob.cost,
            provider: 'replicate',
            model: cachedJob.model
          });
          if (settlement?.creditsRemaining !== undefined) {
            creditsRemaining = settlement.creditsRemaining;
          }
        }

        await updateJobCache(predictionId, {
          assets: resolvedAssets,
          settledAt: new Date().toISOString(),
          creditsRemaining,
          processingId: null,
          processingAt: null,
          processingBy: null,
        });
      } catch (error) {
        const message = normalizeProcessingError(error) || 'Output-Verarbeitung fehlgeschlagen';
        if (cachedJob.reservationId && !cachedJob.refundedAt) {
          try {
            await refundEnergy(cachedJob.reservationId, 'output-processing-failed');
            cachedJob.refundedAt = new Date().toISOString();
          } catch (refundError) {
            console.error('Failed to refund energy after output processing error', refundError);
          }
        }
        await updateJobCache(predictionId, {
          error: message,
          refundedAt: cachedJob.refundedAt,
          processingId: null,
          processingAt: null,
          processingBy: null,
        });
      }

    } else if (status === 'failed' || status === 'canceled') {
      if (!cachedJob.refundedAt && cachedJob.reservationId) {
        await refundEnergy(cachedJob.reservationId, 'generation-failed');
        await updateJobCache(predictionId, {
          refundedAt: new Date().toISOString(),
          error: prediction.error || 'Generation failed',
          processingId: null,
          processingAt: null,
          processingBy: null,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Replicate Webhook Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
