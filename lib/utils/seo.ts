// SEO Configuration for STAKE & SCALE
// Centralized metadata for all pages

export const siteConfig = {
  name: "STAKE & SCALE",
  description: "Das führende AI Brand & Venture Studio. Erschaffe, validiere und skaliere deine eigene Marke mit der Power von AI – vom Konzept bis zum globalen Launch.",
  url: "https://www.stakeandscale.de",
  ogImage: "/og-image.jpg",
  links: {
    twitter: "https://twitter.com/stakeandscale",
    github: "https://github.com/stakeandscale",
  },
};

// Page-specific SEO metadata
export const pageSeo = {
  // Landing Page
  home: {
    title: "STAKE & SCALE | Professionelles AI Brand Building & Venture Studio",
    description: "Erschaffe deine Marke mit AI. Wir vereinen Brand Identity, Video-Production mit Veo 3.1 & Kling AI sowie Sourcing in einem System. Werde vom Solo-Founder zur skalierbaren Brand – strukturiert und schnell.",
    keywords: [
      "brand building ai", "markenaufbau", "brand identity erstellen", "venture studio deutschland",
      "startup branding", "e-commerce brand aufbauen", "d2c branding", "marke gründen",
      // AI Branding & Video
      "veo 3.1 branding", "ai video branding", "konsistente ai charaktere", "ai influencer agentur",
      "kling ai video studio", "luma dream machine marketing",
      "ai brand voice", "ai logo design", "corporate identity ai",
      "virtuelle influencer erstellen", "ai model branding", "visual identity ai",
      "produktvideos erstellen ki", "ai marketing automation", "consistent branding ai",
      // Startup/Scale
      "solo founder branding", "startup community", "brand scaling", "venture system", "markenstrategie ai"
    ],
  },
  
  // Auth
  login: {
    title: "Login | Dein Brand Workspace | STAKE & SCALE",
    description: "Greife auf dein Brand Studio zu. Verwalte deine Identität, Kampagnen und Sourcing an einem zentralen Ort.",
    keywords: ["brand studio login", "startup workspace", "founder portal"],
    noIndex: true,
  },
  
  // Dashboard
  dashboard: {
    title: "Brand Cockpit | STAKE & SCALE",
    description: "Dein zentrales Cockpit für alle Marken-Assets, Fortschritte und Squad-Aktivitäten.",
    keywords: ["brand management", "startup dashboard"],
    noIndex: true,
  },
  
  // Ventures
  ventures: {
    title: "Meine Brands & Ventures | STAKE & SCALE",
    description: "Übersicht deiner aktiven Markenprojekte. Skaliere mehrere Brands parallel mit dem Forge OS.",
    keywords: ["brand portfolio", "venture management", "multi-brand studio"],
    noIndex: true,
  },
  
  ventureNew: {
    title: "Neue Brand erschaffen | STAKE & SCALE",
    description: "Starte den Brand-Building-Prozess. Von der Nische zur Identität in Rekordzeit.",
    keywords: ["brand erstellen", "marke gründen", "business branding"],
  },
  
  ventureDetail: {
    titleTemplate: (name: string) => `${name} | Brand Identity & Ops | STAKE & SCALE`,
    descriptionTemplate: (name: string) => `Verwalte die Brand DNA, Kampagnen und das Sourcing für ${name} exklusiv auf STAKE & SCALE.`,
    noIndex: true,
  },
  
  // Squads
  squads: {
    title: "Squad Marketplace | STAKE & SCALE",
    description: "Finde dein Gründungsteam. Tritt einem Squad bei oder gründe dein eigenes. 2-5 Founder, ein Ziel.",
    keywords: ["co-founder finden", "gründungsteam", "startup partner", "sweat equity", "mitgründer suchen"],
  },
  
  squadDetail: {
    titleTemplate: (name: string) => `${name} Squad | STAKE & SCALE`,
    noIndex: true,
  },
  
  // Studios (The Forge)
  forge: {
    title: "The Forge | Dein Venture Workspace",
    description: "Das zentrale Dashboard für dein Venture. Brand, Marketing, Sourcing und Legal – alles vereint.",
    keywords: ["venture workspace", "startup tools", "founder dashboard"],
    noIndex: true,
  },
  
  brandStudio: {
    title: "Brand DNA Studio | STAKE & SCALE",
    description: "Erstelle deine Markenidentität mit KI. Logo, Brand Voice, Farben, Typography – konsistent und professionell.",
    keywords: ["branding ai", "logo generator", "brand voice", "markenidentität", "corporate design"],
    noIndex: true,
  },
  
  marketingStudio: {
    title: "AI Video Studio | Veo 3.1 & Kling AI | STAKE & SCALE",
    description: "Erstelle professionelle Marketing-Videos mit Veo 3.1, Kling AI & Luma Dream Machine. Face-Swap, AI-Avatare, AI Influencer Images, Lip-Sync und Product Videos – direkt in deinem Brand-Workspace.",
    keywords: [
      "veo ai", "veo 3.1 video", "kling ai", "luma dream machine",
      "ai video generator", "text to video deutsch", "image to video ai",
      "ai avatar", "face swap video", "ai marketing video", "ai character swap", "character animation", "ai avatar generator", "ai avatar erstellen", "ai face swap", "face swap ai",
      "full body swap", "body swap ai", "person swap ai",
      "ai influencer images", "ai influencer bilder", "virtual influencer", "digital influencer", "ai model images", "ai model fotos",
      "lip sync ai", "lip sync deutsch", "ai lip sync", "ai lip sync video",
      "ki video erstellen", "ai content creation", "social media automation",
      // New High-Volume Consistency Keywords (2026)
      "ai influencer erstellen", "create ai influencer", "consistent ai character", "virtual model agency", "ai brand ambassador", "multi-image dna", "face consistency ai", "virtual influencer software", "consistent character generator"
    ],
    noIndex: true,
  },
  
  sourcingStudio: {
    title: "Sourcing Studio | Lieferanten & Produktion | STAKE & SCALE",
    description: "Finde und manage Lieferanten weltweit. AI Discovery, Sample-Tracking und Purchase Orders – alles in einem System.",
    keywords: ["lieferanten finden", "supplier sourcing", "produktion management", "ecommerce sourcing", "hersteller finden"],
    noIndex: true,
  },
  
  legalStudio: {
    title: "Legal Studio | Verträge & Compliance | STAKE & SCALE",
    description: "Rechtssichere Verträge mit KI generieren. NDAs, Co-Founder Agreements, Service Agreements – in Minuten statt Stunden.",
    keywords: ["startup verträge", "nda generator", "co-founder agreement", "legal tech", "vertrag erstellen"],
    noIndex: true,
  },
  
  // Resources
  resources: {
    title: "Ressourcen & Learnings | STAKE & SCALE",
    description: "Wissensdatenbank für Founder. Guides, Templates und Best Practices für dein Venture.",
    keywords: ["startup lernen", "founder guides", "gründung wissen", "startup ressourcen"],
  },
  
  resourceDetail: {
    titleTemplate: (title: string) => `${title} | Ressource | STAKE & SCALE`,
    descriptionTemplate: (title: string) => `${title} – Lies den vollständigen Guide auf STAKE & SCALE.`,
  },
  
  // Forum
  forum: {
    title: "Community Forum | STAKE & SCALE",
    description: "Tausche dich mit anderen Foundern aus. Fragen, Showcases und Diskussionen rund um Ventures und Startups.",
    keywords: ["startup community", "founder forum", "gründung austausch", "startup diskussion"],
  },
  
  // Pricing
  pricing: {
    title: "Preise & Pläne | STAKE & SCALE",
    description: "Flexible Preise für jeden Gründungsphase. Starte kostenlos mit 50 AI-Credits. Upgrade jederzeit.",
    keywords: ["venture studio preise", "startup kosten", "founder tools preise", "ai credits"],
  },
  
  // Demo Shop
  demoShop: {
    title: "Demo Shop | STAKE & SCALE Beispiel",
    description: "Sieh dir an, was mit STAKE & SCALE möglich ist. Beispiel-Shop powered by The Forge.",
    keywords: ["demo shop", "beispiel venture", "shop showcase"],
  },
  
  // Legal Pages
  imprint: {
    title: "Impressum | STAKE & SCALE",
    description: "Impressum von STAKE & SCALE – Community Venture Studio.",
    noIndex: true,
  },
  
  privacy: {
    title: "Datenschutz | STAKE & SCALE",
    description: "Datenschutzerklärung von STAKE & SCALE. Deine Daten sind sicher.",
    noIndex: true,
  },
  
  terms: {
    title: "AGB | STAKE & SCALE",
    description: "Allgemeine Geschäftsbedingungen von STAKE & SCALE.",
    noIndex: true,
  },
  
  // Settings
  settings: {
    title: "Einstellungen | STAKE & SCALE",
    description: "Verwalte dein Konto, API-Keys, Integrationen und Billing.",
    noIndex: true,
  },
};

// Helper to generate metadata
export function generateMetadata(
  title: string,
  description: string,
  options?: {
    keywords?: string[];
    noIndex?: boolean;
    ogImage?: string;
    canonical?: string;
  }
) {
  return {
    title,
    description,
    keywords: options?.keywords,
    ...(options?.noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    openGraph: {
      title,
      description,
      url: options?.canonical || siteConfig.url,
      siteName: siteConfig.name,
      images: options?.ogImage || siteConfig.ogImage,
      locale: "de_DE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: options?.ogImage || siteConfig.ogImage,
    },
    ...(options?.canonical && {
      alternates: {
        canonical: options.canonical,
      },
    }),
  };
}

// Structured Data Generators
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "STAKE & SCALE",
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: siteConfig.description,
    sameAs: [
      siteConfig.links.twitter,
      siteConfig.links.github,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@stakeandscale.de",
      contactType: "customer support",
    },
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "STAKE & SCALE",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
    },
    description: siteConfig.description,
  };
}

export function generateFAQSchema(faqs: Array<{question: string; answer: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
