import {
  type MarketingMediaPrediction,
  MarketingMediaConfigurationError,
} from '@/lib/ai/contracts/marketing-media';
import {
  type MarketingMediaModelConfig,
  type MarketingMediaReplicateInput,
  resolveImageDimensions,
} from '@/lib/ai/domain/marketing-media';
import { getReplicateClientForUser } from '@/lib/integrations/provider-keys';

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

const REPLICATE_WEBHOOK_EVENTS: Array<'start' | 'output' | 'logs' | 'completed'> = [
  'start',
  'output',
  'logs',
  'completed',
];

const firstImage = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** 720p/1080p aus der UI; sonst 720p, damit Preis-Schaetzung und Abrechnung uebereinstimmen. */
const resolveVideoResolution = (value: string | null | undefined): '720p' | '1080p' =>
  value === '1080p' ? '1080p' : '720p';

/**
 * Baut den Replicate-Input je Modell. Feldnamen 1:1 aus den Live-Schemas
 * (replicate.com/<model>/api/schema, Stand 05.11.2026).
 */
export const buildMarketingMediaReplicateInput = (
  modelId: string,
  options: MarketingMediaReplicateInput
) => {
  const image = firstImage(options.imageUrl);

  switch (modelId) {
    case 'black-forest-labs/flux-3-image': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        resolution: '1k',
        // Websuche vor dem Generieren aus: keine Prompt-Weitergabe an Suchdienste, planbare Kosten
        grounding: false,
        output_format: 'jpg',
        output_quality: 95,
      };
      return input;
    }
    case 'black-forest-labs/flux-1.1-pro':
    case 'black-forest-labs/flux-2-pro': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        output_format: 'jpg',
        output_quality: 100,
      };
      if (typeof options.seed === 'number') input.seed = options.seed;
      return input;
    }
    case 'kwaivgi/kling-v4.0': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        resolution: resolveVideoResolution(options.resolution),
      };
      if (image) input.start_image = image;
      if (options.endImageUrl) input.end_image = options.endImageUrl;
      if (typeof options.duration === 'number') input.duration = options.duration;
      return input;
    }
    case 'kwaivgi/kling-v2.6': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
      };
      if (image) input.start_image = image;
      if (typeof options.duration === 'number') input.duration = options.duration;
      if (options.negativePrompt) input.negative_prompt = options.negativePrompt;
      if (typeof options.generateAudio === 'boolean') input.generate_audio = options.generateAudio;
      return input;
    }
    case 'minimax/h3': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        // 768P statt Default 2K: guenstiger und passend zur hinterlegten Rate
        resolution: '768P',
        ratio: image ? 'adaptive' : options.aspectRatio,
      };
      if (image) input.first_frame_image = image;
      if (options.endImageUrl) input.last_frame_image = options.endImageUrl;
      if (typeof options.duration === 'number') input.duration = options.duration;
      return input;
    }
    case 'minimax/video-01':
      return {
        prompt: options.prompt,
      };
    case 'luma/ray-3.2': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        resolution: '720p',
        duration: 5,
      };
      if (image) input.start_image = image;
      if (options.endImageUrl) input.end_image = options.endImageUrl;
      return input;
    }
    case 'google/veo-3.1': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        resolution: resolveVideoResolution(options.resolution),
      };
      if (image) input.image = image;
      if (options.endImageUrl) input.last_frame = options.endImageUrl;
      if (typeof options.duration === 'number') input.duration = options.duration;
      if (typeof options.seed === 'number') input.seed = options.seed;
      if (options.negativePrompt) input.negative_prompt = options.negativePrompt;
      if (typeof options.generateAudio === 'boolean') input.generate_audio = options.generateAudio;
      return input;
    }
    case 'openai/sora-2': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio === '9:16' ? 'portrait' : 'landscape',
      };
      if (image) input.input_reference = image;
      if (typeof options.duration === 'number') input.seconds = options.duration;
      return input;
    }
    case 'google/nano-banana-2.1':
    case 'google/nano-banana': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        output_format: 'jpg',
      };
      if (options.imageUrl) {
        input.image_input = Array.isArray(options.imageUrl) ? options.imageUrl : [options.imageUrl];
      }
      return input;
    }
    default: {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        output_format: 'png',
        output_quality: 90,
      };
      if (options.negativePrompt) input.negative_prompt = options.negativePrompt;
      return input;
    }
  }
};

export const createMarketingMediaPrediction = async (params: {
  userId: string;
  modelConfig: MarketingMediaModelConfig;
  input: MarketingMediaReplicateInput;
}) => {
  const clientContext = await getReplicateClientForUser(params.userId);
  if (!clientContext) {
    throw new MarketingMediaConfigurationError(
      'Kein Replicate Key konfiguriert. Bitte hinterlege BYOK oder setze den Plattform-Key.'
    );
  }

  const dimensions = resolveImageDimensions(params.input.aspectRatio);
  const prediction = await clientContext.client.predictions.create({
    model: params.modelConfig.id,
    input: buildMarketingMediaReplicateInput(params.modelConfig.id, {
      ...params.input,
      width: dimensions.width,
      height: dimensions.height,
    }),
    ...resolveReplicateWebhookConfig(),
  });

  return {
    prediction: prediction as MarketingMediaPrediction,
    source: clientContext.source,
  };
};

export const createReplicatePrediction = async (params: {
  userId: string;
  model: string;
  input: Record<string, unknown>;
  /** false = kein Webhook (Job wird per Polling abgeholt, z. B. Veo Studio). */
  webhook?: boolean;
}) => {
  const clientContext = await getReplicateClientForUser(params.userId);
  if (!clientContext) {
    throw new MarketingMediaConfigurationError(
      'Kein Replicate Key konfiguriert. Bitte hinterlege BYOK oder setze den Plattform-Key.'
    );
  }

  const prediction = await clientContext.client.predictions.create({
    model: params.model,
    input: params.input,
    ...(params.webhook === false ? {} : resolveReplicateWebhookConfig()),
  });

  return {
    prediction: prediction as MarketingMediaPrediction,
    source: clientContext.source,
  };
};

export const getMarketingMediaPrediction = async (userId: string, predictionId: string) => {
  const clientContext = await getReplicateClientForUser(userId);
  if (!clientContext) {
    throw new MarketingMediaConfigurationError(
      'Kein Replicate Key verfügbar. Bitte BYOK oder Plattform-Key konfigurieren.'
    );
  }

  const prediction = await clientContext.client.predictions.get(predictionId);
  return prediction as MarketingMediaPrediction;
};

export const getReplicatePrediction = getMarketingMediaPrediction;

export const extractMarketingMediaOutputUrls = async (output: unknown) => {
  if (!output) return [];
  if (Array.isArray(output)) {
    const urls = await Promise.all(output.map((item) => normalizeOutputUrl(item)));
    return urls.filter(Boolean) as string[];
  }
  const single = await normalizeOutputUrl(output);
  return single ? [single] : [];
};

export const extractReplicateOutputUrls = extractMarketingMediaOutputUrls;

const resolveReplicateWebhookConfig = () => {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  const webhookUrl =
    appUrl && appUrl.startsWith('https://') ? `${appUrl}/api/webhooks/replicate` : undefined;

  if (!webhookUrl) return {};

  return {
    webhook: webhookUrl,
    webhook_events_filter: REPLICATE_WEBHOOK_EVENTS,
  };
};
