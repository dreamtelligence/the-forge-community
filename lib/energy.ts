import { prisma } from '@/lib/prisma';
import { BILLING_V2_ENABLED, usageChargeFromMetadata } from '@/lib/billing-v2';
import {
  createPlatformLedgerEntry,
  recordFinanceAuditLog,
} from '@/lib/finance-ledger';
import { resolvePlatformAccess } from '@/lib/platform-access';
import { getOrCreatePlatformTaxProfile } from '@/lib/platform-tax-profile';
import { generateUUID } from '@/lib/utils/uuid';
import {
  FinanceAuditAction,
  FinanceAuditEntityType,
  type Prisma,
} from '@prisma/client';

export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type EnergyReserveInput = {
  userId: string;
  amount: number;
  feature?: string;
  requestId?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, any>;
};

export type EnergyReserveResult = {
  reservationId: string;
  reservedCredits: number;
  balanceAfter: number;
  status: 'RESERVED' | 'SETTLED' | 'REFUNDED';
  reused?: boolean;
};

export type QuotaResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
};

export type EnergySettleInput = {
  reservationId: string;
  finalCost?: number;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
  metadata?: Record<string, any>;
};

export class InsufficientEnergyError extends Error {
  requiredCredits: number;
  creditsAvailable: number;

  constructor(requiredCredits: number, creditsAvailable: number) {
    super('Nicht genug Energy (Credits). Bitte lade dein Konto auf.');
    this.requiredCredits = requiredCredits;
    this.creditsAvailable = creditsAvailable;
  }
}

const normalizeAmount = (value: number, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

export const estimateTokens = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return 1;
  return Math.max(1, Math.ceil(trimmed.length / 4));
};

export const calculateTokenCredits = (totalTokens: number, creditsPer1k: number, minimum = 1) => {
  const normalizedTokens = Math.max(1, Math.floor(totalTokens));
  const normalizedRate = Math.max(1, Math.floor(creditsPer1k));
  return Math.max(minimum, Math.ceil((normalizedTokens / 1000) * normalizedRate));
};

const mergeMetadata = (base: Record<string, any> | null | undefined, next?: Record<string, any>) => {
  if (!next) return base ?? undefined;
  return { ...(base ?? {}), ...next };
};

const recordUsageSettlement = async (params: {
  tx: Prisma.TransactionClient;
  profileId: string | null;
  reservation: {
    id: string;
    userId: string;
    feature: string | null;
    delta: number;
  };
  finalCredits: number;
  provider?: string;
  model?: string;
  mergedMetadata: Record<string, any>;
}) => {
  const { tx, profileId, reservation, finalCredits, provider, model, mergedMetadata } = params;

  if (!BILLING_V2_ENABLED) return null;
  if (!profileId) return null;
  if (reservation.delta === 0) return null; // admin bypass / no-op spend

  const existing = await tx.platformCreditUsage.findUnique({
    where: { energyTransactionId: reservation.id },
    select: { id: true },
  });

  if (existing) return null;

  const breakdown = usageChargeFromMetadata(finalCredits, mergedMetadata);
  const usageMetadata = {
    ...mergedMetadata,
    providerCostEur: breakdown.providerCostEur,
    providerCostUsd: breakdown.providerCostUsd,
    platformFeeEur: breakdown.platformFeeEur,
    totalChargeEur: breakdown.chargedTotalEur,
    platformFeePercent: breakdown.feePercent,
    platformFeeFixedEur: breakdown.fixedFeeEur,
    fxRate: breakdown.fxRate,
    pricingDeltaEur: breakdown.pricingDeltaEur,
    pricingVersion: 'billing_v2',
  };
  const usageId = generateUUID();
  const expenseLedgerEntry =
    breakdown.providerCostEur > 0
      ? await createPlatformLedgerEntry({
          db: tx,
          profileId,
          direction: 'EXPENSE',
          source: 'CREDIT_USAGE',
          sourceId: usageId,
          description: `AI provider cost: ${reservation.feature || 'usage'}`,
          amountNet: breakdown.providerCostEur,
          taxAmount: 0,
          amountGross: breakdown.providerCostEur,
          currency: 'EUR',
          userId: reservation.userId,
          actorEmail: 'system:energy-settlement',
          requestId: reservation.id,
          metadata: {
            ...usageMetadata,
            settlementTransactionId: reservation.id,
          },
          auditMetadata: {
            linkedUsageId: usageId,
          },
        })
      : null;

  const usage = await tx.platformCreditUsage.create({
    data: {
      id: usageId,
      profileId,
      userId: reservation.userId,
      energyTransactionId: reservation.id,
      credits: finalCredits,
      provider: provider || undefined,
      model: model || undefined,
      feature: reservation.feature || undefined,
      costAmount: breakdown.chargedTotalEur,
      currency: 'EUR',
      ledgerEntryId: expenseLedgerEntry?.id || undefined,
      metadata: usageMetadata,
    },
    select: {
      id: true,
      costAmount: true,
      metadata: true,
      ledgerEntryId: true,
    },
  });

  await recordFinanceAuditLog({
    db: tx,
    entityType: FinanceAuditEntityType.PLATFORM_CREDIT_USAGE,
    entityId: usage.id,
    action: FinanceAuditAction.CREATED,
    actorEmail: 'system:energy-settlement',
    requestId: reservation.id,
    afterState: {
      id: usage.id,
      profileId,
      userId: reservation.userId,
      energyTransactionId: reservation.id,
      credits: finalCredits,
      provider: provider || null,
      model: model || null,
      feature: reservation.feature || null,
      costAmount: breakdown.chargedTotalEur,
      ledgerEntryId: usage.ledgerEntryId ?? null,
      metadata: usage.metadata,
    },
    metadata: {
      providerCostEur: breakdown.providerCostEur,
      platformFeeEur: breakdown.platformFeeEur,
      linkedLedgerEntryId: expenseLedgerEntry?.id ?? null,
    },
  });

  return usage;
};

