'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Download,
  Film,
  Image as ImageIcon,
  Plus,
  SlidersHorizontal,
  Sparkles,
  TextCursor,
  Tv,
  Users,
  ZoomIn,
  X
} from 'lucide-react';
import { VideoPreview } from '@/components/media/VideoPreview';
import { MediaLightbox } from '@/components/media/MediaLightbox';
import { CreditsTopUpModal } from '@/components/billing/CreditsTopUpModal';

interface VeoStudioProps {
  ventureId: string;
  brandDNA?: any;
}

type AspectRatio = '16:9' | '9:16';
type Resolution = '720p' | '1080p' | '4k';
type GenerationMode = 'text-to-video' | 'image-to-video' | 'references-to-video' | 'extend-video';
type VeoModel = 'veo-3.1' | 'veo-3.1-fast';

type GeneratedAsset = {
  id?: string;
  url: string;
  type: 'video';
};

type ModeConfig = {
  id: GenerationMode;
  label: string;
  constraints?: {
    model?: VeoModel;
    aspectRatio?: AspectRatio;
    resolution?: Resolution;
    maxReferences?: number;
  };
};

type VeoConfig = {
  defaults: {
    model: VeoModel;
    aspectRatio: AspectRatio;
    resolution: Resolution;
    durationSeconds: number;
    generateAudio: boolean;
  };
  models: Array<{ key: VeoModel; label: string }>;
  modes: ModeConfig[];
  aspectRatios?: AspectRatio[];
  resolutions?: Resolution[];
  durationOptions?: number[];
  limits: {
    maxReferences: number;
  };
};

const aspectRatioDisplayNames: Record<AspectRatio, string> = {
  '16:9': 'Landscape (16:9)',
  '9:16': 'Portrait (9:16)'
};

const modeLabels: Record<GenerationMode, string> = {
  'text-to-video': 'Text to Video',
  'image-to-video': 'Image to Video',
  'references-to-video': 'Character References',
  'extend-video': 'Extend Video'
};

const modeIcons: Record<GenerationMode, React.ReactNode> = {
  'text-to-video': <TextCursor className="w-5 h-5" />,
  'image-to-video': <ImageIcon className="w-5 h-5" />,
  'references-to-video': <Users className="w-5 h-5" />,
  'extend-video': <Film className="w-5 h-5" />
};

const FALLBACK_CONFIG: VeoConfig = {
  defaults: {
    model: 'veo-3.1-fast',
    aspectRatio: '16:9',
    resolution: '720p',
    durationSeconds: 8,
    generateAudio: true,
  },
  models: [
    { key: 'veo-3.1', label: 'Veo 3.1 (High Quality)' },
    { key: 'veo-3.1-fast', label: 'Veo 3.1 Fast' },
  ],
  modes: [
    { id: 'text-to-video', label: modeLabels['text-to-video'] },
    { id: 'image-to-video', label: modeLabels['image-to-video'] },
    {
      id: 'references-to-video',
      label: modeLabels['references-to-video'],
    },
  ],
  aspectRatios: ['16:9', '9:16'],
  resolutions: ['720p', '1080p'],
  durationOptions: [4, 6, 8],
  limits: { maxReferences: 3 },
};

type SelectOption = {
  value: string;
  label: string;
};

const CustomSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  options: SelectOption[];
  disabled?: boolean;
}> = ({ label, value, onChange, icon, options, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label
        className={`text-xs block mb-1.5 font-medium ${disabled ? 'text-white/30' : 'text-white/50'
          }`}
      >
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-[#0B0D10] text-white border border-white/10 rounded-lg pl-10 pr-8 py-2.5 text-left focus:outline-none focus:ring-1 focus:ring-[#FF9900]/40 focus:border-[#FF9900]/60 ${disabled ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'hover:border-white/30'
          }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/50">
          {icon}
        </span>
        <span className="block truncate">{selected?.label ?? value}</span>
        <ChevronDown
          className={`w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${disabled ? 'text-white/30' : 'text-white/50'
            }`}
        />
      </button>
      {open && !disabled && (
        <div
          role="listbox"
          className="absolute top-full mt-2 w-full bg-[#0B0D10] border border-white/15 rounded-lg shadow-2xl overflow-hidden z-[9999] max-h-72 overflow-y-auto"
          style={{ backgroundColor: '#0B0D10', opacity: 1 }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${isSelected ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ImageUpload: React.FC<{
  onSelect: (image: File) => void;
  onRemove?: () => void;
  image?: File | null;
  label: React.ReactNode;
  className?: string;
}> = ({ onSelect, onRemove, image, label, className = 'w-28 h-20' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (image) {
    return (
      <div className={`relative group ${className}`}>
        <img
          src={URL.createObjectURL(image)}
          alt="preview"
          className="w-full h-full object-cover rounded-lg shadow-inner"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove image"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`${className} bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/15 rounded-lg flex flex-col items-center justify-center text-white/50 hover:text-white transition-colors`}
    >
      <Plus className="w-6 h-6" />
      <span className="text-xs mt-1 text-center px-1">{label}</span>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </button>
  );
};

const VideoUpload: React.FC<{
  onSelect: (video: File) => void;
  onRemove?: () => void;
  video?: File | null;
  label: React.ReactNode;
}> = ({ onSelect, onRemove, video, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
  };

  if (video) {
    return (
      <div className="relative w-48 h-28 group">
        <video
          src={URL.createObjectURL(video)}
          muted
          loop
          className="w-full h-full object-cover rounded-lg shadow-inner"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove video"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-48 h-28 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/15 rounded-lg flex flex-col items-center justify-center text-white/50 hover:text-white transition-colors text-center"
    >
      <Plus className="w-6 h-6" />
      <span className="text-xs mt-1 px-2">{label}</span>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="video/*"
        className="hidden"
      />
    </button>
  );
};

export function VeoStudio({ ventureId }: VeoStudioProps) {
  const [config, setConfig] = useState<VeoConfig>(FALLBACK_CONFIG);
  const [configReady, setConfigReady] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<VeoModel>(FALLBACK_CONFIG.defaults.model);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(FALLBACK_CONFIG.defaults.aspectRatio);
  const [resolution, setResolution] = useState<Resolution>(FALLBACK_CONFIG.defaults.resolution);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('text-to-video');
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [endFrame, setEndFrame] = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [styleImage, setStyleImage] = useState<File | null>(null);
  const [inputVideo, setInputVideo] = useState<File | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  const [durationSeconds, setDurationSeconds] = useState(FALLBACK_CONFIG.defaults.durationSeconds);
  const [generateAudio, setGenerateAudio] = useState(FALLBACK_CONFIG.defaults.generateAudio);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [topUpAvailable, setTopUpAvailable] = useState<number | null>(null);
  const [operationName, setOperationName] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  const [lightboxAsset, setLightboxAsset] = useState<GeneratedAsset | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);

  const modeOptions = config?.modes ?? FALLBACK_CONFIG.modes;
  const maxReferences = config?.limits?.maxReferences ?? FALLBACK_CONFIG.limits.maxReferences;
  const aspectRatioOptions = config?.aspectRatios ?? FALLBACK_CONFIG.aspectRatios ?? ['16:9', '9:16'];
  const resolutionOptions = config?.resolutions ?? FALLBACK_CONFIG.resolutions ?? ['720p', '1080p'];
  const durationOptions = config?.durationOptions ?? FALLBACK_CONFIG.durationOptions ?? [4, 6, 8];

  // Replicate google/veo-3.1: Referenzbilder nur mit 16:9 und 8s
  const requiresEightSeconds = generationMode === 'references-to-video';
  const availableDurations = requiresEightSeconds
    ? durationOptions.filter((value) => value === 8)
    : durationOptions;

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const res = await fetch(`/api/ventures/${ventureId}/marketing/veo/config`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) return;
        if (!mounted) return;
        const next = data as VeoConfig;
        setConfig(next);
        if (!configReady) {
          setModel(next.defaults.model);
          setAspectRatio(next.defaults.aspectRatio);
          setResolution(next.defaults.resolution);
          setDurationSeconds(next.defaults.durationSeconds);
          setGenerateAudio(next.defaults.generateAudio);
        }
        setConfigReady(true);
      } catch {
        setConfigReady(true);
      }
    };
    loadConfig();
    return () => {
      mounted = false;
    };
  }, [ventureId, configReady]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [prompt]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modeSelectorRef.current &&
        !modeSelectorRef.current.contains(event.target as Node)
      ) {
        setIsModeSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // no hard locks by mode; keep user choice
  }, [generationMode]);

  useEffect(() => {
    if (requiresEightSeconds && durationSeconds !== 8) {
      setDurationSeconds(8);
      return;
    }
    if (!requiresEightSeconds && !availableDurations.includes(durationSeconds)) {
      setDurationSeconds(availableDurations[0] ?? 8);
    }
  }, [requiresEightSeconds, durationSeconds, availableDurations]);

  const handleSelectMode = (mode: GenerationMode) => {
    setGenerationMode(mode);
    setIsModeSelectorOpen(false);
    setStartFrame(null);
    setEndFrame(null);
    setReferenceImages([]);
    setStyleImage(null);
    setInputVideo(null);
    setIsLooping(false);
  };

  const promptPlaceholder = {
    'text-to-video': 'Describe the video you want to create...',
    'image-to-video': 'Describe the scene (optional)...',
    'references-to-video': 'Describe what your character is doing...',
    'extend-video': 'Describe what happens next (optional)...'
  }[generationMode];

  const totalReferences = referenceImages.length + (styleImage ? 1 : 0);
  const getModeLabel = (mode: GenerationMode) =>
    modeOptions.find((item) => item.id === mode)?.label ?? modeLabels[mode];

  const renderMediaUploads = () => {
    if (generationMode === 'image-to-video') {
      return (
        <div className="mb-3 p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-4">
            <ImageUpload
              label="Source Image"
              image={startFrame}
              onSelect={setStartFrame}
              onRemove={() => {
                setStartFrame(null);
                setIsLooping(false);
              }}
            />
            {!isLooping && (
              <ImageUpload
                label="End (Optional)"
                image={endFrame}
                onSelect={setEndFrame}
                onRemove={() => setEndFrame(null)}
              />
            )}
          </div>
          <p className="text-[10px] text-white/40 italic">Upload a source image to animate.</p>
          {startFrame && !endFrame && (
            <div className="mt-1 flex items-center">
              <input
                id="loop-video-checkbox"
                type="checkbox"
                checked={isLooping}
                onChange={(e) => setIsLooping(e.target.checked)}
                className="w-4 h-4 text-[#FF9900] bg-white/5 border-white/20 rounded focus:ring-[#FF9900]/40 cursor-pointer"
              />
              <label
                htmlFor="loop-video-checkbox"
                className="ml-2 text-sm font-medium text-white/70 cursor-pointer"
              >
                Create a looping video
              </label>
            </div>
          )}
        </div>
      );
    }
    if (generationMode === 'references-to-video') {
      return (
        <div className="mb-3 p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center gap-5">
          <div className="w-full">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest block mb-3 text-center">
              Character Images ({referenceImages.length}/3)
            </label>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {referenceImages.map((img, index) => (
                <ImageUpload
                  key={index}
                  image={img}
                  label=""
                  onSelect={() => { }}
                  onRemove={() =>
                    setReferenceImages((imgs) => imgs.filter((_, i) => i !== index))
                  }
                />
              ))}
              {totalReferences < maxReferences && (
                <ImageUpload
                  label="Add Image"
                  onSelect={(img) => setReferenceImages((imgs) => [...imgs, img])}
                />
              )}
            </div>
            <p className="text-[10px] text-white/40 text-center mt-3 max-w-sm mx-auto">
              Upload images of your AI influencer to maintain consistency.
            </p>
          </div>
          <div className="w-full">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest block mb-3 text-center">
              Style Image (Optional)
            </label>
            <div className="flex items-center justify-center">
              {styleImage ? (
                <ImageUpload
                  image={styleImage}
                  label=""
                  onSelect={() => { }}
                  onRemove={() => setStyleImage(null)}
                />
              ) : totalReferences < maxReferences ? (
                <ImageUpload
                  label="Add Style"
                  onSelect={(img) => setStyleImage(img)}
                />
              ) : null}
            </div>
          </div>
        </div>
      );
    }
    if (generationMode === 'extend-video') {
      return (
        <div className="mb-3 p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <VideoUpload
              label={
                <>
                  Input Video
                  <br />
                  (Previous generation)
                </>
              }
              video={inputVideo}
              onSelect={setInputVideo}
              onRemove={() => setInputVideo(null)}
            />
            <p className="text-[10px] text-white/40 text-center max-w-xs">
              Extend works only with recent Veo outputs (last 2 days, max ~141s input).
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const isExtendMode = generationMode === 'extend-video';
  const isModelLocked = false;
  const isAspectLocked = false;
  const isResolutionLocked = false;

  let isSubmitDisabled = false;
  let tooltipText = '';

  switch (generationMode) {
    case 'text-to-video':
      isSubmitDisabled = !prompt.trim();
      tooltipText = isSubmitDisabled ? 'Please enter a prompt.' : '';
      break;
    case 'image-to-video':
      isSubmitDisabled = !startFrame || !prompt.trim();
      tooltipText = isSubmitDisabled ? 'A source image and a prompt are required.' : '';
      break;
    case 'references-to-video':
      isSubmitDisabled = !prompt.trim() || referenceImages.length === 0;
      tooltipText = isSubmitDisabled
        ? 'Please enter a prompt and add at least one character image.'
        : '';
      break;
    case 'extend-video':
      isSubmitDisabled = !inputVideo;
      tooltipText = isSubmitDisabled ? 'An input video is required.' : '';
      break;
  }

  const pollOperation = async (opName: string) => {
    const start = Date.now();
    const maxWaitMs = 1000 * 60 * 12;
    while (Date.now() - start < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await fetch(`/api/ventures/${ventureId}/marketing/veo?operation=${encodeURIComponent(opName)}`);
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        throw new Error(data?.error || raw || `Polling fehlgeschlagen (HTTP ${res.status}).`);
      }
      if (typeof data.progress === 'number') {
        setProgress(data.progress);
      }
      if (data.status === 'succeeded' && data.assets?.length) {
        setGeneratedAsset(data.assets[0]);
        return;
      }
      if (data.status === 'failed') {
        throw new Error(data.error || 'Generierung fehlgeschlagen.');
      }
    }
    throw new Error('Timeout: Bitte später erneut prüfen.');
  };

  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setGeneratedAsset(null);
    setProgress(null);
    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append('mode', generationMode);
      formData.append('model', model);
      if (prompt.trim()) formData.append('prompt', prompt.trim());
      formData.append('aspectRatio', aspectRatio);
      formData.append('resolution', resolution);
      formData.append('durationSeconds', String(durationSeconds));
      formData.append('generateAudio', generateAudio ? 'true' : 'false');

      if (generationMode === 'image-to-video' && startFrame) {
        formData.append('startFrame', startFrame);
        if (endFrame) {
          formData.append('endFrame', endFrame);
        } else if (isLooping) {
          formData.append('endFrame', startFrame);
        }
      }

      if (generationMode === 'references-to-video') {
        referenceImages.forEach((file) => formData.append('referenceImages', file));
        if (styleImage) formData.append('styleImage', styleImage);
      }

      if (generationMode === 'extend-video' && inputVideo) {
        formData.append('inputVideo', inputVideo);
      }

      const res = await fetch(`/api/ventures/${ventureId}/marketing/veo`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 && data?.code === 'INSUFFICIENT_CREDITS') {
          setTopUpRequired(data?.requiredCredits ?? null);
          setTopUpAvailable(data?.creditsAvailable ?? null);
          setTopUpOpen(true);
          throw new Error(data?.error || 'Nicht genug Credits.');
        }
        throw new Error(data?.error || 'Generierung fehlgeschlagen.');
      }

      if (data?.resolved) {
        if (data.resolved.model) setModel(data.resolved.model);
        if (data.resolved.aspectRatio) setAspectRatio(data.resolved.aspectRatio);
        if (data.resolved.resolution) setResolution(data.resolved.resolution);
        if (data.resolved.durationSeconds) setDurationSeconds(data.resolved.durationSeconds);
      }

      const opName = data.operationName as string | undefined;
      if (!opName) throw new Error('Kein Operation-Handle erhalten.');
      setOperationName(opName);

      await pollOperation(opName);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Generierung fehlgeschlagen.');
    } finally {
      setIsGenerating(false);
    }
  }, [generationMode, model, prompt, aspectRatio, resolution, durationSeconds, generateAudio, startFrame, inputVideo, ventureId, pollOperation, endFrame, isLooping, referenceImages, styleImage]);

  const handleDownloadAsset = async (asset: GeneratedAsset) => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = asset.url.split('/').pop() || 'veo-video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = asset.url.split('/').pop() || 'veo-video.mp4';
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      <CreditsTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        returnTo={`/forge/${ventureId}/marketing`}
        requiredCredits={topUpRequired}
        creditsAvailable={topUpAvailable}
      />
      <div className="relative w-full">
        {isSettingsOpen && (
          <div
            className="absolute bottom-full left-0 right-0 mb-3 p-4 bg-[#0B0D10] rounded-xl border border-white/15 shadow-2xl z-50"
            style={{ backgroundColor: '#0B0D10', opacity: 1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <CustomSelect
                  label="Model"
                  value={model}
                  onChange={(next) => setModel(next as VeoModel)}
                  icon={<Sparkles className="w-5 h-5" />}
                  disabled={isModelLocked}
                  options={config.models.map((item) => ({
                    value: item.key,
                    label: item.label
                  }))}
                />
                {isModelLocked && (
                  <p className="text-[10px] text-[#FF9900]/80 mt-1 uppercase tracking-tighter">
                    Character Mode requires High Quality Model
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <CustomSelect
                  label="Aspect Ratio"
                  value={aspectRatio}
                  onChange={(next) => setAspectRatio(next as AspectRatio)}
                  icon={<ImageIcon className="w-5 h-5" />}
                  disabled={isAspectLocked}
                  options={aspectRatioOptions.map((ratio) => ({
                    value: ratio,
                    label: aspectRatioDisplayNames[ratio] ?? ratio
                  }))}
                />
                {isAspectLocked && (
                  <p className="text-[10px] text-[#FF9900]/80 mt-1 uppercase tracking-tighter">
                    Character Mode supports Landscape only
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <CustomSelect
                  label="Resolution"
                  value={resolution}
                  onChange={(next) => setResolution(next as Resolution)}
                  icon={<Tv className="w-5 h-5" />}
                  disabled={isResolutionLocked}
                  options={resolutionOptions.map((res) => ({
                    value: res,
                    label: res.toUpperCase()
                  }))}
                />
                {isExtendMode && resolution !== '720p' ? (
                  <p className="text-[10px] text-amber-400 mt-1 uppercase tracking-tighter">
                    Extend requires 720p
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="w-40">
                <CustomSelect
                  label="Duration (sec)"
                  value={String(durationSeconds)}
                  onChange={(next) => setDurationSeconds(Number(next))}
                  icon={<Film className="w-5 h-5" />}
                  disabled={requiresEightSeconds}
                  options={availableDurations.map((value) => ({
                    value: String(value),
                    label: `${value}s`
                  }))}
                />
              </div>
              <label className="text-xs text-white/60 uppercase tracking-widest flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generateAudio}
                  onChange={(e) => setGenerateAudio(e.target.checked)}
                  className="w-4 h-4 text-[#FF9900] bg-white/5 border-white/20 rounded"
                />
                Generate Audio
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="w-full">
          {renderMediaUploads()}
          <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 shadow-lg focus-within:ring-2 focus-within:ring-[#FF9900]/40">
            <div className="flex items-end gap-2 flex-1 min-w-0">
              <div className="relative" ref={modeSelectorRef}>
                <button
                  type="button"
                  onClick={() => setIsModeSelectorOpen((prev) => !prev)}
                  className="flex shrink-0 items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  aria-label="Select generation mode"
                >
                  {modeIcons[generationMode]}
                  <span className="font-medium text-sm whitespace-nowrap">
                    {getModeLabel(generationMode)}
                  </span>
                </button>
                {isModeSelectorOpen && (
                  <div
                    className="absolute top-full mt-2 w-60 bg-[#0B0D10] border border-white/15 rounded-lg shadow-2xl overflow-hidden z-[9999] max-h-72 overflow-y-auto"
                    style={{ backgroundColor: '#0B0D10', opacity: 1 }}
                  >
                    {modeOptions.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleSelectMode(mode.id)}
                        className={`w-full text-left flex items-center gap-3 p-3 hover:bg-white/10 ${generationMode === mode.id ? 'bg-white/5 text-white' : 'text-white/70'}`}
                      >
                        {modeIcons[mode.id]}
                        <span>{mode.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={promptPlaceholder}
                className="flex-1 min-w-0 bg-transparent focus:outline-none resize-none text-base text-white/80 placeholder:text-white/30 max-h-48 py-2 overflow-hidden"
                rows={1}
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`p-2.5 rounded-full hover:bg-white/10 ${isSettingsOpen ? 'bg-white/10 text-white' : 'text-white/70'}`}
                aria-label="Toggle settings"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              <div className="relative group">
                <button
                  type="submit"
                  className="p-2.5 bg-[#FF9900] rounded-full hover:opacity-90 disabled:bg-white/10 disabled:cursor-not-allowed"
                  aria-label="Generate video"
                  disabled={isSubmitDisabled || isGenerating}
                >
                  {isGenerating ? (
                    <Sparkles className="w-5 h-5 text-black animate-pulse" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-black" />
                  )}
                </button>
                {(isSubmitDisabled || isGenerating) && tooltipText && (
                  <div
                    role="tooltip"
                    className="absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-black border border-white/10 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                  >
                    {tooltipText}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/30 text-center mt-2 px-4 uppercase tracking-tighter">
            Veo 3.1 supports 16:9 and 9:16, 720p/1080p. Durations: 4s/6s/8s. Character references require 16:9 + 8s (Veo 3.1 only).
          </p>
        </form>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {operationName && !generatedAsset && isGenerating && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative rounded-3xl border border-[#FF9900]/30 bg-black/40 overflow-hidden w-full max-w-2xl shadow-[0_0_80px_rgba(255,153,0,0.15)] transition-all duration-700">
              <div className={`w-full relative transition-all duration-500 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'
                }`}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,153,0,0.25),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,153,0,0.2),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.12),transparent_45%)] animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative scale-125">
                    <Sparkles className="w-10 h-10 text-[#FF9900] animate-pulse" />
                    <div className="absolute inset-0 animate-ping">
                      <Sparkles className="w-10 h-10 text-[#FF9900] opacity-30" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-sm font-black text-white uppercase tracking-widest">
                      Google Veo erschafft dein Video...
                    </div>
                    {typeof progress === 'number' && (
                      <div className="text-[10px] text-[#FF9900] font-bold uppercase tracking-[0.2em] opacity-80">
                        Fortschritt: {Math.round(progress)}%
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 pt-3">
                      <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0s_infinite]" />
                      <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
                      <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/90 backdrop-blur-xl border-t border-white/10">
                <div className="flex flex-col gap-3">
                  {typeof progress === 'number' && (
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#FF9900] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
                      <span className="text-white/60 uppercase tracking-widest font-black">
                        Google Veo 3.1 · High Precision
                      </span>
                    </div>
                    <span className="text-[#FF9900] font-bold tabular-nums">
                      Est: 2-3 Min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {generatedAsset && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black uppercase tracking-widest text-white/40">Result Preview</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightboxAsset(generatedAsset)}
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:text-white transition-all bg-white/10 px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30"
                >
                  <ZoomIn className="w-3 h-3" />
                  Ansehen
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadAsset(generatedAsset)}
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:brightness-125 transition-all bg-[#FF9900]/10 px-3 py-1.5 rounded-lg border border-[#FF9900]/20"
                >
                  <Download className="w-3 h-3" />
                  Download Video
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLightboxAsset(generatedAsset)}
              className={`mx-auto block w-full max-w-2xl ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}
              aria-label="Video im Modal ansehen"
            >
              <VideoPreview
                src={generatedAsset.url}
                className="h-full w-full rounded-2xl overflow-hidden border border-white/10"
                mediaClassName="h-full w-full object-contain bg-zinc-900"
                enableHover={true}
                allowClick={false}
                showOverlay={true}
              />
            </button>
          </div>
        )}
      </div>

      <MediaLightbox
        open={Boolean(lightboxAsset)}
        asset={lightboxAsset ? { ...lightboxAsset, type: 'video' } : null}
        onClose={() => setLightboxAsset(null)}
      />
    </>
  );
}
