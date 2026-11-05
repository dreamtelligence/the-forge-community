import { FACESWAP_MODELS } from '@/lib/media-models';
import type {
  LegacyReplicateJobReceipt,
  LegacyReplicateStartResult,
  LegacyReplicateUploadFile,
} from '@/lib/ai/contracts/legacy-replicate-job';
import {
  LegacyReplicateConfigurationError,
  LegacyReplicateCreditsError,
  LegacyReplicateNotFoundError,
  LegacyReplicateQuotaExceededError,
  LegacyReplicateValidationError,
} from '@/lib/ai/contracts/legacy-replicate-job';

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type StartFaceSwapGenerationInput = {
  userEmail: string | null;
  ventureId: string;
  requestId: string;
  formData: FormData;
  isDryRun: boolean;
  isDevelopment: boolean;
};

type StartFaceSwapGenerationDependencies = {
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  findOwnedVenture: (
    ventureId: string,
    ownerId: string
  ) => Promise<{ id: string } | null>;
  reserveEnergy: (input: {
    userId: string;
    amount: number;
    feature: string;
    requestId: string;
    metadata: Record<string, unknown>;
  }) => Promise<{ reservationId: string }>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
  checkMonthlyAvatarQuota: (userId: string) => Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: Date;
  }>;
  checkDailyVideoQuota: (userId: string) => Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: Date;
  }>;
  uploadInputs: (input: {
    userId: string;
    face: LegacyReplicateUploadFile;
    video: LegacyReplicateUploadFile;
  }) => Promise<{ faceUrl: string; videoUrl: string }>;
  createPrediction: (input: {
    userId: string;
    model: string;
    input: Record<string, unknown>;
  }) => Promise<{ prediction: { id: string; status: string }; source: 'user' | 'platform' }>;
  saveJobReceipt: (
    predictionId: string,
    receipt: LegacyReplicateJobReceipt
  ) => Promise<void>;
};

const loadDefaultDependencies = async (): Promise<StartFaceSwapGenerationDependencies> => {
  const [repository, energy, storage, replicate, jobStore] = await Promise.all([
    import('@/lib/ai/infrastructure/marketing-media-repository'),
    import('@/lib/finance/energy'),
    import('@/lib/ai/infrastructure/legacy-replicate-input-storage'),
    import('@/lib/ai/infrastructure/marketing-media-replicate'),
    import('@/lib/ai/infrastructure/legacy-replicate-job-store'),
  ]);

  return {
    findUserByEmail: repository.findMarketingMediaUserByEmail,
    findOwnedVenture: repository.findOwnedMarketingMediaVenture,
    reserveEnergy: energy.reserveEnergy,
    refundEnergy: energy.refundEnergy,
    checkMonthlyAvatarQuota: energy.checkMonthlyAvatarQuota,
    checkDailyVideoQuota: energy.checkDailyVideoQuota,
    uploadInputs: storage.uploadFaceSwapInputs,
    createPrediction: replicate.createReplicatePrediction,
    saveJobReceipt: jobStore.writeFaceSwapJobReceipt,
  };
};

const isUploadFile = (value: unknown): value is LegacyReplicateUploadFile =>
  Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && 'type' in value);

const isInsufficientEnergyError = (
  error: unknown
): error is { message: string; requiredCredits?: number; creditsAvailable?: number } =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      'requiredCredits' in error &&
      'creditsAvailable' in error
  );

const resolveUserContext = async (
  input: StartFaceSwapGenerationInput,
  dependencies: StartFaceSwapGenerationDependencies
) => {
  if (input.isDryRun && input.isDevelopment && !input.userEmail) {
    return { id: 'mock-user-id' };
  }

  if (!input.userEmail) {
    throw new LegacyReplicateNotFoundError('Benutzer nicht gefunden');
  }

  const user = await dependencies.findUserByEmail(input.userEmail);
  if (!user) {
    throw new LegacyReplicateNotFoundError('Benutzer nicht gefunden');
  }

  return user;
};

