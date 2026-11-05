'use client';

import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  AccumulativeShadows,
  ContactShadows,
  Environment,
  Grid,
  Lightformer,
  Line,
  OrbitControls,
  RandomizedLight,
} from '@react-three/drei';
import { Copy, Send } from 'lucide-react';

const CAMERA_PROMPTS = [
  {
    title: 'Slow Dolly In',
    intent: 'Draws the audience into the subject\'s inner emotion. Builds intimacy and focus.',
    prompt:
      'Slow dolly in. Camera moves slowly forward toward the subject with gentle parallax, tightening the frame and deepening intimacy.',
  },
  {
    title: 'Slow Dolly Out',
    intent: 'Creates distance to reveal broader context or isolation. Emphasizes vulnerability.',
    prompt:
      'Slow dolly out. Camera pulls back from the subject to reveal the environment, expanding the context while the subject remains centered.',
  },
  {
    title: 'Fast Dolly In',
    intent: 'Aggressively invades the subject\'s space. Creates tension, shock, or sudden realization.',
    prompt:
      'Fast dolly in. Camera moves rapidly forward toward the subject\'s face, urgent motion and rising tension.',
  },
  {
    title: 'Vertigo (Dolly Zoom / Zolly)',
    intent: 'Disorienting effect where the world warps while the subject stays constant.',
    prompt:
      'Vertigo effect (dolly zoom). Camera moves backward while zooming in; background expands and distorts as the subject stays consistent in size.',
  },
  {
    title: 'Extreme Micro Zoom',
    intent: 'Reveals hidden textures and detail; a journey into a microscopic world.',
    prompt:
      'Extreme micro zoom. Transition from the subject\'s face into a macro view of one eye, revealing fine textures and microscopic detail.',
  },
  {
    title: 'Hyper Zoom / Zoom Out',
    intent: 'Connects micro to macro; links a single subject to the wider world.',
    prompt:
      'Hyper zoom out. Camera starts at surface-level detail, then rapidly pulls back to a wide Earth/planet view, smoothly bridging micro to macro.',
  },
  {
    title: 'Over-the-Shoulder Shot',
    intent: 'Grounds the viewer in the character\'s perspective and relationships.',
    prompt:
      'Over-the-shoulder shot. Foreground shoulder softly blurred, subject in focus ahead; maintain perspective as the character moves through the scene.',
  },
  {
    title: 'Fisheye / Peephole Lens',
    intent: 'Distorts reality into a surveillance or paranoia-like perspective.',
    prompt:
      'Fisheye lens. Extreme wide-angle distortion with circular frame; static or handheld camera slowly moves toward the subject.',
  },
  {
    title: 'Rack Focus',
    intent: 'Shifts narrative attention from one element to another.',
    prompt:
      'Rack focus. Focus shifts from [OBJECT A] in the foreground to [OBJECT B] in the background, clearly signaling a change in importance.',
  },
  {
    title: 'Snap Zoom / Crash Zoom',
    intent: 'Comedic punctuation or energetic impact on a reaction or important detail.',
    prompt:
      'Snap zoom. Camera suddenly punches in on [DETAIL/REACTION], fast and precise for a dramatic or comedic hit.',
  },
  {
    title: 'Reveal From Behind (Wipe Movement)',
    intent: 'Builds anticipation before introducing a new subject or setting.',
    prompt:
      'Reveal from behind foreground. Camera slides laterally out from behind [OBSTRUCTION] to reveal the subject entering the scene.',
  },
  {
    title: 'Tilt Up',
    intent: 'Emphasizes vertical scale and grandeur; makes the subject feel powerful or hopeful.',
    prompt:
      'Tilt up. Camera tilts upward to reveal the sky or towering environment above the subject.',
  },
  {
    title: 'Tilt Down',
    intent: 'Reveals vulnerability, defeat, or ground-level details.',
    prompt:
      'Tilt down. Camera tilts downward to reveal [GROUND DETAIL], lowering the viewer\'s gaze toward the floor or terrain.',
  },
  {
    title: 'Pedestal Down',
    intent: 'Lowers the physical perspective, creating calm or child-like viewpoint.',
    prompt:
      'Pedestal down. Camera lowers vertically straight down to ground level, revealing grass, asphalt, or surface texture.',
  },
  {
    title: 'Pedestal Up',
    intent: 'Raises perspective to show status or ascension.',
    prompt:
      'Pedestal up. Camera rises vertically from a low base to eye level, elevating the subject\'s presence.',
  },
  {
    title: 'Crane Up',
    intent: 'Detaches the viewer to show the vastness of a setting.',
    prompt:
      'Crane up. Camera lifts high into the air to reveal the scale of the environment around the subject.',
  },
  {
    title: 'Crane Down',
    intent: 'Moves from a detached view into intimate action.',
    prompt:
      'Crane down. Camera descends slowly toward the subject, transitioning from a wide contextual view into intimacy.',
  },
  {
    title: 'Drone Orbit 360',
    intent: 'Isolates the subject within their environment; emphasizes being surrounded.',
    prompt:
      'Drone orbit. Aerial camera orbits 360 degrees around the subject at a steady altitude.',
  },
  {
    title: 'Drone Flyover',
    intent: 'Establishes geography and scale; emphasizes travel or landscape layout.',
    prompt:
      'Drone flyover. High-altitude flight moving forward over the landscape as the subject moves below.',
  },
  {
    title: 'Epic Drone Reveal',
    intent: 'Builds cinematic anticipation and wonder.',
    prompt:
      'Epic drone reveal. Camera rises and tilts downward to unveil a majestic landscape or key location.',
  },
  {
    title: 'Top-Down / God\'s Eye View',
    intent: 'Flattens depth for objective observation of patterns and motion.',
    prompt:
      'Top-down tracking shot. Camera points straight down from above while following the subject\'s movement.',
  },
  {
    title: 'Handheld Shot',
    intent: 'Raw energy and authenticity; documentary-style immediacy.',
    prompt:
      'Handheld camera. Subtle shake follows the subject\'s movement, documentary realism and close proximity.',
  },
  {
    title: 'Tracking Shot',
    intent: 'Places the audience in the subject\'s footsteps; immersive momentum.',
    prompt:
      'Tracking shot. Camera follows the subject dynamically as they move forward, maintaining pace and distance.',
  },
  {
    title: 'Side Tracking Shot',
    intent: 'Observes motion objectively; ideal for travel, chases, or conversations in motion.',
    prompt:
      'Side tracking shot. Camera moves parallel to the subject, matching speed to keep the subject framed in profile.',
  },
  {
    title: 'Dutch Angle',
    intent: 'Creates unease, tension, or psychological imbalance.',
    prompt:
      'Dutch angle. Tilt the camera horizon left or right to create disorientation and instability.',
  },
  {
    title: 'POV / FPV Tracking',
    intent: 'Locks the viewer into the character\'s subjective experience.',
    prompt:
      'POV tracking shot. First-person view from the character\'s eyes as they move through the environment.',
  },
  {
    title: 'Worm\'s-Eye Tracking',
    intent: 'Makes the subject feel massive; emphasizes terrain texture.',
    prompt:
      'Worm\'s-eye view. Low-angle tracking along the ground, camera looking up as the subject moves overhead.',
  },
  {
    title: 'Time-Lapse',
    intent: 'Compresses time to show passage, environmental change, or frenetic energy.',
    prompt:
      'Time-lapse tracking. Camera moves forward while time accelerates; day-to-night shift and seasonal changes visible.',
  },
  {
    title: 'Bullet Time',
    intent: 'Suspends time to highlight a split-second action with full clarity.',
    prompt:
      'Bullet time. Action frozen in ultra slow motion as the camera orbits around the subject mid-action.',
  },
];

