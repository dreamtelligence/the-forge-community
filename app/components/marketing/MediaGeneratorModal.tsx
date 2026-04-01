'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { BrandDNA } from '@prisma/client';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Video,
  Upload,
  Wand2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  Zap,
  BookOpen,
  Copy,
  Share2,
  ZoomIn,
  Scissors,
  Loader2
} from 'lucide-react';
import { getTemplatesByType, enrichPromptWithBrandDNA, type PromptTemplate } from '@/lib/prompt-templates';
import Hyperspeed, { hyperspeedPresets } from '@/app/components/visual/Hyperspeed';
import { MediaLightbox } from '@/app/components/media/MediaLightbox';
import { CreditsTopUpModal } from '@/app/components/billing/CreditsTopUpModal';

const MEDIA_MODES = [
  {
    id: 'text-to-image',
    label: 'Text → Image',
    description: 'Generiere Visuals aus einem Prompt.',
  },
  {
    id: 'text-to-video',
    label: 'Text → Video',
    description: 'Kurze Clips aus einem Text-Prompt.',
  },
  {
    id: 'image-to-video',
    label: 'Image → Video',
    description: 'Bewegung und Dynamik aus einem Bild heraus.',
  },
  {
    id: 'image-to-image',
    label: 'Images → Marketing Foto',
    description: 'Blend 2-3 Fotos zu einem einheitlichen Visual.',
  },
] as const;

type MediaMode = (typeof MEDIA_MODES)[number]['id'];

type ModelConfig = {
  id: string;
  label: string;
  outputType: 'image' | 'video';
  modes: MediaMode[];
  aspectRatios?: string[];
  defaults?: {
    aspectRatio?: string;
    steps?: number;
    guidance?: number;
    duration?: number;
    fps?: number;
    generateAudio?: boolean;
    outputResolution?: string;
  };
  ranges?: {
    steps?: { min: number; max: number; step?: number };
    guidance?: { min: number; max: number; step?: number };
    duration?: { min: number; max: number; step?: number };
    fps?: { min: number; max: number; step?: number };
  };
  outputResolutions?: { id: string; label: string; shortSide: number }[];
  allowedDurations?: number[];
  supportsImageInput?: boolean;
  supportsNegativePrompt?: boolean;
  supportsGuidance?: boolean;
  supportsSteps?: boolean;
  supportsSeed?: boolean;
  supportsDuration?: boolean;
  supportsFps?: boolean;
  supportsAudioToggle?: boolean;
  isEnabled?: boolean;
  disabledReason?: string;
};

const MODEL_CONFIGS: ModelConfig[] = [
  // ==================== IMAGE MODELS ====================
  // Replicate
  {
    id: 'black-forest-labs/flux-2-pro',
    label: 'Flux 2 Pro · Photorealism',
    outputType: 'image',
    modes: ['text-to-image'],
    supportsSeed: true,
    aspectRatios: ['1:1', '16:9', '9:16', '4:5', '3:2'],
    defaults: { aspectRatio: '4:5' },
  },
  {
    id: 'black-forest-labs/flux-1.1-pro',
    label: 'Flux 1.1 Pro · Detail + Text',
    outputType: 'image',
    modes: ['text-to-image'],
    supportsSeed: true,
    aspectRatios: ['1:1', '16:9', '9:16', '4:5', '3:2'],
    defaults: { aspectRatio: '1:1' },
  },

  // ==================== VIDEO MODELS ====================
  // Replicate
  {
    id: 'kwaivgi/kling-v2.6',
    label: 'Kling 2.6 Pro · Cinema + Audio',
    outputType: 'video',
    modes: ['text-to-video', 'image-to-video'],
    supportsImageInput: true,
    supportsNegativePrompt: true,
    supportsGuidance: true,
    supportsDuration: true,
    supportsAudioToggle: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    allowedDurations: [5, 10],
    defaults: { aspectRatio: '9:16', duration: 5, guidance: 7.5, generateAudio: true },
    ranges: {
      duration: { min: 5, max: 10, step: 5 },
      guidance: { min: 1, max: 15, step: 0.1 },
    },
  },
  {
    id: 'openai/sora-2',
    label: 'Sora 2 · Flagship + Synced Audio',
    outputType: 'video',
    modes: ['text-to-video', 'image-to-video'],
    supportsImageInput: true,
    supportsDuration: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaults: { aspectRatio: '16:9', duration: 4 },
    ranges: { duration: { min: 1, max: 8, step: 1 } },
  },
  {
    id: 'google/veo-3.1',
    label: 'Veo 3.1 · Context-Aware Audio',
    outputType: 'video',
    modes: ['text-to-video', 'image-to-video'],
    supportsImageInput: true,
    supportsNegativePrompt: true,
    supportsDuration: true,
    supportsSeed: true,
    supportsAudioToggle: true,
    aspectRatios: ['16:9', '9:16'],
    allowedDurations: [4, 6, 8],
    defaults: { aspectRatio: '16:9', duration: 4, generateAudio: true },
    ranges: { duration: { min: 4, max: 8, step: 2 } },
  },
  {
    id: 'minimax/video-01',
    label: 'Minimax Video · Human Motion',
    outputType: 'video',
    modes: ['text-to-video'],
    aspectRatios: ['16:9', '9:16'],
  },
  {
    id: 'lumaai/dream-machine',
    label: 'Luma Dream Machine · Atmospheric',
    outputType: 'video',
    modes: ['text-to-video'],
    aspectRatios: ['16:9', '9:16'],
  },
  {
    id: 'google/nano-banana',
    label: 'Nano Banana · Multi-Image Blending',
    outputType: 'image',
    modes: ['image-to-image'],
    supportsImageInput: true,
    aspectRatios: ['1:1', '4:5', '9:16', '16:9', '3:2'],
  },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square' },
  { id: '4:5', label: '4:5 Portrait' },
  { id: '9:16', label: '9:16 Story' },
  { id: '16:9', label: '16:9 Wide' },
  { id: '3:2', label: '3:2 Classic' },
];

type InspirationPreset = {
  id: string;
  label: string;
  aspectRatio: string;
  duration: number;
  prompts: string[];
  mode?: MediaMode;
  modelId?: string;
  fps?: number;
  outputResolution?: string;
  generateAudio?: boolean;
};