type QuotaInput = {
  userId: string;
  feature: string;
  limit: number;
  windowMs?: number;
};

type QuotaBucketInput = QuotaInput & {
  windowStart: Date;
  resetAt: Date;
};

const consumeQuotaBucket = async (options: QuotaBucketInput): Promise<QuotaResult> => {
  const limit = Math.max(0, Math.floor(options.limit));

  if (limit <= 0) {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, limit: 0, resetAt: options.resetAt };
  }

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("userId", "feature", "windowStart", "count", "createdAt", "updatedAt")
    VALUES (${options.userId}, ${options.feature}, ${options.windowStart}, 1, NOW(), NOW())
    ON CONFLICT ("userId", "feature", "windowStart")
    DO UPDATE SET
      "count" = "RateLimitBucket"."count" + 1,
      "updatedAt" = NOW()
    WHERE "RateLimitBucket"."count" < ${limit}
    RETURNING "count";
  `;

  if (rows.length === 0) {
    return { allowed: false, remaining: 0, limit, resetAt: options.resetAt };
  }

  const currentCount = rows[0].count;
  const remaining = Math.max(0, limit - currentCount);

  return { allowed: true, remaining, limit, resetAt: options.resetAt };
};

const consumeQuotaWindow = async (options: QuotaInput & { windowMs: number }): Promise<QuotaResult> => {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / options.windowMs) * options.windowMs);
  const resetAt = new Date(windowStart.getTime() + options.windowMs);

  return consumeQuotaBucket({
    userId: options.userId,
    feature: options.feature,
    limit: options.limit,
    windowStart,
    resetAt,
  });
};

export async function consumeHourlyQuota(options: QuotaInput): Promise<QuotaResult> {
  if (await isAdminQuotaBypassEnabled(options.userId)) {
    const windowMs = options.windowMs ?? 60 * 60 * 1000;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = new Date(windowStart + windowMs);
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, limit: 0, resetAt };
  }

  const windowMs = options.windowMs ?? 60 * 60 * 1000;
  return consumeQuotaWindow({ ...options, windowMs });
}

export async function consumeDailyQuota(options: QuotaInput): Promise<QuotaResult> {
  const windowMs = options.windowMs ?? 24 * 60 * 60 * 1000;
  return consumeQuotaWindow({ ...options, windowMs });
}

export async function consumeMonthlyQuota(options: QuotaInput): Promise<QuotaResult> {
  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return consumeQuotaBucket({
    userId: options.userId,
    feature: options.feature,
    limit: options.limit,
    windowStart,
    resetAt,
  });
}

/**
 * Daily Quota Configurations for Expensive Operations
 *
 * Independent of credit system - prevents abuse even with unlimited credits.
 * Users can hit daily limits before running out of credits.
 */
export const DAILY_QUOTAS = {
  // Voice Generation (ElevenLabs)
  VOICE_FREE: parseInt(process.env.DAILY_QUOTA_VOICE_FREE || '20', 10),
  VOICE_PAID: parseInt(process.env.DAILY_QUOTA_VOICE_PAID || '100', 10),

  // Image Generation (Replicate)
  IMAGE_FREE: parseInt(process.env.DAILY_QUOTA_IMAGE_FREE || '15', 10),
  IMAGE_PAID: parseInt(process.env.DAILY_QUOTA_IMAGE_PAID || '50', 10),

  // Video Generation (Replicate)
  VIDEO_FREE: parseInt(process.env.DAILY_QUOTA_VIDEO_FREE || '3', 10),
  VIDEO_PAID: parseInt(process.env.DAILY_QUOTA_VIDEO_PAID || '20', 10),
} as const;

export const MONTHLY_QUOTAS = {
  AVATAR_FREE: parseInt(process.env.MONTHLY_QUOTA_AVATAR_FREE || '3', 10),
  AVATAR_PAID: parseInt(process.env.MONTHLY_QUOTA_AVATAR_PAID || '200', 10),
} as const;

const isDailyQuotaBypassEnabled = () =>
  process.env.DISABLE_DAILY_QUOTAS === 'true' || process.env.NODE_ENV !== 'production';

const isAdminQuotaBypassEnabled = async (userId: string) => {
  const adminBypassEnabled = process.env.ADMIN_UNLIMITED_QUOTAS !== 'false';
  if (!adminBypassEnabled) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'ADMIN';
};

/**
 * Check if user has paid subscription (future implementation)
 *
 * For now, all users are on free tier.
 * Future: Check user.subscriptionTier === 'pro' or similar.
 */
export async function getUserTier(userId: string): Promise<'free' | 'paid'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { founderNumber: true, subscriptionTier: true, subscriptionStatus: true, role: true },
  });

  if (!user) return 'free';
  return resolvePlatformAccess(user).hasPlatformAccess ? 'paid' : 'free';
}

/**
 * Check daily quota for voice generation
 *
 * @param userId - User ID
 * @returns Quota result with allow/deny decision
 *
 * @example
 * const quota = await checkDailyVoiceQuota(user.id);
 * if (!quota.allowed) {
 *   return Response.json({
 *     error: `Daily limit reached. Resets at ${quota.resetAt.toISOString()}`
 *   }, { status: 429 });
 * }
 */
export async function checkDailyVoiceQuota(userId: string): Promise<QuotaResult> {
  if (isDailyQuotaBypassEnabled() || await isAdminQuotaBypassEnabled(userId)) {
    const windowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = new Date(windowStart + windowMs);
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, limit: 0, resetAt };
  }
  const tier = await getUserTier(userId);
  const limit = tier === 'paid' ? DAILY_QUOTAS.VOICE_PAID : DAILY_QUOTAS.VOICE_FREE;

  return consumeDailyQuota({
    userId,
    feature: 'daily-quota:voice-generation',
    limit
  });
}

/**
 * Check daily quota for image generation
 */
export async function checkDailyImageQuota(userId: string): Promise<QuotaResult> {
  if (isDailyQuotaBypassEnabled() || await isAdminQuotaBypassEnabled(userId)) {
    const windowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = new Date(windowStart + windowMs);
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, limit: 0, resetAt };
  }
  const tier = await getUserTier(userId);
  const limit = tier === 'paid' ? DAILY_QUOTAS.IMAGE_PAID : DAILY_QUOTAS.IMAGE_FREE;

  return consumeDailyQuota({
    userId,
    feature: 'daily-quota:image-generation',
    limit
  });
}

/**
 * Check daily quota for video generation
 */
export async function checkDailyVideoQuota(userId: string): Promise<QuotaResult> {
  if (isDailyQuotaBypassEnabled() || await isAdminQuotaBypassEnabled(userId)) {
    const windowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = new Date(windowStart + windowMs);
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, limit: 0, resetAt };
  }

  const tier = await getUserTier(userId);
  const limit = tier === 'paid' ? DAILY_QUOTAS.VIDEO_PAID : DAILY_QUOTAS.VIDEO_FREE;

  return consumeDailyQuota({
    userId,
    feature: 'daily-quota:video-generation',
    limit,
  });
}

export async function checkMonthlyAvatarQuota(userId: string): Promise<QuotaResult> {
  const tier = await getUserTier(userId);
  const limit = tier === 'paid' ? MONTHLY_QUOTAS.AVATAR_PAID : MONTHLY_QUOTAS.AVATAR_FREE;

  return consumeMonthlyQuota({
    userId,
    feature: 'monthly-quota:avatar-swap',
    limit,
  });
}

export async function reserveEnergy(input: EnergyReserveInput): Promise<EnergyReserveResult> {
  const amount = normalizeAmount(input.amount);

  return prisma.$transaction(async (tx) => {
    if (input.requestId) {
      const existing = await tx.energyTransaction.findUnique({
        where: { requestId: input.requestId },
        select: { id: true, delta: true, balanceAfter: true, status: true }
      });

      if (existing) {
        return {
          reservationId: existing.id,
          reservedCredits: Math.abs(existing.delta),
          balanceAfter: existing.balanceAfter,
          status: existing.status,
          reused: true,
        };
      }
    }

    const adminBypassEnabled = process.env.ADMIN_UNLIMITED_ENERGY !== 'false';
    if (adminBypassEnabled) {
      const adminUser = await tx.user.findUnique({
        where: { id: input.userId },
        select: { role: true, credits: true }
      });

      if (adminUser?.role === 'ADMIN') {
        const reservation = await tx.energyTransaction.create({
          data: {
            userId: input.userId,
            delta: 0,
            balanceAfter: adminUser.credits,
            type: 'SPEND',
            status: 'RESERVED',
            feature: input.feature,
            provider: input.provider,
            model: input.model,
            requestId: input.requestId,
            metadata: mergeMetadata(input.metadata, { reservedCredits: amount, bypass: 'admin' })
          },
          select: { id: true }
        });

        return {
          reservationId: reservation.id,
          reservedCredits: amount,
          balanceAfter: adminUser.credits,
          status: 'RESERVED'
        };
      }
    }

    const updateResult = await tx.user.updateMany({
      where: { id: input.userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } }
    });

    if (updateResult.count === 0) {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { credits: true }
      });
      throw new InsufficientEnergyError(amount, user?.credits ?? 0);
    }

    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { credits: true }
    });

    if (!user) {
      throw new Error('Benutzer nicht gefunden');
    }

    const reservation = await tx.energyTransaction.create({
      data: {
        userId: input.userId,
        delta: -amount,
        balanceAfter: user.credits,
        type: 'SPEND',
        status: 'RESERVED',
        feature: input.feature,
        provider: input.provider,
        model: input.model,
        requestId: input.requestId,
        metadata: mergeMetadata(input.metadata, { reservedCredits: amount })
      },
      select: { id: true }
    });

    return {
      reservationId: reservation.id,
      reservedCredits: amount,
      balanceAfter: user.credits,
      status: 'RESERVED'
    };
  });
}

export async function settleEnergy(input: EnergySettleInput) {
  const billingProfile = BILLING_V2_ENABLED
    ? await getOrCreatePlatformTaxProfile().catch((error) => {
        console.error('[ENERGY] Failed to load platform tax profile for usage booking:', error);
        return null;
      })
    : null;

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.energyTransaction.findUnique({
      where: { id: input.reservationId },
      select: {
        id: true,
        userId: true,
        delta: true,
        status: true,
        metadata: true,
        feature: true,
        balanceAfter: true,
        provider: true,
        model: true,
      }
    });

    if (!reservation) {
      throw new Error('Energy-Reservierung nicht gefunden');
    }

    if (reservation.status === 'REFUNDED') {
      return { creditsRemaining: reservation.balanceAfter };
    }

    if (reservation.status === 'SETTLED') {
      const user = await tx.user.findUnique({
        where: { id: reservation.userId },
        select: { credits: true }
      });
      return { creditsRemaining: user?.credits ?? reservation.balanceAfter };
    }

    const reservedCredits = Math.abs(reservation.delta);
    const finalCost = reservedCredits === 0 ? 0 : normalizeAmount(input.finalCost ?? reservedCredits);
    const refundAmount = Math.max(0, reservedCredits - finalCost);
    const mergedMetadata = mergeMetadata(reservation.metadata as Record<string, any>, {
      finalCredits: finalCost,
      refundCredits: refundAmount || undefined,
      ...input.metadata
    }) || {};

    await tx.energyTransaction.update({
      where: { id: reservation.id },
      data: {
        status: 'SETTLED',
        provider: input.provider,
        model: input.model,
        promptTokens: input.usage?.promptTokens,
        completionTokens: input.usage?.completionTokens,
        totalTokens: input.usage?.totalTokens,
        metadata: mergedMetadata
      }
    });

    const usageRecord = await recordUsageSettlement({
      tx,
      profileId: billingProfile?.id ?? null,
      reservation: {
        id: reservation.id,
        userId: reservation.userId,
        feature: reservation.feature,
        delta: reservation.delta,
      },
      finalCredits: finalCost,
      provider: input.provider ?? reservation.provider ?? undefined,
      model: input.model ?? reservation.model ?? undefined,
      mergedMetadata,
    });

    if (refundAmount <= 0) {
      return {
        creditsRemaining: reservation.balanceAfter,
        usageCostEur: usageRecord?.costAmount ?? null,
      };
    }

    const updated = await tx.user.update({
      where: { id: reservation.userId },
      data: { credits: { increment: refundAmount } },
      select: { credits: true }
    });

    await tx.energyTransaction.create({
      data: {
        userId: reservation.userId,
        delta: refundAmount,
        balanceAfter: updated.credits,
        type: 'REFUND',
        status: 'SETTLED',
        feature: reservation.feature,
        relatedTransactionId: reservation.id,
        metadata: { reason: 'reserve-adjustment' }
      }
    });

    return {
      creditsRemaining: updated.credits,
      usageCostEur: usageRecord?.costAmount ?? null,
    };
  });
}

export async function refundEnergy(reservationId: string, reason = 'provider-failed') {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.energyTransaction.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        delta: true,
        status: true,
        feature: true,
      }
    });

    if (!reservation) {
      throw new Error('Energy-Reservierung nicht gefunden');
    }

    if (reservation.status === 'REFUNDED') {
      return null;
    }

    const refundAmount = Math.abs(reservation.delta);

    const updated = await tx.user.update({
      where: { id: reservation.userId },
      data: { credits: { increment: refundAmount } },
      select: { credits: true }
    });

    await tx.energyTransaction.update({
      where: { id: reservation.id },
      data: { status: 'REFUNDED' }
    });

    await tx.energyTransaction.create({
      data: {
        userId: reservation.userId,
        delta: refundAmount,
        balanceAfter: updated.credits,
        type: 'REFUND',
        status: 'SETTLED',
        feature: reservation.feature,
        relatedTransactionId: reservation.id,
        metadata: { reason }
      }
    });

    return { creditsRemaining: updated.credits };
  });
}

export async function grantEnergy(userId: string, amount: number, reason = 'grant') {
  const normalizedAmount = normalizeAmount(amount);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: normalizedAmount } },
      select: { credits: true }
    });

    await tx.energyTransaction.create({
      data: {
        userId,
        delta: normalizedAmount,
        balanceAfter: updated.credits,
        type: 'GRANT',
        status: 'SETTLED',
        feature: 'system',
        metadata: { reason }
      }
    });

    return { creditsRemaining: updated.credits };
  });
}