type CameraMovement =
  | 'static'
  | 'slow-dolly-in'
  | 'slow-dolly-out'
  | 'tracking-left'
  | 'tracking-right'
  | 'orbit-left'
  | 'orbit-right'
  | 'crane-up'
  | 'crane-down'
  | 'handheld';

type PromptTargetModel =
  | 'google/veo-3.1'
  | 'kwaivgi/kling-v4.0'
  | 'kwaivgi/kling-v2.6'
  | 'openai/sora-2'
  | 'generic';

type PromptInputMode = 'text-to-video' | 'image-to-video';
type PreviewRenderMode = 'preview' | 'cinematic';
type RealismPresetId = 'balanced' | 'documentary' | 'cinematic';
type ExposureRatio = '1:1' | '2:1' | '4:1' | '8:1';

type RealismSettings = {
  emotionTone: string;
  imperfectionDetails: string;
  wardrobeDetails: string;
  lightMotivation: string;
  exposureRatio: ExposureRatio;
  lensCharacter: string;
  aperture: number;
  eyeDetails: string;
  skinDetails: string;
  hairDetails: string;
  atmosphereDetails: string;
  colorPaletteRule: string;
  processingStyle: string;
  compositionGuide: string;
};

const MOVEMENT_SNIPPETS: Record<CameraMovement, string> = {
  static: 'Static camera with controlled composition and no major camera travel.',
  'slow-dolly-in': 'Slow dolly in toward the subject with gentle parallax.',
  'slow-dolly-out': 'Slow dolly out to reveal more environment and context.',
  'tracking-left': 'Lateral tracking move to the left while keeping subject framed.',
  'tracking-right': 'Lateral tracking move to the right while keeping subject framed.',
  'orbit-left': 'Smooth orbit move counterclockwise around the subject.',
  'orbit-right': 'Smooth orbit move clockwise around the subject.',
  'crane-up': 'Crane up move that elevates camera height and expands scene scale.',
  'crane-down': 'Crane down move descending into a more intimate framing.',
  handheld: 'Handheld movement with subtle natural shake and documentary energy.',
};

const TARGET_MODEL_OPTIONS: Array<{ id: PromptTargetModel; label: string; note: string }> = [
  {
    id: 'google/veo-3.1',
    label: 'Veo 3.1',
    note: 'Prioritizes subject/context/action/style and clear motion cues.',
  },
  {
    id: 'kwaivgi/kling-v4.0',
    label: 'Kling 4.0',
    note: 'Up to 30s; strong camera direction, no native audio. Reference images as @image_1, @image_2.',
  },
  {
    id: 'kwaivgi/kling-v2.6',
    label: 'Kling 2.6',
    note: 'Adds explicit ambient sound/dialogue cues and strong camera direction.',
  },
  {
    id: 'openai/sora-2',
    label: 'Sora 2',
    note: 'Starts with style, then precise scene/action/camera details.',
  },
  {
    id: 'generic',
    label: 'Generic Video Model',
    note: 'Balanced default when model-specific behavior is unknown.',
  },
];

const INPUT_MODE_NOTES: Record<PromptInputMode, string> = {
  'text-to-video': 'Creates a full scene from text.',
  'image-to-video': 'Keeps source image identity; focuses prompt on motion/camera changes.',
};

const EXPOSURE_RATIO_OPTIONS: ExposureRatio[] = ['1:1', '2:1', '4:1', '8:1'];

const REALISM_PRESETS: Record<
  RealismPresetId,
  { label: string; note: string; values: RealismSettings }
