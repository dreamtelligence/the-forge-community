/**
 * Venture Templates with standardized workflows
 * Each template contains steps and tasks with recommended deadlines
 */

export interface TemplateStep {
  number: number;
  name: string;
  description: string;
  estimatedDays: number;
}

export interface TemplateTask {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDays: number; // Days from venture creation
  category: string;
}

export interface VentureTemplateData {
  type: string;
  name: string;
  description: string;
  steps: TemplateStep[];
  tasks: TemplateTask[];
  estimatedDuration: number; // Total days
}

// ============================================
// E-COMMERCE TEMPLATE (SmartStore focus)
// ============================================

export const ECOMMERCE_TEMPLATE: VentureTemplateData = {
  type: 'ECOMMERCE',
  name: 'E-Commerce Venture',
  description: 'Standardisierter Workflow für E-Commerce/Product Businesses',
  estimatedDuration: 90, // 3 months to launch
  steps: [
    {
      number: 1,
      name: 'Produkttyp & Markt',
      description: 'Produktkategorie definieren und Zielmarkt analysieren',
      estimatedDays: 7
    },
    {
      number: 2,
      name: 'Name & Branding',
      description: 'Firmenname, Logo und Markenidentität entwickeln',
      estimatedDays: 10
    },
    {
      number: 3,
      name: 'Pricing & Kalkulation',
      description: 'Preisstruktur festlegen und Kosten kalkulieren',
      estimatedDays: 5
    },
    {
      number: 4,
      name: 'Marketing Budget',
      description: 'Marketingstrategie und Budget planen',
      estimatedDays: 7
    },
    {
      number: 5,
      name: 'Supplier & Logistics',
      description: 'Lieferanten finden und Logistik einrichten',
      estimatedDays: 21
    },
    {
      number: 6,
      name: 'Launch Vorbereitung',
      description: 'Website, Payment, erste Kampagnen setup',
      estimatedDays: 40
    }
  ],
  tasks: [
    // Week 1: Market Research
    {
      title: 'Produktkategorie festlegen',
      description: 'Welches Produkt/welche Produktlinie wird verkauft?',
      priority: 'CRITICAL',
      estimatedDays: 2,
      category: 'RESEARCH'
    },
    {
      title: 'Competitor Analysis durchführen',
      description: 'Top 5 Konkurrenten analysieren (Preise, Marketing, USPs)',
      priority: 'HIGH',
      estimatedDays: 5,
      category: 'RESEARCH'
    },
    {
      title: 'Zielgruppe definieren',
      description: 'Buyer Personas erstellen (Alter, Budget, Pain Points)',
      priority: 'HIGH',
      estimatedDays: 7,
      category: 'RESEARCH'
    },

    // Week 2: Branding
    {
      title: 'Firmennamen finalisieren',
      description: 'Name checken (Domain, Trademark, Social Handles)',
      priority: 'CRITICAL',
      estimatedDays: 10,
      category: 'BRANDING'
    },
    {
      title: 'Logo & CI entwickeln',
      description: 'Logo, Farben, Fonts definieren (kann AI-generiert sein)',
      priority: 'HIGH',
      estimatedDays: 14,
      category: 'BRANDING'
    },
    {
      title: 'Brand Story schreiben',
      description: 'Mission, Vision, About-Text für Website',
      priority: 'MEDIUM',
      estimatedDays: 14,
      category: 'BRANDING'
    },

    // Week 3: Finance
    {
      title: 'Cost Breakdown erstellen',
      description: 'Alle Kosten auflisten (Product, Shipping, Marketing, Tools)',
      priority: 'CRITICAL',
      estimatedDays: 17,
      category: 'FINANCE'
    },
    {
      title: 'Pricing Strategy festlegen',
      description: 'Verkaufspreis kalkulieren (inkl. Margin, Taxes)',
      priority: 'CRITICAL',
      estimatedDays: 19,
      category: 'FINANCE'
    },
    {
      title: 'Marketing Budget planen',
      description: 'Wie viel Geld für Ads, Content, Influencer?',
      priority: 'HIGH',
      estimatedDays: 24,
      category: 'FINANCE'
    },

    // Week 4-6: Suppliers & Operations
    {
      title: 'Supplier Research',
      description: 'Mindestens 3 Lieferanten vergleichen (B2B Directory nutzen)',
      priority: 'CRITICAL',
      estimatedDays: 28,
      category: 'OPERATIONS'
    },
    {
      title: 'Samples bestellen',
      description: 'Produktmuster von Top 2 Suppliern testen',
      priority: 'HIGH',
      estimatedDays: 35,
      category: 'OPERATIONS'
    },
    {
      title: 'Fulfillment Setup',
      description: 'SmartStore Fulfillment oder eigenes Lager?',
      priority: 'HIGH',
      estimatedDays: 42,
      category: 'OPERATIONS'
    },

    // Week 7-12: Launch Prep
    {
      title: 'Website/Shop aufsetzen',
      description: 'Shopify/WooCommerce mit Payment-Integration',
      priority: 'CRITICAL',
      estimatedDays: 50,
      category: 'TECH'
    },
    {
      title: 'Produktfotos erstellen',
      description: 'Professional Product Photography (AI oder Fotograf)',
      priority: 'HIGH',
      estimatedDays: 56,
      category: 'CONTENT'
    },
    {
      title: 'Marketing Assets vorbereiten',
      description: 'Ad Creatives, Social Media Posts, Email Templates',
      priority: 'MEDIUM',
      estimatedDays: 63,
      category: 'MARKETING'
    },
    {
      title: 'Pre-Launch Marketing',
      description: 'Landing Page, Waitlist, erste Ads testen',
      priority: 'HIGH',
      estimatedDays: 70,
      category: 'MARKETING'
    },
    {
      title: 'First Inventory Order',
      description: 'Initiale Bestellung beim Supplier aufgeben',
      priority: 'CRITICAL',
      estimatedDays: 77,
      category: 'OPERATIONS'
    },
    {
      title: 'Launch!',
      description: 'Go-Live mit Kampagnen und erster Order',
      priority: 'CRITICAL',
      estimatedDays: 90,
      category: 'LAUNCH'
    }
  ]
};

