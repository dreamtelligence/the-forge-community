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

const limitedAspectModels = new Set([
  'kwaivgi/kling-v1.5-pro',
  'minimax/video-01',
  'lumaai/dream-machine',
]);

export const buildMarketingMediaReplicateInput = (
  modelId: string,
  options: MarketingMediaReplicateInput
) => {
  const safeAspectRatio =
    limitedAspectModels.has(modelId) && !['16:9', '9:16'].includes(options.aspectRatio)
      ? '16:9'
      : options.aspectRatio;

  switch (modelId) {
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
    case 'kwaivgi/kling-v2.6': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: safeAspectRatio,
      };
      if (options.imageUrl && typeof options.imageUrl === 'string') input.image = options.imageUrl;
      if (typeof options.duration === 'number') input.duration = options.duration;
      if (typeof options.guidance === 'number') input.guidance_scale = options.guidance;
      if (options.negativePrompt) input.negative_prompt = options.negativePrompt;
      if (typeof options.generateAudio === 'boolean') input.generate_audio = options.generateAudio;
      return input;
    }
    case 'kwaivgi/kling-v1.5-pro': {
      if (!options.imageUrl) {
        throw new MarketingMediaConfigurationError('Referenzbild fehlt.');
      }
      const input: Record<string, unknown> = {
        image: options.imageUrl,
        prompt: options.prompt,
        aspect_ratio: safeAspectRatio,
      };
      if (typeof options.duration === 'number') input.duration = options.duration;
      if (typeof options.guidance === 'number') input.guidance_scale = options.guidance;
      return input;
    }
    case 'minimax/video-01':
    case 'lumaai/dream-machine':
      return {
        prompt: options.prompt,
        aspect_ratio: safeAspectRatio,
      };
    case 'google/veo-3.1': {
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: safeAspectRatio,
      };
      if (options.imageUrl) input.image = options.imageUrl;
      if (options.endImageUrl) input.end_image = options.endImageUrl;
      if (typeof options.duration === 'number') input.duration = options.duration;
      if (typeof options.seed === 'number') input.seed = options.seed;
      if (options.negativePrompt) input.negative_prompt = options.negativePrompt;
      if (typeof options.generateAudio === 'boolean') input.generate_audio = options.generateAudio;
      return input;
    }
    case 'openai/sora-2': {
      const soraAspect =
        safeAspectRatio === '9:16'
          ? 'portrait'
          : safeAspectRatio === '16:9'
            ? 'landscape'
            : 'landscape';
      const input: Record<string, unknown> = {
        prompt: options.prompt,
        aspect_ratio: soraAspect,
      };
      if (options.imageUrl && typeof options.imageUrl === 'string') {
        input.input_reference = options.imageUrl;
      }
      if (typeof options.duration === 'number') input.seconds = options.duration;
      return input;
    }
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

export const extractMarketingMediaOutputUrls = async (output: unknown) => {
  if (!output) return [];
  if (Array.isArray(output)) {
    const urls = await Promise.all(output.map((item) => normalizeOutputUrl(item)));
    return urls.filter(Boolean) as string[];
  }
  const single = await normalizeOutputUrl(output);
  return single ? [single] : [];
};

const resolveReplicateWebhookConfig = () => {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  const webhookUrl =
    appUrl && appUrl.startsWith('https://') ? `${appUrl}/api/webhooks/replicate` : undefined;

  if (!webhookUrl) return {};

  return {
    webhook: webhookUrl,
    webhook_events_filter: ['start', 'output', 'logs', 'completed'],
  };
};
