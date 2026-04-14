/**
 * Prompt Templates für AI Media Generation
 * Basierend auf Best Practices 2025
 */

export interface PromptTemplate {
  id: string;
  label: string;
  category: 'product' | 'lifestyle' | 'social' | 'brand' | 'video';
  type: 'image' | 'video';
  prompt: string;
  placeholders?: string[]; // z.B. [PRODUCT], [BRAND]
  tips?: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // === PRODUCT PHOTOGRAPHY ===
  {
    id: 'product-studio-white',
    label: 'Studio Shot · White BG',
    category: 'product',
    type: 'image',
    prompt: 'Professional product photography of [PRODUCT], studio lighting, crisp shadows, white background, sharp focus, 4K resolution, commercial quality',
    placeholders: ['PRODUCT'],
    tips: 'Perfekt für E-Commerce · Neutrale Präsentation'
  },
  {
    id: 'product-lifestyle-natural',
    label: 'Lifestyle · Natural Light',
    category: 'product',
    type: 'image',
    prompt: 'Lifestyle product shot of [PRODUCT] in everyday setting, natural window light, authentic moment, soft shadows, warm tones, Instagram aesthetic, shallow depth of field',
    placeholders: ['PRODUCT'],
    tips: 'Emotional Connection · Relatable Context'
  },
  {
    id: 'product-premium-dark',
    label: 'Premium · Dark Mood',
    category: 'product',
    type: 'image',
    prompt: 'Luxury product photography of [PRODUCT] on black marble surface, dramatic side lighting, gold accents, reflective surface, premium aesthetic, Hasselblad medium format look',
    placeholders: ['PRODUCT'],
    tips: 'High-End Positioning · Exklusivität'
  },
  {
    id: 'product-floating-gradient',
    label: 'Floating · Gradient BG',
    category: 'product',
    type: 'image',
    prompt: '[PRODUCT] floating in space, gradient background from [COLOR1] to [COLOR2], soft ambient lighting, ethereal mood, 3D render style, clean composition',
    placeholders: ['PRODUCT', 'COLOR1', 'COLOR2'],
    tips: 'Modern · Tech-Vibes · Social Media'
  },
  {
    id: 'product-action-splash',
    label: 'Action Shot · Dynamic',
    category: 'product',
    type: 'image',
    prompt: '[PRODUCT] captured mid-action with water splash, high-speed photography, frozen motion, dramatic lighting, black background, professional studio setup, ultra-sharp detail',
    placeholders: ['PRODUCT'],
    tips: 'Energy · Bewegung · Perfekt für Sportprodukte'
  },

  // === SOCIAL MEDIA ===
  {
    id: 'social-instagram-story',
    label: 'Instagram Story · Bold',
    category: 'social',
    type: 'image',
    prompt: 'Eye-catching Instagram story visual, bold colors, geometric shapes, text space at top, modern design, 9:16 format, trending aesthetic, high contrast',
    tips: 'Attention-Grabbing · Quick Consumption'
  },
  {
    id: 'social-carousel-swipe',
    label: 'Carousel Post · Swipeable',
    category: 'social',
    type: 'image',
    prompt: 'Instagram carousel post design showing [TOPIC], educational layout, clean typography space, cohesive color palette, infographic style, professional yet approachable',
    placeholders: ['TOPIC'],
    tips: 'Educational Content · Engagement Boost'
  },
  {
    id: 'social-meme-template',
    label: 'Meme Template · Viral',
    category: 'social',
    type: 'image',
    prompt: 'Viral meme template about [TOPIC], relatable scenario, humorous composition, text overlay space, shareable aesthetic, TikTok/Instagram style',
    placeholders: ['TOPIC'],
    tips: 'Reichweite · Community Building'
  },

  // === BRAND VISUALS ===
  {
    id: 'brand-hero-cinematic',
    label: 'Hero Image · Cinematic',
    category: 'brand',
    type: 'image',
    prompt: 'Cinematic brand hero image representing [BRAND VALUES], epic landscape, golden hour lighting, emotional atmosphere, widescreen composition, film grain, color graded like a movie poster',
    placeholders: ['BRAND VALUES'],
    tips: 'Website Hero · Emotional Impact'
  },
  {
    id: 'brand-abstract-concept',
    label: 'Abstract · Conceptual',
    category: 'brand',
    type: 'image',
    prompt: 'Abstract conceptual art representing [CONCEPT], minimalist composition, sophisticated color palette, geometric elements, modern art style, balanced negative space',
    placeholders: ['CONCEPT'],
    tips: 'Corporate · Innovation · Future-Focused'
  },
  {
    id: 'brand-team-culture',
    label: 'Team Culture · Authentic',
    category: 'brand',
    type: 'image',
    prompt: 'Authentic team culture photo, diverse group collaborating, natural office environment, genuine laughter and engagement, documentary photography style, natural light, candid moment',
    tips: 'Employer Branding · Authentizität'
  },

