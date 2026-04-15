import { MOTION_TRANSFER_MODELS } from '@/lib/media-models';
import type {
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

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_RESOLUTIONS = new Set(['480', '720']);

type StartMotionTransferGenerationInput = {
  userEmail: string | null;
  ventureId: string;
  requestId: string;
  formData: FormData;
  isDryRun: boolean;
  isDevelopment: boolean;
};

type StartMotionTransferGenerationDependencies = {
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  findOwnedVenture: (
    ventureId: string,
    ownerId: string
  ) => Promise<{ id: string } | null>;
  getUserTier: (userId: string) => Promise<string>;
  reserveEnergy: (input: {
    userId: string;
    amount: number;
    feature: string;
    requestId: string;
    metadata: Record<string, unknown>;
  }) => Promise<{ reservationId: string }>;
  refundEnergy: (reservationId: string, reason: string) => Promise<unknown>;
  checkDailyVideoQuota: (userId: string) => Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: Date;
  }>;
  uploadInputs: (input: {
    userId: string;
    characterImage: LegacyReplicateUploadFile;
    drivingVideo: LegacyReplicateUploadFile;
  }) => Promise<{ drivingVideoUrl: string; characterImageUrl: string }>;
  createPrediction: (input: {
    userId: string;
    model: string;
    input: Record<string, unknown>;
  }) => Promise<{ prediction: { id: string; status: string }; source: 'user' | 'platform' }>;
  saveJobReceipt: (predictionId: string, receipt: Record<string, unknown>) => Promise<void>;
};

const loadDefaultDependencies = async (): Promise<StartMotionTransferGenerationDependencies> => {
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
    getUserTier: energy.getUserTier,
    reserveEnergy: energy.reserveEnergy,
    refundEnergy: energy.refundEnergy,
    checkDailyVideoQuota: energy.checkDailyVideoQuota,
    uploadInputs: storage.uploadMotionTransferInputs,
    createPrediction: replicate.createReplicatePrediction,
    saveJobReceipt: jobStore.writeMotionTransferJobReceipt,
  };
};