export async function startFaceSwapGeneration(
  input: StartFaceSwapGenerationInput,
  dependencies?: StartFaceSwapGenerationDependencies
): Promise<LegacyReplicateStartResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const modelKey = String(input.formData.get('model') || 'live-portrait');
  const videoFile = input.formData.get('video');
  const faceFile = input.formData.get('face');

  if (!isUploadFile(faceFile) || !isUploadFile(videoFile)) {
    throw new LegacyReplicateValidationError('Video und Referenzbild sind erforderlich');
  }

  const modelConfig = FACESWAP_MODELS[modelKey];
  if (!modelConfig) {
    throw new LegacyReplicateValidationError('Ungültiges Modell');
  }

  if (videoFile.size > MAX_VIDEO_BYTES) {
    throw new LegacyReplicateValidationError('Video ist zu groß (max 50MB)', 413);
  }
  if (faceFile.size > MAX_IMAGE_BYTES) {
    throw new LegacyReplicateValidationError('Referenzbild ist zu groß (max 10MB)', 413);
  }
  if (!ALLOWED_VIDEO_TYPES.has(videoFile.type)) {
    throw new LegacyReplicateValidationError('Ungültiges Video-Format (nur MP4/MOV)', 415);
  }
  if (!ALLOWED_IMAGE_TYPES.has(faceFile.type)) {
    throw new LegacyReplicateValidationError('Ungültiges Bild-Format (nur JPG/PNG/WebP)', 415);
  }

  const user = await resolveUserContext(input, resolvedDependencies);

  if (!(input.isDryRun && input.isDevelopment && user.id === 'mock-user-id')) {
    const venture = await resolvedDependencies.findOwnedVenture(input.ventureId, user.id);
    if (!venture) {
      throw new LegacyReplicateNotFoundError('Venture nicht gefunden oder Zugriff verweigert');
    }
  }

  if (input.isDryRun) {
    return {
      predictionId: 'dry-run-prediction-id',
      status: 'succeeded',
      provider: 'replicate',
      model: modelConfig.label,
      creditsUsed: 0,
      outputUrl: 'https://placehold.co/1080x1920.mp4?text=Dry+Run+Output',
      mock: true,
    };
  }

  let reservationId: string | null = null;

  try {
    const reservation = await resolvedDependencies.reserveEnergy({
      userId: user.id,
      amount: modelConfig.cost,
      feature: 'marketing.faceswap',
      requestId: input.requestId,
      metadata: {
        ventureId: input.ventureId,
        model: modelConfig.id,
        cost: modelConfig.cost,
      },
    });
    reservationId = reservation.reservationId;

    const monthlyQuota = await resolvedDependencies.checkMonthlyAvatarQuota(user.id);
    if (!monthlyQuota.allowed) {
      await resolvedDependencies.refundEnergy(reservationId, 'monthly-quota-exceeded');
      reservationId = null;
      throw new LegacyReplicateQuotaExceededError(
        `Monatslimit erreicht (${monthlyQuota.limit}/Monat). Reset: ${monthlyQuota.resetAt.toLocaleDateString('de-DE')}`,
        {
          quota: {
            limit: monthlyQuota.limit,
            remaining: monthlyQuota.remaining,
            resetAt: monthlyQuota.resetAt.toISOString(),
          },
        }
      );
    }

    const dailyQuota = await resolvedDependencies.checkDailyVideoQuota(user.id);
    if (!dailyQuota.allowed) {
      await resolvedDependencies.refundEnergy(reservationId, 'daily-quota-exceeded');
      reservationId = null;
      throw new LegacyReplicateQuotaExceededError(
        `Tageslimit für Avatar Swap erreicht (${dailyQuota.limit}/Tag). Reset: ${dailyQuota.resetAt.toLocaleTimeString('de-DE')}`,
        {
          quota: {
            limit: dailyQuota.limit,
            remaining: dailyQuota.remaining,
            resetAt: dailyQuota.resetAt.toISOString(),
          },
        }
      );
    }

    const uploaded = await resolvedDependencies.uploadInputs({
      userId: user.id,
      face: faceFile,
      video: videoFile,
    });

    // Feldnamen laut replicate.com/fofr/live-portrait/api/schema
    const predictionInput = {
      face_image: uploaded.faceUrl,
      driving_video: uploaded.videoUrl,
      live_portrait_eye_retargeting: true,
      live_portrait_lip_zero: true,
      live_portrait_stitching: true,
      live_portrait_relative: true,
    };

    const { prediction, source } = await resolvedDependencies.createPrediction({
      userId: user.id,
      model: modelConfig.id,
      input: predictionInput,
    });

    await resolvedDependencies.saveJobReceipt(prediction.id, {
      ventureId: input.ventureId,
      userId: user.id,
      replicateAuthSource: source,
      model: modelConfig.id,
      cost: modelConfig.cost,
      reservationId,
      videoUrl: uploaded.videoUrl,
      faceUrl: uploaded.faceUrl,
      createdAt: new Date().toISOString(),
    });

    return {
      predictionId: prediction.id,
      status: prediction.status,
      provider: 'replicate',
      model: modelConfig.label,
      creditsUsed: modelConfig.cost,
    };
  } catch (error) {
    if (reservationId) {
      await resolvedDependencies.refundEnergy(reservationId, 'faceswap-failed');
    }

    if (error instanceof LegacyReplicateValidationError) throw error;
    if (error instanceof LegacyReplicateNotFoundError) throw error;
    if (error instanceof LegacyReplicateQuotaExceededError) throw error;
    if (error instanceof LegacyReplicateConfigurationError) throw error;

    if (isInsufficientEnergyError(error)) {
      throw new LegacyReplicateCreditsError(error.message, {
        requiredCredits: error.requiredCredits,
        creditsAvailable: error.creditsAvailable,
      });
    }

    if (error instanceof Error) {
      throw new LegacyReplicateConfigurationError(error.message || 'Avatar fehlgeschlagen');
    }

    throw new LegacyReplicateConfigurationError('Avatar fehlgeschlagen');
  }
}
