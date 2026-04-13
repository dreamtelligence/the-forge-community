const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const INTRO_FREE_PLATFORM_ACCESS_LIMIT = parsePositiveInt(
  process.env.INTRO_FREE_PLATFORM_ACCESS_LIMIT,
  100
);

export type PlatformAccessSource = 'none' | 'promo' | 'stripe' | 'admin';

type PlatformAccessInput = {
  founderNumber?: number | null;
  role?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
};

export type PlatformAccessState = {
  source: PlatformAccessSource;
  hasPlatformAccess: boolean;
  effectiveSubscriptionStatus: 'active' | 'trialing' | 'past_due' | 'cancelled' | null;
  effectiveSubscriptionTier: 'founder' | 'pro' | 'enterprise';
  isIntroOffer: boolean;
  founderNumber: number | null;
  introFreePlatformAccessLimit: number;
};

const normalizeTier = (tier: string | null | undefined): 'founder' | 'pro' | 'enterprise' => {
  if (tier === 'enterprise') return 'enterprise';
  if (tier === 'pro') return 'pro';
  return 'founder';
};

export const hasIntroPlatformAccess = (founderNumber: number | null | undefined) =>
  INTRO_FREE_PLATFORM_ACCESS_LIMIT > 0 &&
  typeof founderNumber === 'number' &&
  founderNumber > 0 &&
  founderNumber <= INTRO_FREE_PLATFORM_ACCESS_LIMIT;

export function resolvePlatformAccess(input: PlatformAccessInput): PlatformAccessState {
  const founderNumber = typeof input.founderNumber === 'number' ? input.founderNumber : null;
  const effectiveSubscriptionTier = normalizeTier(input.subscriptionTier);
  const effectiveSubscriptionStatus =
    input.subscriptionStatus === 'active' ||
    input.subscriptionStatus === 'trialing' ||
    input.subscriptionStatus === 'past_due' ||
    input.subscriptionStatus === 'cancelled'
      ? input.subscriptionStatus
      : null;

  if (input.role === 'ADMIN') {
    return {
      source: 'admin',
      hasPlatformAccess: true,
      effectiveSubscriptionStatus: 'active',
      effectiveSubscriptionTier: 'enterprise',
      isIntroOffer: false,
      founderNumber,
      introFreePlatformAccessLimit: INTRO_FREE_PLATFORM_ACCESS_LIMIT,
    };
  }

  const hasStripeAccess =
    (effectiveSubscriptionStatus === 'active' || effectiveSubscriptionStatus === 'trialing') &&
    (effectiveSubscriptionTier === 'pro' || effectiveSubscriptionTier === 'enterprise');

  if (hasStripeAccess) {
    return {
      source: 'stripe',
      hasPlatformAccess: true,
      effectiveSubscriptionStatus,
      effectiveSubscriptionTier,
      isIntroOffer: false,
      founderNumber,
      introFreePlatformAccessLimit: INTRO_FREE_PLATFORM_ACCESS_LIMIT,
    };
  }

  if (hasIntroPlatformAccess(founderNumber)) {
    return {
      source: 'promo',
      hasPlatformAccess: true,
      effectiveSubscriptionStatus: 'active',
      effectiveSubscriptionTier: 'pro',
      isIntroOffer: true,
      founderNumber,
      introFreePlatformAccessLimit: INTRO_FREE_PLATFORM_ACCESS_LIMIT,
    };
  }

  return {
    source: 'none',
    hasPlatformAccess: false,
    effectiveSubscriptionStatus,
    effectiveSubscriptionTier,
    isIntroOffer: false,
    founderNumber,
    introFreePlatformAccessLimit: INTRO_FREE_PLATFORM_ACCESS_LIMIT,
  };
}
