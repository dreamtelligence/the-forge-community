import {
  type MarketingMediaJobReceipt,
  type MarketingMediaMode,
  type MarketingMediaStartResult,
  MarketingMediaNotFoundError,
  parseMarketingMediaFormData,
} from '@/lib/ai/contracts/marketing-media';
import {
  type MarketingMediaModelConfig,
  type MarketingMediaReplicateInput,
  buildFinalMarketingMediaPrompt,
  resolveMarketingMediaGenerationPlan,
} from '@/lib/ai/domain/marketing-media';
import { reserveCreditsForGeneration } from '@/lib/ai/application/reserve-credits-for-generation';

type StartMarketingMediaGenerationInput = {
  userEmail: string;
  ventureId: string;
  requestId: string;
  formData: FormData;
};

type StartMarketingMediaGenerationDependencies = {
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  findOwnedVenture: (
    ventureId: string,
    ownerId: string
  ) => Promise<{ id: string; brandDNA: Record<string, unknown> | null } | null>;
  uploadInputs: (input: {
    userId: string;
    mode: MarketingMediaMode;
    imageFile: unknown;
    endImageFile: unknown;
    existingImageUrl: unknown;
    existingEndImageUrl: unknown;
    imageFiles: unknown[];
    requiresImageInput: boolean;
  }) => Promise<{ imageUrl?: string | string[]; endImageUrl?: string }>;
  reserveCreditsForGeneration: typeof reserveCreditsForGeneration;
  createPrediction: (input: {
    userId: string;
    modelConfig: MarketingMediaModelConfig;
    input: MarketingMediaReplicateInput;
  }) => Promise<{ prediction: { id: string; status: string }; source: 'user' | 'platform' }>;
  saveJobReceipt: (predictionId: string, receipt: MarketingMediaJobReceipt) => Promise<void>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
};

const loadDefaultDependencies = async (): Promise<StartMarketingMediaGenerationDependencies> => {
  const [{ createMarketingMediaPrediction }, repository, jobStore, storage, energy] =
    await Promise.all([
      import('@/lib/ai/infrastructure/marketing-media-replicate'),
      import('@/lib/ai/infrastructure/marketing-media-repository'),
      import('@/lib/ai/infrastructure/marketing-media-job-store'),
      import('@/lib/ai/infrastructure/marketing-media-storage'),
      import('@/lib/finance/energy'),
    ]);

  return {
    findUserByEmail: repository.findMarketingMediaUserByEmail,
    findOwnedVenture: repository.findOwnedMarketingMediaVenture,
    uploadInputs: storage.uploadMarketingMediaInputs,
    reserveCreditsForGeneration,
    createPrediction: createMarketingMediaPrediction,
    saveJobReceipt: jobStore.saveMarketingMediaJobReceipt,
    refundEnergy: energy.refundEnergy,
  };
};

export async function startMarketingMediaGeneration(
  input: StartMarketingMediaGenerationInput,
  dependencies?: StartMarketingMediaGenerationDependencies
): Promise<MarketingMediaStartResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const parsed = parseMarketingMediaFormData(input.formData);
  const plan = resolveMarketingMediaGenerationPlan(parsed);

  const user = await resolvedDependencies.findUserByEmail(input.userEmail);
  if (!user) {
    throw new MarketingMediaNotFoundError('Benutzer nicht gefunden');
  }

  const venture = await resolvedDependencies.findOwnedVenture(input.ventureId, user.id);
  if (!venture) {
    throw new MarketingMediaNotFoundError('Venture nicht gefunden oder Zugriff verweigert');
  }

  const uploadedInputs = await resolvedDependencies.uploadInputs({
    userId: user.id,
    mode: plan.mode,
    imageFile: parsed.imageFile,
    endImageFile: parsed.endImageFile,
    existingImageUrl: parsed.existingImageUrl,
    existingEndImageUrl: parsed.existingEndImageUrl,
    imageFiles: parsed.imageFiles,
    requiresImageInput: Boolean(plan.modelConfig.supportsImageInput && plan.mode.includes('image-to')),
  });

  const finalPrompt = buildFinalMarketingMediaPrompt({
    prompt: plan.prompt,
    useBrandContext: parsed.useBrandContext,
    useCharacterPrompt: parsed.useCharacterPrompt,
    brandDNA: venture.brandDNA,
  });

  let reservationId: string | null = null;

  try {
    const reservation = await resolvedDependencies.reserveCreditsForGeneration({
      userId: user.id,
      ventureId: input.ventureId,
      requestId: input.requestId,
      mode: plan.mode,
      modelId: plan.modelConfig.id,
      cost: plan.cost,
      hourlyLimit: plan.hourlyLimit,
      isVideoOutput: plan.isVideoOutput,
      estimatedProviderCostEur: plan.estimatedProviderCostEur,
      estimatedProviderCostUsd: plan.estimatedProviderCostUsd,
    });
    reservationId = reservation.reservationId;

    const { prediction, source } = await resolvedDependencies.createPrediction({
      userId: user.id,
      modelConfig: plan.modelConfig,
      input: {
        prompt: finalPrompt,
        negativePrompt: plan.negativePrompt || undefined,
        aspectRatio: plan.aspectRatio,
        seed: plan.seed,
        steps: plan.steps,
        guidance: plan.guidance,
        duration: plan.duration,
        generateAudio: plan.generateAudio,
        imageUrl: uploadedInputs.imageUrl,
        endImageUrl: uploadedInputs.endImageUrl,
        width: 0,
        height: 0,
      },
    });

    await resolvedDependencies.saveJobReceipt(prediction.id, {
      ventureId: input.ventureId,
      userId: user.id,
      replicateAuthSource: source,
      mode: plan.mode,
      model: plan.modelConfig.id,
      prompt: plan.prompt,
      aspectRatio: plan.aspectRatio,
      cost: plan.cost,
      reservationId,
      originTag: plan.originTag,
      outputType: plan.modelConfig.outputType,
      estimatedProviderCostEur: plan.estimatedProviderCostEur,
      estimatedProviderCostUsd: plan.estimatedProviderCostUsd,
      fxRate: process.env.USD_EUR_RATE ? Number(process.env.USD_EUR_RATE) : undefined,
      createdAt: new Date().toISOString(),
    });

    return {
      predictionId: prediction.id,
      status: prediction.status,
      provider: 'replicate',
      creditsUsed: plan.cost,
    };
  } catch (error) {
    if (reservationId) {
      await resolvedDependencies.refundEnergy(reservationId, 'generation-failed');
    }
    throw error;
  }
}