const INSPIRATION_PRESETS: InspirationPreset[] = [
  {
    id: 'tiktok',
    label: 'TikTok / Reels',
    aspectRatio: '9:16',
    duration: 6,
    prompts: [
      'High-energy vertical product reveal, dynamic camera moves, punchy lighting, clean background, subject fully in frame, marketing-ready, 1080p, crisp details.',
      'Trendy vertical social ad, fast but smooth motion, bold contrast, product hero centered with safe margins, no text, 1080p, highly polished.',
      'Viral-ready vertical short, energetic transitions, glossy product close-ups without tight crop, room for UI overlays, 1080p, premium look.',
    ],
  },
  {
    id: 'hero',
    label: 'Website Hero',
    aspectRatio: '16:9',
    duration: 8,
    prompts: [
      'Calm cinematic hero background, slow camera drift, soft light, minimal scene, seamless loop feel, subject centered with generous breathing room, 1080p.',
      'Elegant wide hero shot, gentle parallax, smooth gradients, premium studio lighting, no harsh cuts, looping-friendly, 1080p, clean composition.',
      'Brand hero backdrop, subtle motion, atmospheric depth, product showcased with safe margins, quiet cinematic tone, 1080p.',
    ],
  },
  {
    id: 'cinematic',
    label: 'Cinematic Film',
    aspectRatio: '16:9',
    duration: 8,
    prompts: [
      'Photoreal cinematic product film, dramatic lighting, shallow depth of field, slow dolly, rich textures, subject fully visible, 1080p.',
      'High-end commercial look, cinematic lensing, glossy highlights, controlled shadows, premium materials, no tight crop, 1080p.',
      'Luxury brand film aesthetic, cinematic composition, elegant motion, crisp detail, 1080p, marketing-grade output.',
    ],
  },
] as const;

const REALISM_SNIPPETS = {
  cameras: ['Canon EOS R3', 'Sony A7R V', 'Hasselblad X2D 100C', 'Leica M11', 'Nikon Z9', 'Fujifilm GFX 100S'],
  films: ['Kodak Portra 400', 'Fujifilm Velvia 50', 'Cinestill 800T', 'Ilford HP5'],
  lenses: ['85mm f/1.2', '35mm f/1.4', '24mm f/2.8', '100mm Macro'],
  lighting: ['Golden hour', 'Blue hour', 'Overcast soft light', 'Dappled sunlight', 'Rembrandt lighting', 'Butterfly lighting', 'Softbox', 'Rim light', 'Three-point lighting'],
  technical: ['Depth of field', 'Bokeh', 'Motion blur', 'Chromatic aberration', 'Film grain', 'High shutter speed'],
  photographers: ['Annie Leibovitz', 'Peter Lindbergh', 'Richard Avedon', 'Helmut Newton', 'Steve McCurry', 'Ansel Adams', 'Andreas Gursky', 'Gregory Crewdson', 'Roger Deakins'],
};

const REALISM_TEMPLATES = [
  {
    id: 'ultra-real-portrait',
    label: 'Ultra-Real Portrait',
    prompt:
      'Close-up portrait of [Subject], shot on Sony A7R V, 85mm f/1.2 lens, sharp focus on eyes, visible skin texture, soft window light from left, neutral background, cinematic color grading, raw photo',
  },
  {
    id: 'ecom-product',
    label: 'E-Commerce Product',
    prompt:
      'Professional product photography of [Product], centered composition, minimal podium, soft studio lighting, three-point lighting, high resolution, commercial advertisement style, shot on Phase One XF',
  },
  {
    id: 'candid-social',
    label: 'Candid Social',
    prompt:
      'Candid iPhone photo of [Subject], natural imperfections, slight grain, flash photography, authentic unposed moment, social media vibe',
  },
];

type MediaAsset = {
  id?: string;
  url: string;
  type: 'image' | 'video';
  isPublic?: boolean;
};

interface MediaGeneratorModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  ventureId: string;
  campaignId?: string | null;
  brandDNA?: BrandDNA | null;
  inline?: boolean;
  onAssetCreated?: (asset: any) => void;
  allowedModes?: MediaMode[];
  originTag?: string;
  initialPrompt?: string;
  startImageUrl?: string;
}

const getModelsForMode = (mode: MediaMode) =>
  MODEL_CONFIGS.filter((config) => config.modes.includes(mode));

const resolveModeOptions = (allowedModes?: MediaMode[]) => {
  if (!allowedModes || allowedModes.length === 0) return MEDIA_MODES;
  return MEDIA_MODES.filter((item) => allowedModes.includes(item.id));
};

const isModelEnabled = (config: ModelConfig) => config.isEnabled !== false;

const getDefaultMode = (allowedModes?: MediaMode[]) => {
  const modeOptions = resolveModeOptions(allowedModes);
  const first = modeOptions.find((item) => getModelsForMode(item.id).length > 0);
  return (first?.id ?? modeOptions[0]?.id ?? 'text-to-image') as MediaMode;
};

const getDefaultModelForMode = (mode: MediaMode) => getModelsForMode(mode)[0]?.id ?? '';