> = {
  balanced: {
    label: 'Balanced Realism',
    note: 'Default for ads and social clips. Controlled imperfections with clean readability.',
    values: {
      emotionTone: 'calm but determined, subtle micro-expression in eyes and mouth',
      imperfectionDetails: 'visible pores, mild under-eye texture, slight eyebrow asymmetry',
      wardrobeDetails: 'fabric weave detail, natural folds, slight dust at edges',
      lightMotivation: 'sun as key light, bounced ground fill, gentle sky rim',
      exposureRatio: '2:1',
      lensCharacter: '35mm natural perspective lens with slight lens breathing',
      aperture: 2.8,
      eyeDetails: 'clean catchlights, slight sclera veins, realistic moisture line',
      skinDetails: 'natural oil variation, fine pores, no beauty smoothing',
      hairDetails: 'stray hairs, uneven strand direction, realistic hairline',
      atmosphereDetails: 'subtle haze and drifting dust particles in backlight',
      colorPaletteRule: '60% neutral base, 30% environment hue, 10% accent color',
      processingStyle: 'very light film grain, mild halation, subtle vignette',
      compositionGuide: 'subject near rule-of-thirds anchor with readable negative space',
    },
  },
  documentary: {
    label: 'Documentary',
    note: 'Handheld, grounded, less polished, high authenticity.',
    values: {
      emotionTone: 'natural and reactive, unposed human behavior',
      imperfectionDetails: 'skin texture, mild blemishes, uneven tone and tiny scars',
      wardrobeDetails: 'creased fabric, practical wear marks, dust and movement wrinkles',
      lightMotivation: 'available practical light with minimal artificial enhancement',
      exposureRatio: '4:1',
      lensCharacter: '28-35mm documentary lens look with slight handheld micro-jitter',
      aperture: 4,
      eyeDetails: 'less stylized catchlight, small eye movement drift',
      skinDetails: 'true-to-life pores and tone variation, no plastic surface',
      hairDetails: 'messy stray strands affected by wind and motion',
      atmosphereDetails: 'airborne dust and humidity haze where physically plausible',
      colorPaletteRule: '60% neutral realism, 30% environment color, 10% warm practical accents',
      processingStyle: 'subtle film grain, light chromatic aberration, no over-sharpening',
      compositionGuide: 'imperfect framing with purposeful headroom and lived-in space',
    },
  },
  cinematic: {
    label: 'Cinematic Drama',
    note: 'More stylized but still realistic skin/eyes/material behavior.',
    values: {
      emotionTone: 'heightened tension with controlled expressive facial detail',
      imperfectionDetails: 'micro skin texture, pores, fine wrinkles, realistic asymmetry',
      wardrobeDetails: 'premium textile texture with natural fold compression and weathering',
      lightMotivation: 'motivated key and rim setup that still feels source-driven',
      exposureRatio: '2:1',
      lensCharacter: 'anamorphic-inspired cinematic lens behavior with organic falloff',
      aperture: 2,
      eyeDetails: 'defined iris detail with natural reflections and moist eyelids',
      skinDetails: 'high-detail epidermis with realistic roughness and translucency cues',
      hairDetails: 'defined strand separation with physically coherent flyaways',
      atmosphereDetails: 'volumetric haze and airborne particles supporting depth separation',
      colorPaletteRule: '60% mood base, 30% secondary contrast hue, 10% highlight accent',
      processingStyle: 'filmic grain, gentle bloom, restrained halation, soft highlight rolloff',
      compositionGuide: 'strong leading lines with negative space aimed toward subject motion',
    },
  },
};

type CameraPromptsTabProps = {
  onUsePrompt?: (prompt: string) => void;
};

type ShotScale =
  | 'extreme close-up'
  | 'close-up'
  | 'medium close-up'
  | 'medium shot'
  | 'wide shot'
  | 'extreme wide shot';

const resolveShotScale = (distance: number, fov: number): ShotScale => {
  const lensCompensation = fov <= 25 ? -0.6 : fov >= 70 ? 0.8 : 0;
  const effectiveDistance = distance + lensCompensation;

  if (effectiveDistance < 1.2) return 'extreme close-up';
  if (effectiveDistance < 2.1) return 'close-up';
  if (effectiveDistance < 3.2) return 'medium close-up';
  if (effectiveDistance < 5.2) return 'medium shot';
  if (effectiveDistance < 8) return 'wide shot';
  return 'extreme wide shot';
};

const resolveLensDescriptor = (fov: number): string => {
  if (fov <= 24) return 'telephoto lens look (85mm range), compressed perspective';
  if (fov <= 40) return 'medium lens look (50mm range), natural depth';
  if (fov <= 62) return 'wide lens look (35mm range), environmental depth';
  return 'ultra-wide lens look (24mm range), expanded perspective';
};

const resolveAngleDescriptor = (pitch: number): string => {
  if (pitch >= 14) return 'high-angle perspective looking downward';
  if (pitch <= -10) return 'low-angle perspective looking upward';
  return 'eye-level perspective';
};

const resolveDutchDescriptor = (roll: number): string => {
  if (Math.abs(roll) < 4) return 'level horizon';
  return `dutch angle with ${Math.abs(roll).toFixed(0)} degree horizon tilt ${
    roll > 0 ? 'clockwise' : 'counterclockwise'
  }`;
};

const normalizeFocusTarget = (focusTarget: string, shotScale: ShotScale): string => {
  const focus = focusTarget.trim();
  const lower = focus.toLowerCase();
  const eyesOnly = lower.includes('eye');
  const isWide = shotScale === 'wide shot' || shotScale === 'extreme wide shot';

  if (!focus) return isWide ? 'the subject silhouette and nearest facial region' : 'the subject face';
  if (eyesOnly && isWide) return 'the subject face region and silhouette while preserving readability';
  return focus;
};