// ============================================
// SAAS TEMPLATE
// ============================================

export const SAAS_TEMPLATE: VentureTemplateData = {
  type: 'SAAS',
  name: 'SaaS Venture',
  description: 'Software-as-a-Service Produkt',
  estimatedDuration: 120, // 4 months
  steps: [
    {
      number: 1,
      name: 'Problem & Solution',
      description: 'Pain Point identifizieren und Lösung skizzieren',
      estimatedDays: 7
    },
    {
      number: 2,
      name: 'Name & Branding',
      description: 'Produkt-Naming und Markenidentität',
      estimatedDays: 10
    },
    {
      number: 3,
      name: 'Pricing Model',
      description: 'Subscription-Tiers und Pricing festlegen',
      estimatedDays: 7
    },
    {
      number: 4,
      name: 'Marketing Plan',
      description: 'Go-to-Market Strategie definieren',
      estimatedDays: 10
    },
    {
      number: 5,
      name: 'MVP Development',
      description: 'Minimum Viable Product bauen',
      estimatedDays: 60
    },
    {
      number: 6,
      name: 'Beta & Launch',
      description: 'Beta-Testing und Public Launch',
      estimatedDays: 26
    }
  ],
  tasks: [
    {
      title: 'Problem validieren',
      description: 'Interviews mit potenziellen Kunden (min. 10)',
      priority: 'CRITICAL',
      estimatedDays: 5,
      category: 'RESEARCH'
    },
    {
      title: 'Feature-Set definieren',
      description: 'Core Features vs. Nice-to-Have priorisieren',
      priority: 'CRITICAL',
      estimatedDays: 10,
      category: 'PRODUCT'
    },
    {
      title: 'Tech Stack festlegen',
      description: 'Frontend, Backend, Database, Hosting wählen',
      priority: 'HIGH',
      estimatedDays: 14,
      category: 'TECH'
    },
    {
      title: 'Wireframes erstellen',
      description: 'UI/UX Mockups für Haupt-Flows',
      priority: 'HIGH',
      estimatedDays: 21,
      category: 'DESIGN'
    },
    {
      title: 'MVP Development Start',
      description: 'Backend + Frontend Grundgerüst',
      priority: 'CRITICAL',
      estimatedDays: 30,
      category: 'DEVELOPMENT'
    },
    {
      title: 'Beta User Recruiting',
      description: 'Mindestens 20 Beta-Tester finden',
      priority: 'HIGH',
      estimatedDays: 70,
      category: 'MARKETING'
    },
    {
      title: 'Beta Launch',
      description: 'Private Beta mit ausgewählten Usern',
      priority: 'CRITICAL',
      estimatedDays: 90,
      category: 'LAUNCH'
    },
    {
      title: 'Public Launch',
      description: 'ProductHunt, Social Media, Press',
      priority: 'CRITICAL',
      estimatedDays: 120,
      category: 'LAUNCH'
    }
  ]
};