export function MediaGeneratorModal({
  isOpen = true,
  onClose,
  ventureId,
  campaignId,
  brandDNA,
  inline = false,
  onAssetCreated,
  allowedModes,
  originTag,
  initialPrompt,
  startImageUrl: initialStartImageUrl,
}: MediaGeneratorModalProps) {
  const modeOptions = useMemo(() => resolveModeOptions(allowedModes), [allowedModes]);
  const [mode, setMode] = useState<MediaMode>(() => getDefaultMode(allowedModes));
  const [model, setModel] = useState(getDefaultModelForMode(mode));
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].id);
  const [steps, setSteps] = useState(20);
  const [guidance, setGuidance] = useState(7.5);
  const [seed, setSeed] = useState('');
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState(24);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [outputResolution, setOutputResolution] = useState('');
  const [useBrandContext, setUseBrandContext] = useState(Boolean(brandDNA));
  const [useCharacterPrompt, setUseCharacterPrompt] = useState(Boolean(brandDNA?.characterPrompt));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRealismGuide, setShowRealismGuide] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Multi-Image Upload (for Nano Banana image-to-image)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [bgRemovedUrl, setBgRemovedUrl] = useState<string | null>(null);
  const [useBgRemoved, setUseBgRemoved] = useState(true);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [, setGenerationStartedAt] = useState<number | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [pendingPublish, setPendingPublish] = useState<Record<string, boolean>>({});
  const [lightboxAsset, setLightboxAsset] = useState<MediaAsset | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [predictionStatus, setPredictionStatus] = useState<string | null>(null);

  // Prompt Templates State
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [showTemplates, setShowTemplates] = useState(false);

  const availableModels = useMemo(() => getModelsForMode(mode), [mode]);
  const enabledModels = useMemo(
    () => availableModels.filter((item) => isModelEnabled(item)),
    [availableModels]
  );
  const selectedModel = availableModels.find((item) => item.id === model) ?? enabledModels[0];
  const isSelectedModelEnabled = selectedModel ? isModelEnabled(selectedModel) : false;
  const isVideoMode = selectedModel?.outputType === 'video' || mode.includes('video');
  const requiresImage = (mode === 'image-to-video' || mode === 'image-to-image') && Boolean(selectedModel?.supportsImageInput);
  const supportsNegativePrompt = Boolean(selectedModel?.supportsNegativePrompt);
  const supportsGuidance = Boolean(selectedModel?.supportsGuidance);
  const supportsSteps = Boolean(selectedModel?.supportsSteps);
  const supportsSeed = Boolean(selectedModel?.supportsSeed);
  const supportsDuration = Boolean(selectedModel?.supportsDuration);
  const supportsFps = Boolean(selectedModel?.supportsFps);
  const supportsAudioToggle = Boolean(selectedModel?.supportsAudioToggle);
  const outputResOptions = selectedModel?.outputResolutions ?? [];
  const supportsOutputResolution = outputResOptions.length > 0;
  const resolvedImagePreview = useBgRemoved && bgRemovedUrl ? bgRemovedUrl : imagePreview;
  const applyInspirationPreset = (presetId: InspirationPreset['id']) => {
    const preset = INSPIRATION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const pick = preset.prompts[Math.floor(Math.random() * preset.prompts.length)];
    setMode(preset.mode ?? 'text-to-video');
    setModel(preset.modelId ?? 'google/veo-3.1');
    setAspectRatio(preset.aspectRatio);
    setDuration(preset.duration);
    if (typeof preset.fps === 'number') setFps(preset.fps);
    if (typeof preset.generateAudio === 'boolean') setGenerateAudio(preset.generateAudio);
    if (preset.outputResolution) setOutputResolution(preset.outputResolution);
    setPrompt(pick);
    setNegativePrompt('');
    if (brandDNA) {
      setUseBrandContext(true);
    }
  };

  const appendToPrompt = (snippet: string) => {
    setPrompt((prev) => {
      const base = prev.trim();
      if (!base) return snippet;
      if (base.toLowerCase().includes(snippet.toLowerCase())) return base;
      return `${base}, ${snippet}`;
    });
  };

  const applyRealismTemplate = (templateId: string) => {
    const template = REALISM_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setPrompt(template.prompt);
  };
  const rangeDefaults = {
    steps: selectedModel?.ranges?.steps ?? { min: 1, max: 50, step: 1 },
    guidance: selectedModel?.ranges?.guidance ?? { min: 0, max: 20, step: 0.1 },
    duration: selectedModel?.ranges?.duration ?? { min: 1, max: 10, step: 1 },
    fps: selectedModel?.ranges?.fps ?? { min: 12, max: 60, step: 1 },
  };
  const baseAspectOptions = useMemo(() => {
    const allowed = selectedModel?.aspectRatios?.length
      ? selectedModel.aspectRatios
      : ASPECT_RATIOS.map((option) => option.id);
    return ASPECT_RATIOS.filter((option) => allowed.includes(option.id));
  }, [selectedModel]);

  const aspectOptions = useMemo(() => {
    if (mode === 'image-to-image') {
      return [{ id: 'match_input_image', label: 'Match Input' }, ...baseAspectOptions];
    }
    return baseAspectOptions;
  }, [mode, baseAspectOptions]);

  useEffect(() => {
    if (!isOpen && !inline) return;
    setErrorMessage('');
    setSuccessMessage('');
    setPredictionStatus(null);
  }, [isOpen, inline]);

  useEffect(() => {
    if (!initialPrompt || !initialPrompt.trim()) return;
    setPrompt(initialPrompt.trim());
  }, [initialPrompt]);

  useEffect(() => {
    if (!modeOptions.length) return;
    if (!modeOptions.some((item) => item.id === mode)) {
      setMode(getDefaultMode(allowedModes));
    }
  }, [modeOptions, mode, allowedModes]);

  useEffect(() => {
    if (!aspectOptions.length) return;
    if (!aspectOptions.some((option) => option.id === aspectRatio)) {
      setAspectRatio(aspectOptions[0].id);
    }
  }, [aspectOptions, aspectRatio]);

  useEffect(() => {
    if (mode === 'image-to-image') {
      setImageFile(null);
      return;
    }
    if (imageFiles.length) {
      setImageFiles([]);
    }
  }, [mode, imageFiles.length]);

  useEffect(() => {
    setBgRemovedUrl(null);
    setUseBgRemoved(true);
  }, [imageFile, mode]);

  useEffect(() => {
    if (!availableModels.length || !enabledModels.length) {
      setModel('');
      return;
    }
    if (!availableModels.some((item) => item.id === model) || !isSelectedModelEnabled) {
      setModel(enabledModels[0].id);
    }
  }, [availableModels, enabledModels, isSelectedModelEnabled, model]);

  useEffect(() => {
    if (!requiresImage) {
      setImageFile(null);
    }
  }, [requiresImage]);

  useEffect(() => {
    if (!supportsNegativePrompt) {
      setNegativePrompt('');
    }
  }, [supportsNegativePrompt]);

  useEffect(() => {
    if (!supportsDuration) {
      setDuration(4);
    }
  }, [supportsDuration]);

  useEffect(() => {
    if (!supportsAudioToggle) {
      setGenerateAudio(true);
    }
  }, [supportsAudioToggle]);

  useEffect(() => {
    if (!supportsOutputResolution) {
      setOutputResolution('');
    }
  }, [supportsOutputResolution]);

  useEffect(() => {
    if (!selectedModel) return;
    const defaults = selectedModel.defaults;
    if (defaults?.aspectRatio && aspectOptions.some((option) => option.id === defaults.aspectRatio)) {
      setAspectRatio(defaults.aspectRatio);
    }
    if (supportsSteps && typeof defaults?.steps === 'number') {
      setSteps(defaults.steps);
    }
    if (supportsGuidance && typeof defaults?.guidance === 'number') {
      setGuidance(defaults.guidance);
    }
    if (supportsDuration && typeof defaults?.duration === 'number') {
      setDuration(defaults.duration);
    }
    if (supportsAudioToggle && typeof defaults?.generateAudio === 'boolean') {
      setGenerateAudio(defaults.generateAudio);
    }
    if (supportsFps && typeof defaults?.fps === 'number') {
      setFps(defaults.fps);
    }
    if (supportsOutputResolution) {
      const preferred = defaults?.outputResolution ?? outputResOptions[0]?.id;
      if (preferred) setOutputResolution(preferred);
    }
  }, [selectedModel.id, supportsSteps, supportsGuidance, supportsDuration, supportsFps, supportsOutputResolution, aspectOptions, outputResOptions, selectedModel, supportsAudioToggle]);

  useEffect(() => {
    if (!supportsGuidance) {
      setGuidance(7.5);
    }
  }, [supportsGuidance]);

  useEffect(() => {
    if (!supportsSteps) {
      setSteps(20);
    }
  }, [supportsSteps]);

  useEffect(() => {
    if (!supportsSeed) {
      setSeed('');
    }
  }, [supportsSeed]);

  useEffect(() => {
    if (!supportsFps) {
      setFps(24);
    }
  }, [supportsFps]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Multi-Image Previews (Nano Banana)
  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviews([]);
      return;
    }
    const urls = imageFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [imageFiles]);

  const promptPlaceholder = useMemo(() => {
    if (mode === 'text-to-video') return 'z.B. Minimalistisches Produkt-Teasing mit weichen Lichtfahrten';
    if (mode === 'image-to-video') return 'z.B. Sanfte Kamerafahrt, leichte Stoffbewegung, cineastisch';
    return 'z.B. Studio Shot, natürliche Hauttöne, hochwertige Materialien, cleanes Layout';
  }, [mode]);

  const isUnmounted = useRef(false);
  const cancelRequested = useRef(false);
  const activeRequestController = useRef<AbortController | null>(null);
  const restoredPending = useRef(false);

  const pendingKey = useMemo(() => `forge-media-pending:${ventureId}`, [ventureId]);

  const savePendingJob = (payload: {
    ventureId: string;
    modelId: string;
    mode: MediaMode;
    outputType: 'image' | 'video';
    provider: 'replicate';
    predictionId?: string;
    startedAt: number;
  }) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(pendingKey, JSON.stringify(payload));
  };

  const clearPendingJob = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(pendingKey);
  };

  const pollLatestAsset = async (outputType: 'image' | 'video', maxWaitOverride?: number) => {
    const pollStart = Date.now();
    const maxWaitMs =
      typeof maxWaitOverride === 'number'
        ? maxWaitOverride
        : outputType === 'video'
          ? 1000 * 60 * 12
          : 1000 * 60 * 4;

    while (Date.now() - pollStart < maxWaitMs) {
      if (isUnmounted.current || cancelRequested.current) throw new Error('Operation aborted');
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const res = await fetch(`/api/ventures/${ventureId}/media/latest?type=${outputType}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.asset?.url) {
        setAssets([data.asset]);
        setPredictionStatus('succeeded');
        setSuccessMessage('Generierung abgeschlossen.');
        clearPendingJob();
        return;
      }
    }

    clearPendingJob();
    throw new Error('Timeout: Bitte später erneut prüfen.');
  };

  useEffect(() => {
    return () => {
      isUnmounted.current = true;
      cancelRequested.current = true;
      if (activeRequestController.current) {
        activeRequestController.current.abort();
        activeRequestController.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (restoredPending.current) return;
    restoredPending.current = true;
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(pendingKey);
    if (!raw) return;

    let pending: {
      ventureId: string;
      modelId: string;
      mode: MediaMode;
      outputType: 'image' | 'video';
      provider: 'replicate';
      predictionId?: string;
      startedAt: number;
    } | null = null;

    try {
      pending = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(pendingKey);
      return;
    }

    if (!pending || pending.ventureId !== ventureId) {
      window.localStorage.removeItem(pendingKey);
      return;
    }

    const maxAgeMs = pending.outputType === 'video' ? 1000 * 60 * 20 : 1000 * 60 * 8;
    if (!pending.startedAt || Date.now() - pending.startedAt > maxAgeMs) {
      window.localStorage.removeItem(pendingKey);
      return;
    }

    setMode(pending.mode);
    setModel(pending.modelId);
    cancelRequested.current = false;
    setPredictionStatus('processing');
    setSuccessMessage('Generierung wird wiederhergestellt...');
    setIsGenerating(true);
    setGenerationStartedAt(pending.startedAt ?? Date.now());

    const resume = async () => {
      try {
        if (pending?.predictionId) {
          await pollPrediction(pending.predictionId, pending.outputType);
        } else {
          await pollLatestAsset(pending.outputType);
        }
      } catch (error: any) {
        if (isUnmounted.current) return;
        setErrorMessage(error?.message || 'Generierung fehlgeschlagen.');
      } finally {
        if (!isUnmounted.current) {
          setIsGenerating(false);
          setGenerationStartedAt(null);
        }
      }
    };

    void resume();
  }, [pendingKey, pollLatestAsset, ventureId]);

  useEffect(() => {
    setUseCharacterPrompt(Boolean(brandDNA?.characterPrompt));
  }, [brandDNA?.characterPrompt]);

  const pollPrediction = async (
    predictionId: string,
    outputTypeOverride?: 'image' | 'video'
  ) => {
    const pollStart = Date.now();
    const outputType = outputTypeOverride ?? (isVideoMode ? 'video' : 'image');
    const maxWaitMs = outputType === 'video' ? 1000 * 60 * 12 : 1000 * 60 * 4;
    let attempt = 0;

    while (Date.now() - pollStart < maxWaitMs) {
      if (isUnmounted.current || cancelRequested.current) throw new Error('Operation aborted');
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 800 : 1800));
      attempt += 1;

      try {
        const res = await fetch(`/api/ventures/${ventureId}/marketing/media?predictionId=${predictionId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || 'Prediction fehlgeschlagen.');
        }

        if (isUnmounted.current) return;
        setPredictionStatus(data?.status || null);

        if (data?.status === 'succeeded') {
          setCreditsRemaining(data.creditsRemaining ?? null);
          const nextAssets = Array.isArray(data.assets) ? data.assets : [];
          if (nextAssets.length > 0) {
            setAssets(nextAssets);
            setSuccessMessage('Generierung abgeschlossen.');
            clearPendingJob();
            if (onAssetCreated) {
              nextAssets.forEach((asset: any) => onAssetCreated(asset));
            }
            return;
          }

          try {
            await pollLatestAsset(outputType, 15000);
            return;
          } catch {
            setSuccessMessage('Generierung abgeschlossen. Output wird in der Library angezeigt.');
            clearPendingJob();
            return;
          }
        }

        if (data?.status === 'failed' || data?.status === 'canceled') {
          clearPendingJob();
          throw new Error(data?.error || 'Generierung fehlgeschlagen.');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        throw err;
      }
    }

    clearPendingJob();
    throw new Error('Timeout: Bitte später erneut prüfen.');
  };

  const handlePublishAsset = async (assetId: string | undefined, nextPublic: boolean) => {
    if (!assetId || pendingPublish[assetId]) return;
    setPendingPublish((prev) => ({ ...prev, [assetId]: true }));
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/media/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, isPublic: nextPublic }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Veröffentlichen fehlgeschlagen.');
      }
      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === assetId ? { ...asset, isPublic: data.isPublic } : asset
        )
      );
      setSuccessMessage(data.isPublic ? 'Asset veröffentlicht.' : 'Asset privat gestellt.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Veröffentlichen fehlgeschlagen.');
    } finally {
      setPendingPublish((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    }
  };

  // Template Handlers
  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template);

    // Initialize placeholder values
    if (template.placeholders) {
      const initialValues: Record<string, string> = {};
      template.placeholders.forEach(ph => {
        initialValues[ph] = '';
      });
      setPlaceholderValues(initialValues);
    }
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;

    let finalPrompt = selectedTemplate.prompt;

    // Replace placeholders
    if (selectedTemplate.placeholders) {
      selectedTemplate.placeholders.forEach(ph => {
        const value = placeholderValues[ph] || '';
        finalPrompt = finalPrompt.replace(ph, value);
      });
    }

    // Enrich with Brand DNA if available
    if (brandDNA) {
      finalPrompt = enrichPromptWithBrandDNA(finalPrompt, brandDNA);
    }

    setPrompt(finalPrompt);
    setShowTemplates(false);
    setSelectedTemplate(null);
  };

  const handleRemoveBackground = async () => {
    if (mode === 'image-to-image') {
      setErrorMessage('BG Remover ist für Multi-Image aktuell deaktiviert.');
      return;
    }
    if (!imageFile && !imagePreview) {
      setErrorMessage('Bitte lade zuerst ein Bild hoch.');
      return;
    }

    setIsRemovingBg(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imagePreview) {
        formData.append('imageUrl', imagePreview);
      }

      const res = await fetch(`/api/ventures/${ventureId}/marketing/tools/rembg`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'RemBG fehlgeschlagen.');

      const nextUrl = data?.asset?.url;
      if (!nextUrl) throw new Error('Kein Ergebnis erhalten.');

      setBgRemovedUrl(nextUrl);
      setUseBgRemoved(true);
      if (data?.asset && onAssetCreated) onAssetCreated(data.asset);
      setSuccessMessage('Hintergrund entfernt & in der Library gespeichert.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'BG Remover fehlgeschlagen.');
    } finally {
      setIsRemovingBg(false);
    }
  };

  const availableTemplates = useMemo(() => {
    const type = isVideoMode ? 'video' : 'image';
    return getTemplatesByType(type);
  }, [isVideoMode]);

  if (!isOpen && !inline) return null;

  const handleGenerate = async () => {
    cancelRequested.current = false;
    if (activeRequestController.current) {
      activeRequestController.current.abort();
      activeRequestController.current = null;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setPredictionStatus(null);
    setCreditsRemaining(null);
    setCreditsUsed(null);
    setAssets([]);

    if (!prompt.trim()) {
      setErrorMessage('Bitte gib einen Prompt an.');
      return;
    }
    if (!selectedModel) {
      setErrorMessage('Kein Modell verfügbar.');
      return;
    }
    if (!isSelectedModelEnabled) {
      setErrorMessage('Dieses Modell ist aktuell deaktiviert.');
      return;
    }
    // Validation for image inputs
    if (requiresImage) {
      if (mode === 'image-to-image') {
        // Nano Banana: requires 2-3 images
        if (imageFiles.length < 2) {
          setErrorMessage('Bitte lade mindestens 2 Bilder hoch (max. 3).');
          return;
        }
      } else if (!imageFile) {
        setErrorMessage('Bitte lade ein Referenzbild hoch.');
        return;
      }
    }

    setIsGenerating(true);
    setGenerationStartedAt(Date.now());
    const controller = new AbortController();
    activeRequestController.current = controller;
    try {
      const pendingPayload = {
        ventureId,
        modelId: selectedModel.id,
        mode,
        outputType: isVideoMode ? 'video' : 'image',
        provider: 'replicate',
        startedAt: Date.now(),
      } as const;
      savePendingJob(pendingPayload);

      const formData = new FormData();
      formData.append('mode', mode);
      formData.append('model', selectedModel.id);
      formData.append('prompt', prompt.trim());
      if (supportsNegativePrompt && negativePrompt.trim()) {
        formData.append('negativePrompt', negativePrompt.trim());
      }
      formData.append('aspectRatio', aspectRatio);
      if (supportsSteps) formData.append('steps', String(steps));
      if (supportsGuidance) formData.append('guidance', String(guidance));
      if (supportsSeed && seed.trim()) formData.append('seed', seed.trim());

      // Single image upload (existing modes)
      if (requiresImage && mode !== 'image-to-image') {
        if (useBgRemoved && bgRemovedUrl) {
          formData.append('existingImageUrl', bgRemovedUrl);
        } else if (imageFile) {
          formData.append('image', imageFile);
        } else if (initialStartImageUrl) {
          formData.append('existingImageUrl', initialStartImageUrl);
        }
      }
      // Multi-image upload (Nano Banana)
      if (mode === 'image-to-image' && imageFiles.length > 0) {
        imageFiles.forEach((file) => formData.append('images', file));
      }
      if (supportsDuration) {
        formData.append('duration', String(duration));
      }
      if (supportsAudioToggle) {
        formData.append('generateAudio', generateAudio ? 'true' : 'false');
      }
      if (supportsFps) {
        formData.append('fps', String(fps));
      }
      if (supportsOutputResolution && outputResolution) {
        formData.append('outputResolution', outputResolution);
      }
      if (useBrandContext && brandDNA) formData.append('useBrandContext', 'true');
      if (useCharacterPrompt && brandDNA?.characterPrompt) formData.append('useCharacterPrompt', 'true');

      if (campaignId) formData.append('campaignId', campaignId);
      if (originTag?.trim()) formData.append('originTag', originTag.trim());

      const res = await fetch(`/api/ventures/${ventureId}/marketing/media`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        clearPendingJob();
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
          setErrorMessage(data?.error || 'Nicht genug Credits.');
          return;
        }
        if (res.status === 429 && data?.retryAfter) {
          const minutes = Math.max(1, Math.ceil(Number(data.retryAfter) / 60));
          setErrorMessage(`Stundenlimit erreicht. Bitte in ca. ${minutes} Minuten erneut versuchen.`);
          return;
        }
        setErrorMessage(data?.error || 'Generierung fehlgeschlagen.');
        return;
      }

      setCreditsUsed(data.creditsUsed ?? null);
      setCreditsRemaining(data.creditsRemaining ?? null);
      setPredictionStatus(data.status || 'starting');
      setSuccessMessage('Generierung gestartet...');

      if (data.predictionId) {
        savePendingJob({
          ...pendingPayload,
          provider: 'replicate',
          predictionId: data.predictionId,
        });
        await pollPrediction(data.predictionId, pendingPayload.outputType);
      } else if (data.assets) {
        if (isUnmounted.current) return;
        setAssets(data.assets || []);
        setPredictionStatus('succeeded');
        setSuccessMessage('Generierung abgeschlossen.');
        if (onAssetCreated && data.assets) {
          data.assets.forEach((asset: any) => onAssetCreated(asset));
        }
        clearPendingJob();
        if (data.assets.length === 0) {
          try {
            const latestRes = await fetch(`/api/ventures/${ventureId}/media/latest?type=${isVideoMode ? 'video' : 'image'}`);
            const latestData = await latestRes.json().catch(() => ({}));
            if (latestRes.ok && latestData?.asset?.url) {
              setAssets([latestData.asset]);
              if (onAssetCreated) onAssetCreated(latestData.asset);
              clearPendingJob();
            }
          } catch {
            // best-effort fallback
          }
        }
      } else {
        clearPendingJob();
        throw new Error('Keine Prediction-ID erhalten.');
      }

    } catch (error: any) {
      if (isUnmounted.current) return;
      console.error('Media generation failed', error);
      clearPendingJob();
      if (error.name === 'AbortError') {
        if (!cancelRequested.current) {
          setErrorMessage('Die Anfrage wurde abgebrochen. Bitte versuche es erneut.');
        }
      } else if (error?.message === 'Operation aborted') {
        if (!cancelRequested.current) {
          setErrorMessage('Die Anfrage wurde abgebrochen. Bitte versuche es erneut.');
        }
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Serverfehler. Bitte erneut versuchen.');
      }
    } finally {
      if (activeRequestController.current === controller) {
        activeRequestController.current = null;
      }
      if (!isUnmounted.current) {
        setIsGenerating(false);
        setGenerationStartedAt(null);
      }
    }
  };

  const handleCancelGeneration = () => {
    cancelRequested.current = true;
    if (activeRequestController.current) {
      activeRequestController.current.abort();
      activeRequestController.current = null;
    }
    clearPendingJob();
    setIsGenerating(false);
    setGenerationStartedAt(null);
    setPredictionStatus(null);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const hasAdvancedFields =
    supportsSteps ||
    supportsGuidance ||
    supportsDuration ||
    supportsSeed ||
    supportsFps ||
    supportsOutputResolution;

  const Content = (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
      <div className={`flex flex-col h-full ${inline ? '' : 'max-h-[90vh] overflow-hidden'}`}>
        {!inline && (
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#FF9900]" />
              </div>
              <div>
                <h2 className="text-xl font-instrument-serif text-white flex items-center gap-2">
                  AI Media Studio
                </h2>
                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                  Visuals & Video für Marketing
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        <div
          className={`grid grid-cols-1 ${inline ? 'lg:grid-cols-2' : 'lg:grid-cols-[1.1fr_1fr]'} gap-6 p-6 overflow-y-auto`}
          style={{ overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modeOptions.map((item) => {
                const modeModels = getModelsForMode(item.id);
                const isAvailable = modeModels.length > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => isAvailable && setMode(item.id)}
                    disabled={!isAvailable}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${mode === item.id
                      ? 'bg-[#FF9900]/10 border-[#FF9900] text-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                      } ${!isAvailable ? 'opacity-40 cursor-not-allowed hover:text-white/50' : ''}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-bold">
                      {item.id.includes('video') ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      {item.label}
                    </div>
                    <p className="text-[10px] text-white/50 mt-1">{item.description}</p>
                    {!isAvailable && (
                      <p className="text-[10px] text-white/40 mt-2 uppercase tracking-widest">Kein Modell</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="glass-card rounded-xl border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Prompt</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 text-white/40 hover:text-white hover:border-[#FF9900]/40 transition-all flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3 h-3" />
                    Templates
                  </button>
                  {brandDNA && (
                    <>
                      <button
                        onClick={() => setUseBrandContext((prev) => !prev)}
                        className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${useBrandContext
                          ? 'border-[#FF9900]/40 bg-[#FF9900]/10 text-[#FF9900]'
                          : 'border-white/10 text-white/40'
                          }`}
                      >
                        Brand DNA {useBrandContext ? 'aktiv' : 'aus'}
                      </button>
                      <button
                        onClick={() => setUseCharacterPrompt((prev) => !prev)}
                        disabled={!brandDNA?.characterPrompt}
                        className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${useCharacterPrompt
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                          : 'border-white/10 text-white/40'
                          } ${!brandDNA?.characterPrompt ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        Character DNA {useCharacterPrompt ? 'aktiv' : 'aus'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={promptPlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none resize-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-white/40">
                  One-Click Inspiration
                </span>
                {INSPIRATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyInspirationPreset(preset.id)}
                    className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-[#FF9900]/40 transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowRealismGuide((prev) => !prev)}
                  className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-transparent text-white ring-1 ring-white/10 shadow-[0_0_18px_rgba(59,130,246,0.35)] bg-clip-padding hover:brightness-110 transition-all overflow-hidden"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, #f97316 0%, #f97316 45%, #FF9900 100%)',
                  }}
                >
                  Realistic Prompt Guide
                </button>
              </div>
              {showRealismGuide && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/40">Templates</span>
                    {REALISM_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyRealismTemplate(template.id)}
                        className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-[#FF9900]/40 transition-all"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] text-white/60">
                      Nutze die Sprache der Fotografie: Kamera + Linse + Licht + 1-2 technische Details.
                      So sparst du Credits durch bessere Ersttreffer.
                    </p>
                  </div>

                  {([
                    { label: 'Cameras', items: REALISM_SNIPPETS.cameras },
                    { label: 'Lenses', items: REALISM_SNIPPETS.lenses },
                    { label: 'Lighting', items: REALISM_SNIPPETS.lighting },
                    { label: 'Technical', items: REALISM_SNIPPETS.technical },
                    { label: 'Film Stocks', items: REALISM_SNIPPETS.films },
                    { label: 'Photographers', items: REALISM_SNIPPETS.photographers },
                  ] as const).map((group) => (
                    <div key={group.label} className="space-y-2">
                      <div className="text-[10px] uppercase tracking-widest text-white/40">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <button
                            key={item}
                            onClick={() => appendToPrompt(item)}
                            className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-[#FF9900]/40 transition-all"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {supportsNegativePrompt && (
                <textarea
                  rows={2}
                  value={negativePrompt}
                  onChange={(event) => setNegativePrompt(event.target.value)}
                  placeholder="Optional: Negative Prompt (z.B. blurry, low quality, artifacts)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 text-xs focus:border-[#FF9900] outline-none resize-none"
                />
              )}
            </div>

            <div className="glass-card rounded-xl border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Model & Output</h3>
                {hasAdvancedFields && (
                  <button
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {showAdvanced ? 'Basic' : 'Advanced'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Model</label>
                  <select
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                  >
                    {availableModels.length === 0 && (
                      <option value="">Kein Modell verfügbar</option>
                    )}
                    {availableModels.map((option) => (
                      <option key={option.id} value={option.id} disabled={!isModelEnabled(option)}>
                        {option.label}
                        {!isModelEnabled(option) && option.disabledReason ? ` (${option.disabledReason})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(event) => setAspectRatio(event.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                  >
                    {aspectOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showAdvanced && hasAdvancedFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {supportsSteps && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Steps</label>
                      <input
                        type="number"
                        min={rangeDefaults.steps.min}
                        max={rangeDefaults.steps.max}
                        step={rangeDefaults.steps.step ?? 1}
                        value={steps}
                        onChange={(event) => setSteps(Number(event.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                      />
                    </div>
                  )}
                  {supportsGuidance && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Guidance</label>
                      <input
                        type="number"
                        step={rangeDefaults.guidance.step ?? 0.1}
                        min={rangeDefaults.guidance.min}
                        max={rangeDefaults.guidance.max}
                        value={guidance}
                        onChange={(event) => setGuidance(Number(event.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                      />
                    </div>
                  )}
                  {supportsDuration && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Duration (sec)</label>
                      {selectedModel?.allowedDurations?.length ? (
                        <select
                          value={String(duration)}
                          onChange={(event) => setDuration(Number(event.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                        >
                          {selectedModel.allowedDurations.map((value) => (
                            <option key={value} value={value}>
                              {value}s
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={rangeDefaults.duration.min}
                          max={rangeDefaults.duration.max}
                          step={rangeDefaults.duration.step ?? 1}
                          value={duration}
                          onChange={(event) => setDuration(Number(event.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                        />
                      )}
                    </div>
                  )}
                  {supportsSeed && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Seed</label>
                      <input
                        type="number"
                        value={seed}
                        onChange={(event) => setSeed(event.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                      />
                    </div>
                  )}
                  {supportsFps && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">FPS</label>
                      <input
                        type="number"
                        min={rangeDefaults.fps.min}
                        max={rangeDefaults.fps.max}
                        step={rangeDefaults.fps.step ?? 1}
                        value={fps}
                        onChange={(event) => setFps(Number(event.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                      />
                    </div>
                  )}
                  {supportsOutputResolution && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Output</label>
                      <select
                        value={outputResolution}
                        onChange={(event) => setOutputResolution(event.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                      >
                        {outputResOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {supportsAudioToggle && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Audio</label>
                      <button
                        type="button"
                        onClick={() => setGenerateAudio((prev) => !prev)}
                        className={`w-full rounded-xl border px-4 py-3 text-sm transition-all ${generateAudio
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                          : 'border-white/10 text-white/50'
                          }`}
                      >
                        {generateAudio ? 'Audio aktiv' : 'Audio aus'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {requiresImage && (
              <div className="glass-card rounded-xl border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                    {mode === 'image-to-image' ? 'Bilder (2-3)' : 'Referenzbild'}
                  </h3>
                  {mode === 'image-to-image' && imageFiles.length > 0 && (
                    <button
                      onClick={() => setImageFiles([])}
                      className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
                    >
                      Alle entfernen
                    </button>
                  )}
                  {mode !== 'image-to-image' && imageFile && (
                    <button
                      onClick={() => setImageFile(null)}
                      className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
                    >
                      Entfernen
                    </button>
                  )}
                </div>

                {/* Multi-Image Upload (Nano Banana) */}
                {mode === 'image-to-image' ? (
                  <>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/40 px-6 py-8 text-white/50 text-xs cursor-pointer hover:bg-white/5 transition-colors">
                      <Upload className="w-5 h-5" />
                      <span>2-3 Bilder hochladen (JPG/PNG/WebP)</span>
                      <span className="text-[10px] text-white/40">
                        {imageFiles.length}/3 Bilder ausgewählt
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []);
                          if (files.length > 3) {
                            setErrorMessage('Maximal 3 Bilder erlaubt.');
                            return;
                          }
                          setImageFiles(files);
                        }}
                      />
                    </label>
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={`${preview}-${index}`} className="relative rounded-xl overflow-hidden border border-white/10 group">
                            <img src={preview} alt={`Upload ${index + 1}`} className="w-full h-auto aspect-square object-cover" />
                            <button
                              onClick={() => {
                                setImageFiles(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="absolute top-1 right-1 p-1 bg-black/80 rounded-full text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/80 rounded text-[10px] text-white/70">
                              #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* Single Image Upload (existing modes) */
                  <>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/40 px-6 py-8 text-white/50 text-xs cursor-pointer hover:bg-white/5 transition-colors">
                      <Upload className="w-5 h-5" />
                      <span>Bild hochladen (JPG/PNG/WebP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setImageFile(file);
                        }}
                      />
                    </label>
                    {resolvedImagePreview && (
                      <div className="rounded-xl overflow-hidden border border-white/10">
                        <img src={resolvedImagePreview} alt="Referenz" className="w-full h-auto" />
                      </div>
                    )}
                    {(imageFile || imagePreview) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRemoveBackground}
                          disabled={isRemovingBg}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-60"
                        >
                          {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                          BG entfernen
                        </button>
                        {bgRemovedUrl && (
                          <button
                            type="button"
                            onClick={() => setUseBgRemoved((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            {useBgRemoved ? 'Original' : 'BG entfernt'}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#FF9900]" />
                {creditsUsed ? `Energy: ${creditsUsed} verbraucht` : 'Energy Usage'}
                {creditsRemaining !== null && (
                  <span className="text-white/70">· {creditsRemaining} übrig</span>
                )}
                {predictionStatus && (
                  <span className="text-white/60">· Status: {predictionStatus}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isGenerating && (
                  <button
                    onClick={handleCancelGeneration}
                    className="px-4 py-3 rounded-xl border border-white/15 text-white/70 text-sm font-semibold hover:text-white hover:border-white/30 transition-all"
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedModel}
                  className="px-6 py-3 rounded-xl bg-[#FF9900] text-black font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Wand2 className="w-4 h-4 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Medien generieren
                    </>
                  )}
                </button>
              </div>
            </div>

            {(errorMessage || successMessage) && (
              <div
                className={`rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${errorMessage
                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border-green-500/30 bg-green-500/10 text-green-300'
                  }`}
              >
                {errorMessage ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{errorMessage || successMessage}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-card rounded-xl border border-white/10 p-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Outputs</h3>

              {/* Generating Skeleton */}
              {isGenerating && assets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative rounded-3xl border border-[#FF9900]/30 bg-black/40 overflow-hidden w-full max-w-2xl shadow-[0_0_80px_rgba(255,153,0,0.15)] transition-all duration-700">
                    <div className={`w-full relative transition-all duration-500 ${aspectRatio === '16:9' ? 'aspect-video' :
                      aspectRatio === '9:16' ? 'aspect-[9/16]' :
                        aspectRatio === '1:1' ? 'aspect-square' :
                          aspectRatio === '4:5' ? 'aspect-[4/5]' :
                            aspectRatio === '3:2' ? 'aspect-[3/2]' :
                              'aspect-video'
                      }`}>
                      {/* Hyperspeed for all generations */}
                      <div className="absolute inset-0 pointer-events-none">
                        <Hyperspeed
                          className="absolute inset-0"
                          effectOptions={hyperspeedPresets.three}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

                      {/* Center Icon */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="relative scale-125">
                          <Sparkles className="w-10 h-10 text-[#FF9900] animate-pulse" />
                          <div className="absolute inset-0 animate-ping">
                            <Sparkles className="w-10 h-10 text-[#FF9900] opacity-30" />
                          </div>
                        </div>
                        <div className="text-center space-y-2">
                          <div className="text-sm font-black text-white uppercase tracking-widest">
                            {isVideoMode ? 'Video' : 'Bild'} wird erschaffen...
                          </div>
                          {predictionStatus && (
                            <div className="text-[10px] text-[#FF9900] font-bold uppercase tracking-[0.2em] opacity-80">
                              {predictionStatus}
                            </div>
                          )}
                          {/* Progress Dots */}
                          <div className="flex items-center justify-center gap-2 pt-3">
                            <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0s_infinite]" />
                            <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
                            <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Bottom Bar with ETA */}
                    <div className="p-4 bg-black/90 backdrop-blur-xl border-t border-white/10">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
                          <span className="text-white/60 uppercase tracking-widest font-black">
                            {selectedModel?.label || 'AI Processing'}
                          </span>
                        </div>
                        <span className="text-[#FF9900] font-bold tabular-nums">
                          {isVideoMode ? 'Est: 60-120s' : 'Est: 15-30s'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isGenerating && assets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40 text-sm">
                  Keine Ergebnisse. Starte eine Generierung, um Visuals zu sehen.
                </div>
              ) : null}

              {/* Results */}
              {assets.length > 0 && (
                <div className={`grid gap-8 ${assets.length === 1 ? 'grid-cols-1 max-w-3xl mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {assets.map((asset, index) => {
                    const isVideo = asset.type.toLowerCase() === 'video';
                    const isPublic = Boolean(asset.isPublic);
                    const isPublishing = asset.id ? Boolean(pendingPublish[asset.id]) : false;
                    return (
                      <div
                        key={`${asset.url}-${index}`}
                        className={`relative rounded-xl border border-white/10 bg-black/60 overflow-hidden group ${!isVideo ? 'cursor-zoom-in' : ''
                          }`}
                        onClick={!isVideo ? () => setLightboxAsset(asset) : undefined}
                        role={!isVideo ? 'button' : undefined}
                        tabIndex={!isVideo ? 0 : undefined}
                        onKeyDown={
                          !isVideo
                            ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setLightboxAsset(asset);
                              }
                            }
                            : undefined
                        }
                      >
                        {isVideo ? (
                          <div className={`w-full bg-zinc-900 flex items-center justify-center transition-all duration-500 ${aspectRatio === '16:9' ? 'aspect-video' :
                            aspectRatio === '9:16' ? 'aspect-[9/16]' :
                              aspectRatio === '1:1' ? 'aspect-square' :
                                aspectRatio === '4:5' ? 'aspect-[4/5]' :
                                  aspectRatio === '3:2' ? 'aspect-[3/2]' :
                                    'aspect-video'
                            }`}>
                            <video
                              key={asset.url}
                              src={asset.url}
                              controls
                              muted
                              loop
                              playsInline
                              className="w-full h-full object-contain shadow-2xl"
                            >
                              Dein Browser unterstützt dieses Videoformat nicht.
                            </video>
                          </div>
                        ) : (
                          <img src={asset.url} alt="Generated" className="w-full h-auto" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-md p-3 opacity-0 group-hover:opacity-100 transition-opacity border-t border-white/10">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                              {isVideo ? 'Video' : 'Image'} Output
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setLightboxAsset(asset);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white transition-all"
                              >
                                <ZoomIn className="w-3 h-3" />
                                Ansehen
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handlePublishAsset(asset.id, !isPublic);
                                }}
                                disabled={!asset.id || isPublishing}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isPublic
                                  ? 'bg-[#FF9900]/20 border border-[#FF9900]/40 text-[#FF9900]'
                                  : 'bg-white/10 hover:bg-white/20 text-white'
                                  } ${isPublishing ? 'opacity-60' : ''}`}
                              >
                                <Share2 className="w-3 h-3" />
                                {isPublic ? 'Öffentlich' : 'Veröffentlichen'}
                              </button>
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white transition-all"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Template Modal Overlay
  const TemplateModal = showTemplates && (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,rgba(255,153,0,0.10),transparent_45%),rgba(2,4,8,0.86)] backdrop-blur-xl"
      onClick={() => {
        setShowTemplates(false);
        setSelectedTemplate(null);
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/15 bg-[#0B0F14]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)] flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF9900]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Prompt Templates</h2>
              <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold">
                {isVideoMode ? 'Video' : 'Image'} · Best Practices 2025
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowTemplates(false); setSelectedTemplate(null); }}
            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Template Selection - Scrollable */}
        {!selectedTemplate && (
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6"
            style={{ overscrollBehavior: 'contain' }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="grid gap-3">
              {availableTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#FF9900]/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-white group-hover:text-[#FF9900] transition-colors">
                          {template.label}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                          {template.category}
                        </span>
                      </div>
                      {template.tips && (
                        <p className="text-xs text-white/50">{template.tips}</p>
                      )}
                    </div>
                    <Copy className="w-4 h-4 text-white/30 group-hover:text-[#FF9900] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Template Configuration - Scrollable */}
        {selectedTemplate && (
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
            style={{ overscrollBehavior: 'contain' }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Template Preview</div>
              <div className="text-sm text-white/70 font-mono leading-relaxed">
                {selectedTemplate.prompt}
              </div>
            </div>

            {selectedTemplate.placeholders && selectedTemplate.placeholders.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Fülle die Platzhalter aus
                </div>
                {selectedTemplate.placeholders.map((placeholder) => (
                  <div key={placeholder}>
                    <label className="block text-xs text-white/50 mb-1.5 font-mono">
                      {placeholder}
                    </label>
                    <input
                      type="text"
                      value={placeholderValues[placeholder] || ''}
                      onChange={(e) => setPlaceholderValues(prev => ({ ...prev, [placeholder]: e.target.value }))}
                      placeholder={`z.B. ${placeholder === '[PRODUCT]' ? 'Premium Sneakers' : placeholder === '[BRAND]' ? 'Nike' : placeholder === '[COLOR1]' ? 'neon pink' : 'dein Text'}`}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-[#FF9900] outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedTemplate.tips && (
              <div className="p-3 rounded-lg bg-[#FF9900]/10 border border-[#FF9900]/20">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#FF9900] mb-1">
                  💡 Pro Tip
                </div>
                <div className="text-xs text-white/70">{selectedTemplate.tips}</div>
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 pt-2 sticky bottom-0 bg-gradient-to-t from-black via-black to-transparent pt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-0">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs sm:text-sm font-bold"
              >
                Zurück
              </button>
              <button
                onClick={handleApplyTemplate}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-[#FF9900] text-black hover:bg-[#FF9900]/90 transition-all text-xs sm:text-sm font-bold"
              >
                Übernehmen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return (
      <>
        <div className="w-full h-full">{Content}</div>
        {TemplateModal}
        <MediaLightbox
          open={Boolean(lightboxAsset)}
          asset={lightboxAsset}
          onClose={() => setLightboxAsset(null)}
        />
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[radial-gradient(circle_at_top,rgba(255,153,0,0.12),transparent_42%),rgba(2,4,8,0.86)] backdrop-blur-xl"
        onClick={onClose}
      >
        <div
          className="w-full max-w-6xl rounded-3xl border border-white/15 bg-[#0B0F14]/95 shadow-[0_28px_96px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)] flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          {Content}
        </div>
      </div>
      {TemplateModal}
      <MediaLightbox
        open={Boolean(lightboxAsset)}
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
      />
    </>
  );
}