const CameraPreviewScene = ({
  cameraPosition,
  yaw,
  pitch,
  roll,
  renderMode,
  ambientIntensity,
  keyLightIntensity,
  fillLightIntensity,
  rimLightIntensity,
  sunPosition,
  shadowOpacity,
  shadowBlur,
  shadowScale,
  hazeDensity,
  environmentIntensity,
  environmentRotation,
}: {
  cameraPosition: [number, number, number];
  yaw: number;
  pitch: number;
  roll: number;
  renderMode: PreviewRenderMode;
  ambientIntensity: number;
  keyLightIntensity: number;
  fillLightIntensity: number;
  rimLightIntensity: number;
  sunPosition: [number, number, number];
  shadowOpacity: number;
  shadowBlur: number;
  shadowScale: number;
  hazeDensity: number;
  environmentIntensity: number;
  environmentRotation: number;
}) => {
  const [x, y, z] = cameraPosition;
  const yawRad = ((yaw + 180) * Math.PI) / 180;
  const pitchRad = (-pitch * Math.PI) / 180;
  const rollRad = (roll * Math.PI) / 180;
  const envRotationRad = (environmentRotation * Math.PI) / 180;
  const [sunX, sunY, sunZ] = sunPosition;

  return (
    <>
      {hazeDensity > 0 && <fogExp2 attach="fog" args={['#0a0a0a', hazeDensity]} />}
      <ambientLight intensity={ambientIntensity} />
      <hemisphereLight args={['#bcd8ff', '#2a1e12', fillLightIntensity]} />

      <directionalLight
        position={[sunX, sunY, sunZ]}
        intensity={keyLightIntensity}
        castShadow={renderMode === 'cinematic'}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={1}
        shadow-camera-far={42}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-sunX * 0.45, sunY * 0.4, -sunZ * 0.45]} intensity={rimLightIntensity} />

      <Environment resolution={128}>
        <group rotation={[0, envRotationRad, 0]}>
          <Lightformer
            intensity={environmentIntensity * 1.8}
            position={[6, 5, 2]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[8, 8, 1]}
          />
          <Lightformer
            intensity={environmentIntensity * 1.2}
            position={[-5, 3.5, -4]}
            rotation={[0, -Math.PI / 3, 0]}
            scale={[7, 6, 1]}
          />
          <Lightformer
            intensity={environmentIntensity * 0.9}
            position={[0, 7, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[14, 14, 1]}
          />
        </group>
      </Environment>

      <Grid
        args={[24, 24]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2f2f2f"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#4f4f4f"
        fadeDistance={40}
        fadeStrength={1}
        position={[0, 0, 0]}
      />

      <Line points={[[0, 1, 0], [x, y, z]]} color="#FF9900" lineWidth={1.25} />

      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.4, 1.2, 6, 12]} />
        <meshStandardMaterial color="#8B5CF6" roughness={0.35} metalness={0.2} />
      </mesh>

      <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color="#C4B5FD" roughness={0.35} metalness={0.15} />
      </mesh>

      <group position={[x, y, z]} rotation={[pitchRad, yawRad, rollRad]}>
        <mesh>
          <boxGeometry args={[0.5, 0.35, 0.3]} />
          <meshStandardMaterial color="#F97316" roughness={0.25} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0, -0.32]}>
          <coneGeometry args={[0.18, 0.4, 24]} />
          <meshStandardMaterial color="#FDBA74" roughness={0.3} metalness={0.15} />
        </mesh>
      </group>

      {renderMode === 'cinematic' ? (
        <AccumulativeShadows
          temporal
          frames={80}
          scale={shadowScale}
          alphaTest={0.86}
          opacity={shadowOpacity}
          color="#1a120a"
          position={[0, 0.02, 0]}
        >
          <RandomizedLight amount={8} radius={6} ambient={0.25} intensity={keyLightIntensity * 0.55} position={sunPosition} />
        </AccumulativeShadows>
      ) : (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={shadowOpacity}
          blur={shadowBlur}
          far={24}
          scale={shadowScale}
          resolution={1024}
          frames={1}
        />
      )}

      <axesHelper args={[2.2]} />
    </>
  );
};