// ============================================
// SERVICE TEMPLATE
// ============================================

export const SERVICE_TEMPLATE: VentureTemplateData = {
  type: 'SERVICE',
  name: 'Service Business',
  description: 'Dienstleistungs-Business (Agency, Consulting, etc.)',
  estimatedDuration: 60, // 2 months
  steps: [
    {
      number: 1,
      name: 'Service Definition',
      description: 'Welche Dienstleistung wird angeboten?',
      estimatedDays: 5
    },
    {
      number: 2,
      name: 'Name & Branding',
      description: 'Firmennamen und CI entwickeln',
      estimatedDays: 7
    },
    {
      number: 3,
      name: 'Pricing & Packages',
      description: 'Service-Pakete und Preise definieren',
      estimatedDays: 5
    },
    {
      number: 4,
      name: 'Marketing Strategy',
      description: 'Lead-Generation Strategie planen',
      estimatedDays: 7
    },
    {
      number: 5,
      name: 'Client Acquisition',
      description: 'Erste Kunden gewinnen',
      estimatedDays: 21
    },
    {
      number: 6,
      name: 'Delivery Setup',
      description: 'Prozesse und Tools für Service-Delivery',
      estimatedDays: 15
    }
  ],
  tasks: [
    {
      title: 'Service-Nische festlegen',
      description: 'Spezialisierung wählen (nicht zu breit)',
      priority: 'CRITICAL',
      estimatedDays: 3,
      category: 'STRATEGY'
    },
    {
      title: 'ICP definieren',
      description: 'Ideal Customer Profile (Branche, Größe, Budget)',
      priority: 'HIGH',
      estimatedDays: 7,
      category: 'STRATEGY'
    },
    {
      title: 'Service-Packages erstellen',
      description: 'Starter/Pro/Enterprise oder ähnlich',
      priority: 'CRITICAL',
      estimatedDays: 12,
      category: 'PRODUCT'
    },
    {
      title: 'Portfolio/Case Studies',
      description: 'Erste Referenzen sammeln (ggf. kostenlos)',
      priority: 'HIGH',
      estimatedDays: 30,
      category: 'MARKETING'
    },
    {
      title: 'Website + Booking System',
      description: 'Landing Page mit Calendly/Savvycal Integration',
      priority: 'HIGH',
      estimatedDays: 21,
      category: 'TECH'
    },
    {
      title: 'Outreach Campaign',
      description: 'LinkedIn/Email Outreach an ICPs',
      priority: 'CRITICAL',
      estimatedDays: 28,
      category: 'SALES'
    },
    {
      title: 'Erste 3 Kunden gewonnen',
      description: 'Bezahlte Projekte abschließen',
      priority: 'CRITICAL',
      estimatedDays: 60,
      category: 'SALES'
    }
  ]
};

// ============================================
// INFLUENCER TEMPLATE
// ============================================