const parseFormNumber = (value: FormDataEntryValue | null, fallback: number) => {
  if (typeof value !== 'string') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isUploadFile = (value: FormDataEntryValue | null): value is LegacyReplicateUploadFile =>
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
  input: StartMotionTransferGenerationInput,
  dependencies: StartMotionTransferGenerationDependencies
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

export async function startMotionTransferGeneration(
  input: StartMotionTransferGenerationInput,
  dependencies?: StartMotionTransferGenerationDependencies
): Promise<LegacyReplicateStartResult> {
  const resolvedDependencies = dependencies ?? (await loadDefaultDependencies());
  const modelKey = String(input.formData.get('model') || 'wan-2.2-animate');
  const drivingVideoFile = input.formData.get('drivingVideo');
  const characterImageFile = input.formData.get('characterImage');
  const resolution = String(input.formData.get('resolution') || '720');
  const refertNum = parseFormNumber(input.formData.get('refertNum'), 5);
  const fps = parseFormNumber(input.formData.get('fps'), 24);
  const mergeAudio = String(input.formData.get('mergeAudio') || 'true') === 'true';
  const goFast = String(input.formData.get('goFast') || 'true') === 'true';

  if (!isUploadFile(drivingVideoFile)) {
    throw new LegacyReplicateValidationError('Driving Video ist erforderlich');
  }

  if (!isUploadFile(characterImageFile)) {
    throw new LegacyReplicateValidationError('Character Image ist erforderlich');
  }

  const modelConfig = MOTION_TRANSFER_MODELS[modelKey];
  if (!modelConfig) {
    throw new LegacyReplicateValidationError('Ungültiges Modell');
  }

  if (drivingVideoFile.size > MAX_VIDEO_BYTES) {
    throw new LegacyReplicateValidationError('Video ist zu groß (max 100MB)', 413);
  }
  if (characterImageFile.size > MAX_IMAGE_BYTES) {
    throw new LegacyReplicateValidationError('Character Image ist zu groß (max 10MB)', 413);
  }
  if (!ALLOWED_VIDEO_TYPES.has(drivingVideoFile.type)) {
    throw new LegacyReplicateValidationError('Ungültiges Video-Format (nur MP4/MOV/WebM)', 415);
  }
  if (!ALLOWED_IMAGE_TYPES.has(characterImageFile.type)) {
    throw new LegacyReplicateValidationError('Ungültiges Bild-Format (nur JPG/PNG/WebP)', 415);
  }
  if (!ALLOWED_RESOLUTIONS.has(resolution)) {
    throw new LegacyReplicateValidationError('Ungültige Auflösung (480 oder 720)');
  }

  const user = await resolveUserContext(input, resolvedDependencies);

  if (!(input.isDryRun && input.isDevelopment && user.id === 'mock-user-id')) {
    const venture = await resolvedDependencies.findOwnedVenture(input.ventureId, user.id);
    if (!venture) {
      throw new LegacyReplicateNotFoundError('Venture nicht gefunden oder Zugriff verweigert');
    }
  }

  const tier =
    input.isDryRun && input.isDevelopment && user.id === 'mock-user-id'
      ? 'pro'
      : await resolvedDependencies.getUserTier(user.id);

  if (input.isDryRun) {
    return {
      predictionId: 'dry-run-prediction-id',
      status: 'succeeded',
      provider: 'replicate',
      model: modelConfig.label,
      creditsUsed: 0,
      tier,
      outputUrl: 'https://placehold.co/1080x1920.mp4?text=Dry+Run+Output',
      mock: true,
    };
  }

  let reservationId: string | null = null;

  try {
    const reservation = await resolvedDependencies.reserveEnergy({
      userId: user.id,
      amount: modelConfig.cost,
      feature: 'marketing.motion-transfer',
      requestId: input.requestId,
      metadata: {
        ventureId: input.ventureId,
        model: modelConfig.id,
        cost: modelConfig.cost,
        tier,
      },
    });
    reservationId = reservation.reservationId;

    const dailyQuota = await resolvedDependencies.checkDailyVideoQuota(user.id);
    if (!dailyQuota.allowed) {
      await resolvedDependencies.refundEnergy(reservationId, 'daily-quota-exceeded');
      reservationId = null;
      throw new LegacyReplicateQuotaExceededError(
        `Tageslimit für Motion Transfer erreicht (${dailyQuota.limit}/Tag). Reset: ${dailyQuota.resetAt.toLocaleTimeString('de-DE')}`,
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
      characterImage: characterImageFile,
      drivingVideo: drivingVideoFile,
    });

    const { prediction, source } = await resolvedDependencies.createPrediction({
      userId: user.id,
      model: modelConfig.id,
      input: {
        video: uploaded.drivingVideoUrl,
        character_image: uploaded.characterImageUrl,
        resolution,
        refert_num: refertNum,
        frames_per_second: fps,
        merge_audio: mergeAudio,
        go_fast: goFast,
      },
    });

    await resolvedDependencies.saveJobReceipt(prediction.id, {
      ventureId: input.ventureId,
      userId: user.id,
      replicateAuthSource: source,
      model: modelConfig.id,
      cost: modelConfig.cost,
      reservationId,
      drivingVideoUrl: uploaded.drivingVideoUrl,
      characterImageUrl: uploaded.characterImageUrl,
      createdAt: new Date().toISOString(),
    });

    return {
      predictionId: prediction.id,
      status: prediction.status,
      provider: 'replicate',
      model: modelConfig.label,
      creditsUsed: modelConfig.cost,
      tier,
    };
  } catch (error) {
    if (reservationId) {
      await resolvedDependencies.refundEnergy(reservationId, 'motion-transfer-failed');
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
      throw new LegacyReplicateConfigurationError(error.message || 'Motion Transfer fehlgeschlagen');
    }

    throw new LegacyReplicateConfigurationError('Motion Transfer fehlgeschlagen');
  }
}
