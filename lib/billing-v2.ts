const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readEnvNumber = (name: string, fallback: number) =>
  parseNumber(process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`], fallback);

const clampMin = (value: number, min: number) =>
  Number.isFinite(value) ? Math.max(min, value) : min;

const roundMoney = (value: number) => Math.round(value * 10000) / 10000;

export const BILLING_V2_ENABLED = process.env.BILLING_V2_ENABLED !== 'false';
export const CREDIT_EUR_VALUE = clampMin(readEnvNumber('CREDIT_EUR_VALUE', 0.0875), 0.0001);
export const USAGE_FEE_PERCENT = clampMin(readEnvNumber('USAGE_PLATFORM_FEE_PERCENT', 0), 0);
export const USAGE_FEE_FIXED_EUR = clampMin(readEnvNumber('USAGE_PLATFORM_FEE_FIXED_EUR', 0), 0);
export const DEFAULT_FX_USD_EUR = clampMin(readEnvNumber('USD_EUR_RATE', 1), 0.0001);

const parseMetadataNumber = (metadata: Record<string, any> | null | undefined, keys: string[]) => {
  if (!metadata) return undefined;
  for (const key of keys) {
    if (!(key in metadata)) continue;
    const parsed = Number(metadata[key]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export type UsageChargeInput = {
  chargedCredits: number;
  providerCostEur?: number;
  providerCostUsd?: number;
  fxRate?: number;
  feePercent?: number;
  fixedFeeEur?: number;
};

export type UsageChargeBreakdown = {
  chargedCredits: number;
  chargedTotalEur: number;
  providerCostEur: number;
  providerCostUsd?: number;
  platformFeeEur: number;
  feePercent: number;
  fixedFeeEur: number;
  fxRate: number;
  pricingDeltaEur: number;
};

export const buildUsageChargeBreakdown = (input: UsageChargeInput): UsageChargeBreakdown => {
  const chargedCredits = Math.max(0, Math.floor(input.chargedCredits));
  const chargedTotalEur = roundMoney(chargedCredits * CREDIT_EUR_VALUE);

  const fxRate = clampMin(input.fxRate ?? DEFAULT_FX_USD_EUR, 0.0001);
  const feePercent = clampMin(input.feePercent ?? USAGE_FEE_PERCENT, 0);
  const fixedFeeEur = clampMin(input.fixedFeeEur ?? USAGE_FEE_FIXED_EUR, 0);

  let providerCostEur = Number.isFinite(input.providerCostEur)
    ? clampMin(input.providerCostEur as number, 0)
    : undefined;

  const providerCostUsd = Number.isFinite(input.providerCostUsd)
    ? clampMin(input.providerCostUsd as number, 0)
    : undefined;

  if (providerCostEur === undefined && providerCostUsd !== undefined) {
    providerCostEur = providerCostUsd * fxRate;
  }

  if (providerCostEur === undefined) {
    const denom = Math.max(1, 1 + feePercent);
    providerCostEur = Math.max(0, (chargedTotalEur - fixedFeeEur) / denom);
  }

  providerCostEur = roundMoney(providerCostEur);

  const platformFeeEur = roundMoney(Math.max(0, chargedTotalEur - providerCostEur));

  const impliedTotal = roundMoney(providerCostEur + providerCostEur * feePercent + fixedFeeEur);
  const pricingDeltaEur = roundMoney(chargedTotalEur - impliedTotal);

  return {
    chargedCredits,
    chargedTotalEur,
    providerCostEur,
    providerCostUsd,
    platformFeeEur,
    feePercent,
    fixedFeeEur,
    fxRate,
    pricingDeltaEur,
  };
};

export const usageChargeFromMetadata = (
  chargedCredits: number,
  metadata: Record<string, any> | null | undefined
): UsageChargeBreakdown => {
  const providerCostEur = parseMetadataNumber(metadata, [
    'providerCostEur',
    'estimatedProviderCostEur',
    'costEur',
  ]);

  const providerCostUsd = parseMetadataNumber(metadata, [
    'providerCostUsd',
    'estimatedProviderCostUsd',
    'costUsd',
  ]);

  const fxRate = parseMetadataNumber(metadata, ['fxRate', 'usdEurRate']);
  const feePercent = parseMetadataNumber(metadata, ['platformFeePercent']);
  const fixedFeeEur = parseMetadataNumber(metadata, ['platformFeeFixedEur']);

  return buildUsageChargeBreakdown({
    chargedCredits,
    providerCostEur,
    providerCostUsd,
    fxRate,
    feePercent,
    fixedFeeEur,
  });
};

export const parseUsageBreakdownFromMetadata = (metadata: Record<string, any> | null | undefined) => {
  if (!metadata || typeof metadata !== 'object') return null;

  const providerCostEur = parseMetadataNumber(metadata, ['providerCostEur']);
  const platformFeeEur = parseMetadataNumber(metadata, ['platformFeeEur']);
  const chargedTotalEur = parseMetadataNumber(metadata, ['totalChargeEur', 'costAmount']);

  if (
    providerCostEur === undefined &&
    platformFeeEur === undefined &&
    chargedTotalEur === undefined
  ) {
    return null;
  }

  return {
    providerCostEur: providerCostEur ?? 0,
    platformFeeEur: platformFeeEur ?? 0,
    chargedTotalEur: chargedTotalEur ?? 0,
    feePercent: parseMetadataNumber(metadata, ['platformFeePercent']) ?? USAGE_FEE_PERCENT,
    fxRate: parseMetadataNumber(metadata, ['fxRate']) ?? DEFAULT_FX_USD_EUR,
    providerCostUsd: parseMetadataNumber(metadata, ['providerCostUsd']) ?? null,
    pricingDeltaEur: parseMetadataNumber(metadata, ['pricingDeltaEur']) ?? 0,
  };
};