export function CameraPromptsTab({ onUsePrompt }: CameraPromptsTabProps) {
  const [targetModel, setTargetModel] = useState<PromptTargetModel>('google/veo-3.1');
  const [inputMode, setInputMode] = useState<PromptInputMode>('text-to-video');
  const [subject, setSubject] = useState('a determined young explorer');
  const [setting, setSetting] = useState('a vast white desert');
  const [action, setAction] = useState('the subject moves steadily forward, scanning the horizon');
  const [style, setStyle] = useState('cinematic photorealism, high detail, natural skin texture');
  const [lighting, setLighting] = useState('soft overcast daylight with subtle atmospheric haze');
  const [ambience, setAmbience] = useState('wind passing through open desert space');
  const [dialogueLine, setDialogueLine] = useState('');
  const [focusTarget, setFocusTarget] = useState('the subject eyes');
  const [movement, setMovement] = useState<CameraMovement>('slow-dolly-in');
  const [distance, setDistance] = useState(3.4);
  const [yaw, setYaw] = useState(35);
  const [pitch, setPitch] = useState(8);
  const [roll, setRoll] = useState(0);
  const [fov, setFov] = useState(38);
  const [includePoseReference, setIncludePoseReference] = useState(false);
  const [renderMode, setRenderMode] = useState<PreviewRenderMode>('preview');
  const [ambientIntensity, setAmbientIntensity] = useState(0.35);
  const [keyLightIntensity, setKeyLightIntensity] = useState(1.25);
  const [fillLightIntensity, setFillLightIntensity] = useState(0.42);
  const [rimLightIntensity, setRimLightIntensity] = useState(0.34);
  const [sunAzimuth, setSunAzimuth] = useState(35);
  const [sunElevation, setSunElevation] = useState(42);
  const [shadowOpacity, setShadowOpacity] = useState(0.55);
  const [shadowBlur, setShadowBlur] = useState(2.2);
  const [shadowScale, setShadowScale] = useState(18);
  const [environmentIntensity, setEnvironmentIntensity] = useState(0.58);
  const [environmentRotation, setEnvironmentRotation] = useState(0);
  const [hazeDensity, setHazeDensity] = useState(0.012);
  const [useSimulatedLightingInPrompt, setUseSimulatedLightingInPrompt] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [useRealismWorkflow, setUseRealismWorkflow] = useState(true);
  const [realismPreset, setRealismPreset] = useState<RealismPresetId>('balanced');
  const [emotionTone, setEmotionTone] = useState(REALISM_PRESETS.balanced.values.emotionTone);
  const [imperfectionDetails, setImperfectionDetails] = useState(
    REALISM_PRESETS.balanced.values.imperfectionDetails,
  );
  const [wardrobeDetails, setWardrobeDetails] = useState(REALISM_PRESETS.balanced.values.wardrobeDetails);
  const [lightMotivation, setLightMotivation] = useState(REALISM_PRESETS.balanced.values.lightMotivation);
  const [exposureRatio, setExposureRatio] = useState<ExposureRatio>(REALISM_PRESETS.balanced.values.exposureRatio);
  const [lensCharacter, setLensCharacter] = useState(REALISM_PRESETS.balanced.values.lensCharacter);
  const [aperture, setAperture] = useState(REALISM_PRESETS.balanced.values.aperture);
  const [eyeDetails, setEyeDetails] = useState(REALISM_PRESETS.balanced.values.eyeDetails);
  const [skinDetails, setSkinDetails] = useState(REALISM_PRESETS.balanced.values.skinDetails);
  const [hairDetails, setHairDetails] = useState(REALISM_PRESETS.balanced.values.hairDetails);
  const [atmosphereDetails, setAtmosphereDetails] = useState(REALISM_PRESETS.balanced.values.atmosphereDetails);
  const [colorPaletteRule, setColorPaletteRule] = useState(REALISM_PRESETS.balanced.values.colorPaletteRule);
  const [processingStyle, setProcessingStyle] = useState(REALISM_PRESETS.balanced.values.processingStyle);
  const [compositionGuide, setCompositionGuide] = useState(REALISM_PRESETS.balanced.values.compositionGuide);

  const applyRealismPreset = (preset: RealismPresetId) => {
    const values = REALISM_PRESETS[preset].values;
    setRealismPreset(preset);
    setEmotionTone(values.emotionTone);
    setImperfectionDetails(values.imperfectionDetails);
    setWardrobeDetails(values.wardrobeDetails);
    setLightMotivation(values.lightMotivation);
    setExposureRatio(values.exposureRatio);
    setLensCharacter(values.lensCharacter);
    setAperture(values.aperture);
    setEyeDetails(values.eyeDetails);
    setSkinDetails(values.skinDetails);
    setHairDetails(values.hairDetails);
    setAtmosphereDetails(values.atmosphereDetails);
    setColorPaletteRule(values.colorPaletteRule);
    setProcessingStyle(values.processingStyle);
    setCompositionGuide(values.compositionGuide);
  };

  const cameraPosition = useMemo<[number, number, number]>(() => {
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const x = distance * Math.cos(pitchRad) * Math.sin(yawRad);
    const y = 1 + distance * Math.sin(pitchRad);
    const z = distance * Math.cos(pitchRad) * Math.cos(yawRad);
    return [x, y, z];
  }, [distance, yaw, pitch]);

  const shotScale = useMemo(() => resolveShotScale(distance, fov), [distance, fov]);

  const sunPosition = useMemo<[number, number, number]>(() => {
    const azimuthRad = (sunAzimuth * Math.PI) / 180;
    const elevationRad = (sunElevation * Math.PI) / 180;
    const radius = 14;
    const x = radius * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = 2 + radius * Math.sin(elevationRad);
    const z = radius * Math.cos(elevationRad) * Math.cos(azimuthRad);
    return [x, y, z];
  }, [sunAzimuth, sunElevation]);

  const simulatedLighting = useMemo(() => {
    const keyDirection =
      sunElevation <= 18
        ? 'low-angle key light with long cinematic shadows'
        : sunElevation >= 60
          ? 'overhead key light with short controlled shadows'
          : 'angled key light with natural shadow falloff';
    const contrast =
      keyLightIntensity >= fillLightIntensity * 2
        ? 'high-contrast ratio'
        : keyLightIntensity <= fillLightIntensity * 1.15
          ? 'low-contrast soft lighting'
          : 'balanced contrast';
    const hazeText =
      hazeDensity >= 0.03
        ? 'noticeable atmospheric haze'
        : hazeDensity >= 0.012
          ? 'subtle atmospheric haze'
          : 'clean air clarity';

    return `${keyDirection}, ${contrast}, ambient level ${ambientIntensity.toFixed(
      2,
    )}, fill intensity ${fillLightIntensity.toFixed(2)}, rim intensity ${rimLightIntensity.toFixed(
      2,
    )}, shadow softness ${shadowBlur.toFixed(1)}, environment lift ${environmentIntensity.toFixed(
      2,
    )}, ${hazeText}`;
  }, [
    ambientIntensity,
    environmentIntensity,
    fillLightIntensity,
    hazeDensity,
    keyLightIntensity,
    rimLightIntensity,
    shadowBlur,
    sunElevation,
  ]);

  const resolvedLighting = useMemo(
    () => (useSimulatedLightingInPrompt ? simulatedLighting : lighting),
    [lighting, simulatedLighting, useSimulatedLightingInPrompt],
  );

  const realismPromptBlock = useMemo(() => {
    if (!useRealismWorkflow) return '';
    const apertureValue = Math.min(Math.max(aperture, 1), 22);
    return [
      `Human realism: emotional tone ${emotionTone}; imperfections ${imperfectionDetails}; wardrobe texture ${wardrobeDetails}.`,
      `Face fidelity: eyes ${eyeDetails}; skin ${skinDetails}; hair ${hairDetails}.`,
      `Lighting motivation: ${lightMotivation}; target exposure ratio around ${exposureRatio}.`,
      `Lens and capture: ${lensCharacter}, aperture f/${apertureValue.toFixed(1)}.`,
      `Atmosphere: ${atmosphereDetails}.`,
      `Color strategy (60/30/10): ${colorPaletteRule}.`,
      `Composition guide: ${compositionGuide}.`,
      `Finishing: ${processingStyle}.`,
      'Avoid oversharpening, waxy skin, perfect CGI symmetry, and synthetic texture patterns.',
    ].join(' ');
  }, [
    aperture,
    atmosphereDetails,
    colorPaletteRule,
    compositionGuide,
    emotionTone,
    exposureRatio,
    eyeDetails,
    hairDetails,
    imperfectionDetails,
    lensCharacter,
    lightMotivation,
    processingStyle,
    skinDetails,
    useRealismWorkflow,
    wardrobeDetails,
  ]);

  const technicalPrompt = useMemo(() => {
    const [x, y, z] = cameraPosition;
    const angleDescriptor = resolveAngleDescriptor(pitch);
    const dutchDescriptor = resolveDutchDescriptor(roll);
    const lensDescriptor = resolveLensDescriptor(fov);
    const resolvedFocus = normalizeFocusTarget(focusTarget, shotScale);

    const poseReference = `Camera pose reference (meters): x ${x.toFixed(2)}, y ${y.toFixed(
      2,
    )}, z ${z.toFixed(2)}, yaw ${yaw.toFixed(1)}deg, pitch ${pitch.toFixed(
      1,
    )}deg, roll ${roll.toFixed(1)}deg, FOV ${fov.toFixed(1)}deg.`;

    const realismSegment = realismPromptBlock ? ` ${realismPromptBlock}` : '';
    return `${subject} in ${setting}. ${MOVEMENT_SNIPPETS[movement]} ${shotScale} framing, ${angleDescriptor}, ${dutchDescriptor}, ${lensDescriptor}, focus locked on ${resolvedFocus}. Lighting: ${resolvedLighting}. ${style}.${realismSegment} ${poseReference}`;
  }, [
    cameraPosition,
    focusTarget,
    fov,
    movement,
    pitch,
    resolvedLighting,
    roll,
    setting,
    shotScale,
    style,
    subject,
    realismPromptBlock,
    yaw,
  ]);

  const optimizedPrompt = useMemo(() => {
    const [x, y, z] = cameraPosition;
    const angleDescriptor = resolveAngleDescriptor(pitch);
    const dutchDescriptor = resolveDutchDescriptor(roll);
    const lensDescriptor = resolveLensDescriptor(fov);
    const resolvedFocus = normalizeFocusTarget(focusTarget, shotScale);
    const dialogue = dialogueLine.trim();
    const dialogueSegment = dialogue ? ` Spoken line: "${dialogue}".` : '';
    const cameraCore = `${MOVEMENT_SNIPPETS[movement]} ${shotScale} framing, ${angleDescriptor}, ${dutchDescriptor}, ${lensDescriptor}, focus priority on ${resolvedFocus}.`;
    const motionCore = `${action}. Motion stays physically plausible and continuous, with no warping, no identity drift, and no anatomy artifacts.`;
    const poseReference = ` Camera pose reference (meters): x ${x.toFixed(2)}, y ${y.toFixed(
      2,
    )}, z ${z.toFixed(2)}, yaw ${yaw.toFixed(1)}deg, pitch ${pitch.toFixed(1)}deg, roll ${roll.toFixed(
      1,
    )}deg, FOV ${fov.toFixed(1)}deg.`;
    const qualityGuardrail =
      ' No on-screen text, subtitles, watermark, logo, extra limbs, deformed hands/eyes, waxy skin, or over-sharpened textures.';
    const realismSegment = realismPromptBlock ? ` ${realismPromptBlock}` : '';

    const textToVideoBase = `${subject} in ${setting}. ${motionCore} ${cameraCore} Lighting: ${resolvedLighting}. Visual style: ${style}.${realismSegment} Ambient sound: ${ambience}.${dialogueSegment}${qualityGuardrail}`;
    const imageToVideoBase = `Start from the provided source image and preserve identity, wardrobe, and environment continuity. ${motionCore} ${cameraCore} Keep original style fidelity; only animate motion/camera.${realismSegment} Ambient sound: ${ambience}.${dialogueSegment}${qualityGuardrail}`;
    const basePrompt = inputMode === 'image-to-video' ? imageToVideoBase : textToVideoBase;

    let modelPrompt = basePrompt;

    if (targetModel === 'google/veo-3.1') {
      modelPrompt =
        inputMode === 'image-to-video'
          ? `Source-image animation: keep subject and scene consistent. ${motionCore} ${cameraCore} Lighting: ${resolvedLighting}.${realismSegment} ${qualityGuardrail}`
          : `${subject} in ${setting}. ${motionCore} ${cameraCore} Lighting: ${resolvedLighting}. Style: ${style}.${realismSegment} Ambient sound design: ${ambience}.${dialogueSegment}${qualityGuardrail}`;
    } else if (targetModel === 'kwaivgi/kling-v4.0') {
      modelPrompt =
        inputMode === 'image-to-video'
          ? `Animate @image_1 and keep subject, wardrobe and scene consistent. ${motionCore} ${cameraCore} Lighting and mood: ${resolvedLighting}.${realismSegment} Keep scene stable from start to end.${qualityGuardrail}`
          : `${subject} in ${setting}. ${motionCore} ${cameraCore} Lighting and mood: ${resolvedLighting}. Style: ${style}.${realismSegment} Keep scene stable from start to end.${qualityGuardrail}`;
    } else if (targetModel === 'kwaivgi/kling-v2.6') {
      modelPrompt = `${subject} in ${setting}. ${motionCore} ${cameraCore} Lighting and mood: ${resolvedLighting}. Style: ${style}.${realismSegment} Sound bed: ${ambience}.${dialogueSegment} Keep scene stable from start to end.${qualityGuardrail}`;
    } else if (targetModel === 'openai/sora-2') {
      modelPrompt = `Style first: ${style}. Scene: ${subject} in ${setting}. Action: ${action}. Camera: ${cameraCore} Lighting: ${resolvedLighting}.${realismSegment} Audio mood: ${ambience}.${dialogueSegment}${qualityGuardrail}`;
    }

    if (!includePoseReference) return modelPrompt;
    return `${modelPrompt}${poseReference}`;
  }, [
    action,
    ambience,
    cameraPosition,
    dialogueLine,
    focusTarget,
    fov,
    includePoseReference,
    inputMode,
    movement,
    pitch,
    roll,
    setting,
    shotScale,
    style,
    subject,
    targetModel,
    resolvedLighting,
    realismPromptBlock,
    yaw,
  ]);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
    } catch (error) {
      console.error('Clipboard copy failed', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-5">
        <h3 className="text-xl font-instrument-serif text-white">3D Camera Prompt Workbench</h3>
        <p className="mt-2 text-sm text-white/60">
          Positioniere die Kamera in 3D, wähle Bewegung + Lens-Feeling und erzeuge automatisch einen
          einsatzfertigen Prompt für Video-Modelle. Danach kannst du ihn direkt in den Generator schicken.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">3D Camera Preview</h4>
            <span className="text-[11px] uppercase tracking-widest text-white/35">Orbit + Zoom</span>
          </div>
          <div className="h-[360px] overflow-hidden rounded-lg border border-white/10 bg-[#080808]">
            <Canvas camera={{ position: [7, 6, 7], fov: 50 }}>
              <CameraPreviewScene
                cameraPosition={cameraPosition}
                yaw={yaw}
                pitch={pitch}
                roll={roll}
                renderMode={renderMode}
                ambientIntensity={ambientIntensity}
                keyLightIntensity={keyLightIntensity}
                fillLightIntensity={fillLightIntensity}
                rimLightIntensity={rimLightIntensity}
                sunPosition={sunPosition}
                shadowOpacity={shadowOpacity}
                shadowBlur={shadowBlur}
                shadowScale={shadowScale}
                hazeDensity={hazeDensity}
                environmentIntensity={environmentIntensity}
                environmentRotation={environmentRotation}
              />
              <OrbitControls
                makeDefault
                target={[0, 1, 0]}
                enablePan
                enableRotate
                enableZoom
                minDistance={3}
                maxDistance={30}
              />
            </Canvas>
          </div>
          <p className="mt-3 text-xs text-white/50">
            Lila Figur = Subject, Orange Marker = deine virtuelle Kamera, Orange Linie = Blickbeziehung.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/50 p-3 max-h-[330px] overflow-y-auto">
              <div className="mb-2 flex items-center justify-between">
                <h5 className="text-xs font-semibold text-white">Camera Rig</h5>
                <span className="text-[10px] uppercase tracking-widest text-white/35">Pose</span>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Distance: {distance.toFixed(1)}m</label>
                  <input
                    type="range"
                    min={0.6}
                    max={14}
                    step={0.1}
                    value={distance}
                    onChange={(event) => setDistance(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Yaw: {yaw.toFixed(0)}deg</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={yaw}
                    onChange={(event) => setYaw(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Pitch: {pitch.toFixed(0)}deg</label>
                  <input
                    type="range"
                    min={-40}
                    max={80}
                    step={1}
                    value={pitch}
                    onChange={(event) => setPitch(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Roll: {roll.toFixed(0)}deg</label>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={roll}
                    onChange={(event) => setRoll(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">FOV: {fov.toFixed(0)}deg</label>
                  <input
                    type="range"
                    min={18}
                    max={100}
                    step={1}
                    value={fov}
                    onChange={(event) => setFov(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-3 rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-[11px] text-white/70">
                Shot scale estimate: <span className="text-white">{shotScale}</span>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/50 p-3 max-h-[330px] overflow-y-auto">
              <div className="mb-2 flex items-center justify-between">
                <h5 className="text-xs font-semibold text-white">Light Rig</h5>
                <span className="text-[10px] uppercase tracking-widest text-white/35">
                  {renderMode === 'cinematic' ? 'HQ' : 'Fast'}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Render Mode</label>
                  <select
                    value={renderMode}
                    onChange={(event) => setRenderMode(event.target.value as PreviewRenderMode)}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900]"
                  >
                    <option value="preview">Preview (fast)</option>
                    <option value="cinematic">Cinematic (HQ)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-[11px] text-white/70">
                  <input
                    type="checkbox"
                    checked={useSimulatedLightingInPrompt}
                    onChange={(event) => setUseSimulatedLightingInPrompt(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-black/60"
                  />
                  Use light in prompt
                </label>
              </div>

              <div className="mt-2 space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Sun Azimuth: {sunAzimuth.toFixed(0)}deg</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={sunAzimuth}
                    onChange={(event) => setSunAzimuth(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Sun Elevation: {sunElevation.toFixed(0)}deg</label>
                  <input
                    type="range"
                    min={4}
                    max={85}
                    step={1}
                    value={sunElevation}
                    onChange={(event) => setSunElevation(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Key: {keyLightIntensity.toFixed(2)}</label>
                    <input
                      type="range"
                      min={0.2}
                      max={3}
                      step={0.01}
                      value={keyLightIntensity}
                      onChange={(event) => setKeyLightIntensity(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Fill: {fillLightIntensity.toFixed(2)}</label>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.01}
                      value={fillLightIntensity}
                      onChange={(event) => setFillLightIntensity(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Ambient: {ambientIntensity.toFixed(2)}</label>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.01}
                      value={ambientIntensity}
                      onChange={(event) => setAmbientIntensity(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Haze: {hazeDensity.toFixed(3)}</label>
                    <input
                      type="range"
                      min={0}
                      max={0.08}
                      step={0.001}
                      value={hazeDensity}
                      onChange={(event) => setHazeDensity(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <details className="mt-2 rounded-md border border-white/10 bg-black/60 p-2 text-[11px] text-white/70">
                <summary className="cursor-pointer font-semibold text-white/80">Advanced light controls</summary>
                <div className="mt-2 space-y-2.5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">Rim: {rimLightIntensity.toFixed(2)}</label>
                      <input
                        type="range"
                        min={0}
                        max={1.5}
                        step={0.01}
                        value={rimLightIntensity}
                        onChange={(event) => setRimLightIntensity(Number(event.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">Env Lift: {environmentIntensity.toFixed(2)}</label>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.01}
                        value={environmentIntensity}
                        onChange={(event) => setEnvironmentIntensity(Number(event.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">
                      Env Rotation: {environmentRotation.toFixed(0)}deg
                    </label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={environmentRotation}
                      onChange={(event) => setEnvironmentRotation(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">Opacity: {shadowOpacity.toFixed(2)}</label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={shadowOpacity}
                        onChange={(event) => setShadowOpacity(Number(event.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">Softness: {shadowBlur.toFixed(1)}</label>
                      <input
                        type="range"
                        min={0}
                        max={6}
                        step={0.1}
                        value={shadowBlur}
                        onChange={(event) => setShadowBlur(Number(event.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">Spread: {shadowScale.toFixed(1)}</label>
                      <input
                        type="range"
                        min={8}
                        max={28}
                        step={0.5}
                        value={shadowScale}
                        onChange={(event) => setShadowScale(Number(event.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </details>

              <div className="mt-2 rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-[11px] text-white/65">
                Active lighting: {resolvedLighting}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <h4 className="text-sm font-semibold text-white">Prompt Controls</h4>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Target Model</label>
              <select
                value={targetModel}
                onChange={(event) => setTargetModel(event.target.value as PromptTargetModel)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              >
                {TARGET_MODEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/50">
                {TARGET_MODEL_OPTIONS.find((option) => option.id === targetModel)?.note}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Input Mode</label>
              <select
                value={inputMode}
                onChange={(event) => setInputMode(event.target.value as PromptInputMode)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              >
                <option value="text-to-video">Text to Video</option>
                <option value="image-to-video">Image to Video</option>
              </select>
              <p className="text-[11px] text-white/50">{INPUT_MODE_NOTES[inputMode]}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">Subject</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              placeholder="subject description"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">Setting</label>
            <input
              value={setting}
              onChange={(event) => setSetting(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              placeholder="environment / location"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">Action / Motion</label>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              placeholder="what the subject does over time"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">Style</label>
            <input
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              placeholder="look and finish"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Lighting (manual fallback)</label>
              <input
                value={lighting}
                onChange={(event) => setLighting(event.target.value)}
                disabled={useSimulatedLightingInPrompt}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="lighting setup"
              />
              <p className="text-[11px] text-white/45">
                {useSimulatedLightingInPrompt
                  ? 'Disabled because simulated lighting is active.'
                  : 'Used as prompt lighting descriptor.'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Ambient Sound</label>
              <input
                value={ambience}
                onChange={(event) => setAmbience(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
                placeholder="audio atmosphere"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/60">Dialogue (optional)</label>
            <input
              value={dialogueLine}
              onChange={(event) => setDialogueLine(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              placeholder="character spoken line"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Movement</label>
              <select
                value={movement}
                onChange={(event) => setMovement(event.target.value as CameraMovement)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
              >
                {Object.entries(MOVEMENT_SNIPPETS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {key} - {value.split('.')[0]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Focus Target</label>
              <input
                value={focusTarget}
                onChange={(event) => setFocusTarget(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
                placeholder="focus point"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={includePoseReference}
              onChange={(event) => setIncludePoseReference(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/60"
            />
            Include camera pose reference in prompt output
          </label>

          <details className="rounded-lg border border-white/10 bg-black/55 p-3 text-xs text-white/70">
            <summary className="inline-flex cursor-pointer list-none items-center rounded-md border border-[#FF9900]/50 bg-[#FF9900] px-3 py-1.5 text-xs font-bold text-black transition-colors hover:bg-[#ffad33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900]">
              Realism Workflow (Human Fidelity)
            </summary>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={useRealismWorkflow}
                  onChange={(event) => setUseRealismWorkflow(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/60"
                />
                Inject realism block into optimized prompt
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Workflow Preset</label>
                  <select
                    value={realismPreset}
                    onChange={(event) => applyRealismPreset(event.target.value as RealismPresetId)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {Object.entries(REALISM_PRESETS).map(([id, preset]) => (
                      <option key={id} value={id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-[11px] text-white/55">
                  {REALISM_PRESETS[realismPreset].note}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Emotional tone</label>
                  <input
                    value={emotionTone}
                    onChange={(event) => setEmotionTone(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Imperfections</label>
                  <input
                    value={imperfectionDetails}
                    onChange={(event) => setImperfectionDetails(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Lens character</label>
                  <input
                    value={lensCharacter}
                    onChange={(event) => setLensCharacter(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Wardrobe / material texture</label>
                  <input
                    value={wardrobeDetails}
                    onChange={(event) => setWardrobeDetails(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Exposure ratio</label>
                  <select
                    value={exposureRatio}
                    onChange={(event) => setExposureRatio(event.target.value as ExposureRatio)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {EXPOSURE_RATIO_OPTIONS.map((ratio) => (
                      <option key={ratio} value={ratio}>
                        {ratio}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] text-white/60">
                    Aperture f/{aperture.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={22}
                    step={0.1}
                    value={aperture}
                    onChange={(event) => setAperture(Number(event.target.value))}
                    disabled={!useRealismWorkflow}
                    className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-white/60">Light motivation</label>
                <input
                  value={lightMotivation}
                  onChange={(event) => setLightMotivation(event.target.value)}
                  disabled={!useRealismWorkflow}
                  className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Eyes</label>
                  <input
                    value={eyeDetails}
                    onChange={(event) => setEyeDetails(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Skin</label>
                  <input
                    value={skinDetails}
                    onChange={(event) => setSkinDetails(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Hair</label>
                  <input
                    value={hairDetails}
                    onChange={(event) => setHairDetails(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Atmosphere texture</label>
                  <input
                    value={atmosphereDetails}
                    onChange={(event) => setAtmosphereDetails(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Color palette (60/30/10)</label>
                  <input
                    value={colorPaletteRule}
                    onChange={(event) => setColorPaletteRule(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Composition guidance</label>
                  <input
                    value={compositionGuide}
                    onChange={(event) => setCompositionGuide(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/60">Processing style</label>
                  <input
                    value={processingStyle}
                    onChange={(event) => setProcessingStyle(event.target.value)}
                    disabled={!useRealismWorkflow}
                    className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF9900] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-black/60 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white/80">Realism block preview</span>
                  <button
                    onClick={() => copyText('realism-block', realismPromptBlock)}
                    disabled={!useRealismWorkflow}
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-black/70 px-2 py-1 text-[10px] font-semibold text-white hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedId === 'realism-block' ? 'Copied' : 'Copy block'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-[11px] text-white/70">
                  {useRealismWorkflow
                    ? realismPromptBlock
                    : 'Workflow disabled. Enable it to inject this realism specification into your optimized prompt.'}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-white">Optimized Prompt (Copy Ready)</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copyText('generated', optimizedPrompt)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-semibold text-white hover:border-white/30"
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedId === 'generated' ? 'Copied' : 'Copy Optimized Prompt'}
            </button>
            {onUsePrompt && (
              <button
                onClick={() => onUsePrompt(optimizedPrompt)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF9900] px-3 py-2 text-xs font-bold text-black hover:bg-[#ffad33]"
              >
                <Send className="h-3.5 w-3.5" />
                Use in Generator
              </button>
            )}
          </div>
        </div>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/85">
          {optimizedPrompt}
        </pre>
        <details className="mt-3 rounded-lg border border-white/10 bg-black/55 p-3 text-xs text-white/70">
          <summary className="cursor-pointer font-semibold text-white/80">Show technical raw camera line</summary>
          <pre className="mt-2 whitespace-pre-wrap text-[11px] text-white/65">{technicalPrompt}</pre>
        </details>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-100/80">
          Optimizer profile: {TARGET_MODEL_OPTIONS.find((option) => option.id === targetModel)?.label} ·{' '}
          {INPUT_MODE_NOTES[inputMode]}
        </pre>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-5">
        <h3 className="text-xl font-instrument-serif text-white">Camera Prompt Library</h3>
        <p className="mt-2 text-sm text-white/60">
          Nutze diese Kamera-Keywords als zusaetzliche Prompt-Zeile. Platzhalter wie{' '}
          <span className="text-white/80">[OBJECT A]</span> oder <span className="text-white/80">[DETAIL]</span>{' '}
          kannst du direkt ersetzen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CAMERA_PROMPTS.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/10 bg-black/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                <p className="mt-1 text-xs text-white/55">{item.intent}</p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-white/30">Camera</span>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80">
              {item.prompt}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => copyText(item.title, item.prompt)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-semibold text-white hover:border-white/30"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedId === item.title ? 'Copied' : 'Copy'}
              </button>
              {onUsePrompt && (
                <button
                  onClick={() => onUsePrompt(item.prompt)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FF9900] px-3 py-2 text-xs font-bold text-black hover:bg-[#ffad33]"
                >
                  <Send className="h-3.5 w-3.5" />
                  Use in Generator
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
