import {
  MarketingMediaCreditsError,
  MarketingMediaQuotaExceededError,
} from '@/lib/ai/contracts/marketing-media';

type ReserveCreditsForGenerationInput = {
  userId: string;
  ventureId: string;
  requestId: string;
  mode: string;
  modelId: string;
  cost: number;
  hourlyLimit: number;
  isVideoOutput: boolean;
  estimatedProviderCostEur?: number;
  estimatedProviderCostUsd?: number;
};

type ReserveCreditsForGenerationResult = {
  reservationId: string;
};

type ReserveCreditsForGenerationDependencies = {
  reserveEnergy: (input: {
    userId: string;
    amount: number;
    feature: string;
    requestId: string;
    metadata: Record<string, unknown>;
  }) => Promise<{ reservationId: string }>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
  consumeHourlyQuota: (input: {
    userId: string;
    feature: string;
    limit: number;
  }) => Promise<{ allowed: boolean; resetAt: Date; remaining: number; limit: number }>;
  checkDailyImageQuota: (userId: string) => Promise<{
    allowed: boolean;
    resetAt: Date;
    remaining: number;
    limit: number;
  }>;
  checkDailyVideoQuota: (userId: string) => Promise<{
    allowed: boolean;
    resetAt: Date;
    remaining: number;
    limit: number;
  }>;
};

const loadDefaultDependencies = async (): Promise<ReserveCreditsForGenerationDependencies> => {
  const energy = await import('@/lib/finance/energy');
  return {
    reserveEnergy: energy.reserveEnergy,
    refundEnergy: energy.refundEnergy,
    consumeHourlyQuota: energy.consumeHourlyQuota,
    checkDailyImageQuota: energy.checkDailyImageQuota,
    checkDailyVideoQuota: energy.checkDailyVideoQuota,
  };
};

export async function reserveCreditsForGeneration(
  input: ReserveCreditsForGenerationInput,
  dependencies?: ReserveCreditsForGenerationDependencies
): Promise<ReserveCreditsForGenerationResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  let reservationId: string | null = null;

  try {
    const reservation = await resolvedDependencies.reserveEnergy({
      userId: input.userId,
      amount: input.cost,
      feature: 'marketing.media',
      requestId: input.requestId,
      metadata: {
        ventureId: input.ventureId,
        mode: input.mode,
        cost: input.cost,
        model: input.modelId,
        providerCostEur: input.estimatedProviderCostEur,
        providerCostUsd: input.estimatedProviderCostUsd,
      },
    });
    reservationId = reservation.reservationId;

    const hourlyQuota = await resolvedDependencies.consumeHourlyQuota({
      userId: input.userId,
      feature: input.isVideoOutput ? 'marketing.media.video' : 'marketing.media.image',
      limit: input.hourlyLimit,
    });

    if (!hourlyQuota.allowed) {
      await resolvedDependencies.refundEnergy(reservationId, 'hourly-rate-limit');
      throw new MarketingMediaQuotaExceededError('Stundenlimit erreicht.', {
        retryAfter: Math.ceil((hourlyQuota.resetAt.getTime() - Date.now()) / 1000),
      });
    }

    const dailyQuota = input.isVideoOutput
      ? await resolvedDependencies.checkDailyVideoQuota(input.userId)
      : await resolvedDependencies.checkDailyImageQuota(input.userId);

    if (!dailyQuota.allowed) {
      await resolvedDependencies.refundEnergy(reservationId, 'daily-quota-exceeded');
      const mediaType = input.isVideoOutput ? 'Video' : 'Bild';
      throw new MarketingMediaQuotaExceededError(
        `Tageslimit für ${mediaType}-Generierung erreicht (${dailyQuota.limit}/Tag). Nächster Reset: ${dailyQuota.resetAt.toLocaleTimeString('de-DE')}`,
        {
          quota: {
            type: input.isVideoOutput ? 'video' : 'image',
            limit: dailyQuota.limit,
            remaining: dailyQuota.remaining,
            resetAt: dailyQuota.resetAt.toISOString(),
          },
        }
      );
    }

    return { reservationId };
  } catch (error) {
    if (error instanceof MarketingMediaQuotaExceededError) {
      throw error;
    }

    if (
      error &&
      typeof error === 'object' &&
      'requiredCredits' in error &&
      'creditsAvailable' in error &&
      'message' in error
    ) {
      throw new MarketingMediaCreditsError(error.message, {
        requiredCredits: (error as { requiredCredits: number }).requiredCredits,
        creditsAvailable: (error as { creditsAvailable: number }).creditsAvailable,
      });
    }

    throw error;
  }
}