  // === VIDEO GENERATION ===
  {
    id: 'video-product-reveal',
    label: 'Product Reveal · 360°',
    category: 'video',
    type: 'video',
    prompt: '[PRODUCT] on pedestal, camera slowly orbits 360 degrees, studio lighting, black background, smooth motion, professional cinematography',
    placeholders: ['PRODUCT'],
    tips: 'Kling: Nutze "360-degree rotation" für beste Ergebnisse'
  },
  {
    id: 'video-brand-story',
    label: 'Brand Story · Cinematic',
    category: 'video',
    type: 'video',
    prompt: 'Cinematic brand story showing [BRAND VALUES], slow motion sequences, golden hour lighting, emotional narrative, smooth camera movements, color graded warm tones, inspirational mood',
    placeholders: ['BRAND VALUES'],
    tips: 'Kling: Unter 40 Wörter für beste Qualität'
  },
  {
    id: 'video-product-action',
    label: 'Product in Action · Dynamic',
    category: 'video',
    type: 'video',
    prompt: '[PRODUCT] being used in real-world scenario, tracking shot following the action, natural lighting, authentic moment, smooth camera movement parallel to subject',
    placeholders: ['PRODUCT'],
    tips: 'Minimax: Perfekt für Human Motion'
  },
  {
    id: 'video-lifestyle-loop',
    label: 'Lifestyle Loop · Seamless',
    category: 'video',
    type: 'video',
    prompt: '[SCENE] creating a seamless loop, gentle camera drift, soft lighting, peaceful atmosphere, subtle motion, perfect for social media background',
    placeholders: ['SCENE'],
    tips: 'Luma: Atmospheric & Loopable'
  },
  {
    id: 'video-product-unbox',
    label: 'Unboxing · First Person',
    category: 'video',
    type: 'video',
    prompt: 'POV unboxing of [PRODUCT], hands carefully opening premium packaging, top-down camera angle, natural lighting, focus shift from box to product, anticipation building',
    placeholders: ['PRODUCT'],
    tips: 'Engagement · Relatable · E-Commerce'
  },
  {
    id: 'video-pan-reveal',
    label: 'Pan-to-Reveal · Dramatic',
    category: 'video',
    type: 'video',
    prompt: 'Camera slowly pans to reveal [SUBJECT], dramatic lighting, building anticipation, cinematic movement, focus shift, depth of field effect',
    placeholders: ['SUBJECT'],
    tips: 'Kling: Nutze "pan-to-reveal" für Storytelling'
  },
];

/**
 * Helper: Prompt mit Brand DNA Context anreichern
 */
export function enrichPromptWithBrandDNA(
  template: string,
  brandDNA?: any
): string {
  if (!brandDNA) return template;

  let enriched = template;

  // Replace placeholders with brand-specific info
  if (template.includes('[BRAND VALUES]') && brandDNA.values) {
    enriched = enriched.replace('[BRAND VALUES]', brandDNA.values.join(', '));
  }

  if (template.includes('[BRAND]') && brandDNA.brandName) {
    enriched = enriched.replace('[BRAND]', brandDNA.brandName);
  }

  // Add brand context at the end
  const contextAdditions = [];

  if (brandDNA.toneOfVoice) {
    contextAdditions.push(`${brandDNA.toneOfVoice} tone`);
  }

  if (brandDNA.primaryColor) {
    contextAdditions.push(`${brandDNA.primaryColor} color accent`);
  }

  if (contextAdditions.length > 0) {
    enriched += `, ${contextAdditions.join(', ')}`;
  }

  return enriched;
}

/**
 * Filter Templates nach Type
 */
export function getTemplatesByType(type: 'image' | 'video'): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter(t => t.type === type);
}

/**
 * Filter Templates nach Category
 */
export function getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter(t => t.category === category);
}
