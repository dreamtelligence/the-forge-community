/**
 * Centralized AI Media Model Registry - January 2026 Edition
 */

export type MediaProvider = 'replicate' | 'openai';
export type ModelTier = 'turbo' | 'pro';

export interface ModelDefinition {
  id: string;
  provider: MediaProvider;
  tier: ModelTier;
  label: string;
  cost: number;
  type: 'image' | 'video';
  aspectRatios: string[];
}

export const IMAGE_MODELS: Record<string, ModelDefinition> = {
  // FORUM / FAST USE (nur Forum)
  'flux-schnell': {
    id: 'black-forest-labs/flux-schnell',
    provider: 'replicate',
    tier: 'turbo',
    label: 'Flux Schnell (Speed)',
    cost: 2,
    type: 'image',
    aspectRatios: ['1:1', '16:9', '9:16'],
  },
  // STUDIO / MARKETING PRO
  'flux-1.1-pro': {
    id: 'black-forest-labs/flux-1.1-pro',
    provider: 'replicate',
    tier: 'pro',
    label: 'Flux 1.1 Pro (Gold Standard)',
    cost: 15,
    type: 'image',
    aspectRatios: ['1:1', '16:9', '9:16', '4:5', '3:2'],
  },
  'flux-2-pro': {
    id: 'black-forest-labs/flux-2-pro',
    provider: 'replicate',
    tier: 'pro',
    label: 'Flux 2 Pro (Photorealism)',
    cost: 25,
    type: 'image',
    aspectRatios: ['1:1', '16:9', '9:16', '21:9'],
  },
};

export const VIDEO_MODELS: Record<string, ModelDefinition> = {
  'kling-v2.6': {
    id: 'kwaivgi/kling-v2.6',
    provider: 'replicate',
    tier: 'pro',
    label: 'Kling 2.6 Pro (Cinema + Audio)',
    cost: 55,
    type: 'video',
    aspectRatios: ['16:9', '9:16', '4:5'],
  },
  'sora-2': {
    id: 'openai/sora-2',
    provider: 'replicate',
    tier: 'pro',
    label: 'Sora 2 (Flagship + Synced Audio)',
    cost: 60,
    type: 'video',
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  'veo-3.1': {
    id: 'google/veo-3.1',
    provider: 'replicate',
    tier: 'pro',
    label: 'Veo 3.1 (Context-Aware Audio)',
    cost: 58,
    type: 'video',
    aspectRatios: ['16:9', '9:16'],
  },
  'minimax-video-01': {
    id: 'minimax/video-01',
    provider: 'replicate',
    tier: 'pro',
    label: 'Minimax Video (Human Motion)',
    cost: 45,
    type: 'video',
    aspectRatios: ['16:9', '9:16'],
  },
  'luma-dream-machine': {
    id: 'lumaai/dream-machine',
    provider: 'replicate',
    tier: 'pro',
    label: 'Luma Dream Machine (Atmospheric)',
    cost: 40,
    type: 'video',
    aspectRatios: ['16:9', '9:16'],
  },
  // Legacy (keep for backward compat)
  'kling-v1.5-pro': {
    id: 'kwaivgi/kling-v1.5-pro',
    provider: 'replicate',
    tier: 'pro',
    label: 'Kling 1.5 Pro (Legacy)',
    cost: 50,
    type: 'video',
    aspectRatios: ['16:9', '9:16', '4:5'],
  },
};

export interface FaceSwapModelDefinition {
  id: string;
  provider: MediaProvider;
  tier: ModelTier;
  label: string;
  cost: number;
  description: string;
}

export interface LipSyncModelDefinition {
  id: string;
  provider: MediaProvider;
  tier: ModelTier;
  label: string;
  cost: number;
  description: string;
  input: 'video+audio';
}

export const FACESWAP_MODELS: Record<string, FaceSwapModelDefinition> = {
  'lucataco-faceswap': {
    id: 'lucataco/faceswap',
    provider: 'replicate',
    tier: 'pro',
    label: 'Face Swap Pro (Roop)',
    cost: 50,
    description: 'High-quality face replacement in videos. Best for ads and content creation.',
  },
  'codeplugtech-faceswap': {
    id: 'codeplugtech/face-swap',
    provider: 'replicate',
    tier: 'pro',
    label: 'CodePlug Face Swap',
    cost: 45,
    description: 'Fast face swap with good quality. Ideal for quick iterations.',
  },
  'live-portrait': {
    id: 'fofr/live-portrait',
    provider: 'replicate',
    tier: 'pro',
    label: 'Live Portrait Pro (Character Animation)',
    cost: 65,
    description: 'Animate any model image with your own video movements. Perfect for professional avatars.',
  },
};

export const LIPSYNC_MODELS: Record<string, LipSyncModelDefinition> = {
  preview: {
    id: 'sync/lipsync-2',
    provider: 'replicate',
    tier: 'pro',
    label: 'Lip Sync Preview (Fast)',
    cost: 18,
    description: 'Fast preview for talking-head and UGC clips.',
    input: 'video+audio',
  },
  final: {
    id: 'sync/lipsync-2-pro',
    provider: 'replicate',
    tier: 'pro',
    label: 'Lip Sync Final (Studio)',
    cost: 45,
    description: 'Studio-quality lip sync with higher fidelity.',
    input: 'video+audio',
  },
};

export interface MotionTransferModelDefinition {
  id: string;
  provider: MediaProvider;
  tier: ModelTier;
  label: string;
  cost: number;
  description: string;
  input: 'video+image';
  resolutions: string[];
  maxDuration: number;
}

export const MOTION_TRANSFER_MODELS: Record<string, MotionTransferModelDefinition> = {
  'wan-2.2-animate': {
    id: 'wan-video/wan-2.2-animate-animation',
    provider: 'replicate',
    tier: 'pro',
    label: 'Wan 2.2 Animate (Full Body Motion Transfer)',
    cost: 50,
    description: 'Transfer full body motion from driving video to character image. Up to 120s at 720p with audio.',
    input: 'video+image',
    resolutions: ['480', '720'],
    maxDuration: 120,
  },
};

export const DEFAULT_MODELS = {
  forum: IMAGE_MODELS['flux-schnell'],
  studio_image: IMAGE_MODELS['flux-2-pro'],
  studio_video: VIDEO_MODELS['kling-v2.6'], // Updated to latest
  studio_faceswap: FACESWAP_MODELS['lucataco-faceswap'],
  studio_lipsync: LIPSYNC_MODELS.final,
  studio_motion_transfer: MOTION_TRANSFER_MODELS['wan-2.2-animate'],
};