export const INFLUENCER_TEMPLATE: VentureTemplateData = {
  type: 'INFLUENCER',
  name: 'Influencer Venture',
  description: 'Creator/Influencer Workflow (Content, Community, Monetization)',
  estimatedDuration: 75, // ~2.5 months
  steps: [
    {
      number: 1,
      name: 'Nische & Persona',
      description: 'Thema, Zielgruppe und Creator-Persona definieren',
      estimatedDays: 7
    },
    {
      number: 2,
      name: 'Brand & Setup',
      description: 'Branding, Handles, Profile & Positionierung',
      estimatedDays: 10
    },
    {
      number: 3,
      name: 'Content Engine',
      description: 'Content-Formate, Assets und Produktions-Workflow',
      estimatedDays: 14
    },
    {
      number: 4,
      name: 'Distribution',
      description: 'Plattform-Strategie und Wachstumshebel',
      estimatedDays: 14
    },
    {
      number: 5,
      name: 'Monetization',
      description: 'Brand-Deals, Affiliate, Produkte/Services',
      estimatedDays: 15
    },
    {
      number: 6,
      name: 'Launch & Partnerships',
      description: 'Erste Kampagnen, Kooperationen, PR',
      estimatedDays: 15
    }
  ],
  tasks: [
    {
      title: 'Nische + Angle festlegen',
      description: 'Klares Thema + Differenzierung definieren',
      priority: 'CRITICAL',
      estimatedDays: 3,
      category: 'STRATEGY'
    },
    {
      title: 'Creator-Identity & Tonalität',
      description: 'Visueller Stil, Voice, Werte & Story',
      priority: 'HIGH',
      estimatedDays: 10,
      category: 'BRANDING'
    },
    {
      title: 'Content-Formate definieren',
      description: '3–5 wiederholbare Formate inkl. Hooks',
      priority: 'CRITICAL',
      estimatedDays: 14,
      category: 'CONTENT'
    },
    {
      title: 'Content-Pipeline bauen',
      description: 'Templates, B‑Roll, Thumbnails, Batch‑Workflow',
      priority: 'HIGH',
      estimatedDays: 21,
      category: 'OPERATIONS'
    },
    {
      title: 'Plattform-Strategie',
      description: 'Primärplattform + 1–2 Support Channels',
      priority: 'HIGH',
      estimatedDays: 28,
      category: 'MARKETING'
    },
    {
      title: 'Monetization-Angebote definieren',
      description: 'Mediakit, Pricing, Affiliate, Produkte',
      priority: 'CRITICAL',
      estimatedDays: 45,
      category: 'SALES'
    },
    {
      title: 'Erste Brand‑Deals sichern',
      description: 'Outreach + Abschluss erster Partnerschaften',
      priority: 'CRITICAL',
      estimatedDays: 75,
      category: 'SALES'
    }
  ]
};

// ============================================
// OTHER TEMPLATE (Generic)
// ============================================

export const OTHER_TEMPLATE: VentureTemplateData = {
  type: 'OTHER',
  name: 'Custom Venture',
  description: 'Generischer Workflow für individuelle Venture-Typen',
  estimatedDuration: 60,
  steps: [
    {
      number: 1,
      name: 'Idee & Markt',
      description: 'Problem, Zielgruppe und Markt definieren',
      estimatedDays: 7
    },
    {
      number: 2,
      name: 'Brand & Offer',
      description: 'Name, Positionierung und Angebot schärfen',
      estimatedDays: 10
    },
    {
      number: 3,
      name: 'Pricing & Business Model',
      description: 'Monetarisierung und Preisstrategie',
      estimatedDays: 7
    },
    {
      number: 4,
      name: 'Go‑To‑Market',
      description: 'Marketing- und Sales‑Plan',
      estimatedDays: 10
    },
    {
      number: 5,
      name: 'Operations',
      description: 'Prozesse, Tools, Team/Partner',
      estimatedDays: 14
    },
    {
      number: 6,
      name: 'Launch',
      description: 'Launch, Feedback und Optimierung',
      estimatedDays: 12
    }
  ],
  tasks: [
    {
      title: 'Zielgruppe & Problem validieren',
      description: 'Problem‑Interview + Schnellvalidierung',
      priority: 'CRITICAL',
      estimatedDays: 7,
      category: 'RESEARCH'
    },
    {
      title: 'Value Proposition formulieren',
      description: '1‑Satz‑Pitch + Nutzenversprechen',
      priority: 'HIGH',
      estimatedDays: 12,
      category: 'BRANDING'
    },
    {
      title: 'Pricing‑Hypothese definieren',
      description: 'Preisanker + Zahlungsbereitschaft testen',
      priority: 'HIGH',
      estimatedDays: 18,
      category: 'FINANCE'
    },
    {
      title: 'Go‑To‑Market Plan',
      description: 'Kanäle, Content, Outreach, KPIs',
      priority: 'CRITICAL',
      estimatedDays: 28,
      category: 'MARKETING'
    },
    {
      title: 'Launch‑Checkliste',
      description: 'Assets, Tracking, Feedback‑Loop',
      priority: 'CRITICAL',
      estimatedDays: 60,
      category: 'LAUNCH'
    }
  ]
};

export const VENTURE_TEMPLATES = {
  ECOMMERCE: ECOMMERCE_TEMPLATE,
  SAAS: SAAS_TEMPLATE,
  SERVICE: SERVICE_TEMPLATE,
  INFLUENCER: INFLUENCER_TEMPLATE,
  OTHER: OTHER_TEMPLATE
};

export function getTemplateByType(type: string): VentureTemplateData | null {
  return VENTURE_TEMPLATES[type as keyof typeof VENTURE_TEMPLATES] || null;
}
