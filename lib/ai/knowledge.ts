/**
 * THE FORGE - Central Knowledge Base
 * This file contains the definitive information about the Forge system modules.
 * Inject this into AI system prompts to ensure consistent and accurate knowledge.
 */

export const FORGE_SYSTEM_KNOWLEDGE = {
  name: "THE FORGE - Community Venture Studio",
  philosophy: "Starte dein Buisness alleine oder mit einem Team. Volle Transparenz. Wir bündeln Kapital und Skills, während die Execution im Forge-Hub zentralisiert wird.",
  updated: "Feb 2026 (Billing v2 + Personal Studio)",

  navigation: {
    public: [
      "Landing / Home (Studios, Assets, Pricing, FAQ)",
      "Studio (/studio) - persönlicher Marketing/Media Einstieg",
      "Forum / Community",
      "Squads (Team-Matching)",
      "Ventures & Dashboard",
      "Media Gallery",
      "Resources / Updates",
      "Login / Settings / Profile",
      "AI Communication (Chat + Attachments)"
    ],
    forge: [
      "Forge Workspace: /forge/[ventureId]",
      "Brand Studio",
      "Legal Studio",
      "Marketing Studio",
      "Sourcing Studio",
      "Decision Hall",
      "Music & Sounds",
      "Admin Studio"
    ],
    marketing: [
      "Media Generator (Image/Video)",
      "Campaigns (Planung/Assets/Tracking)",
      "Face Swap",
      "Lip Sync",
      "Character DNA"
    ]
  },
  
  modules: [
    {
      id: "01",
      name: "Admin Shield",
      description: "Rechtssichere Verträge & Compliance",
      action: "AUTO-GENERIERUNG",
      status: "ACTIVE",
      details: "Automatische Erstellung von NDAs, Service Agreements und Gründerverträgen. Spart bis zu 90% der Anwaltskosten."
    },
    {
      id: "02",
      name: "Market Radar",
      description: "Konkurrenz-Analyse & Ad-Scanning",
      action: "24/7 WATCHTOWER",
      status: "SCANNING",
      details: "Überwacht Wettbewerber, scannt Werbeanzeigen und erkennt Trends in Echtzeit, um den Product-Market-Fit zu sichern."
    },
    {
      id: "03",
      name: "Supply Chain Command",
      description: "Manufaktur-Netzwerk & Sourcing",
      action: "GLOBAL ACCESS",
      status: "CONNECTED",
      details: "Direkter Zugriff auf ein globales Netzwerk von geprüften Lieferanten. Management von Mustern (Samples) und Produktionsaufträgen."
    },
    {
      id: "04",
      name: "Commerce Engine",
      description: "Shop-Deployment & Infrastructure",
      action: "VERCEL/STRIPE",
      status: "READY",
      details: "Zentralisiertes Tech-Setup mit Vercel für Hosting und Stripe für Zahlungsabwicklung. Schnelles Deployment von E-Commerce Brands."
    },
    {
      id: "05",
      name: "Logistics Grid",
      description: "Fulfillment & Lager-Buchung",
      action: "PAY-PER-USE",
      status: "STANDBY",
      details: "Anbindung an 3PL-Provider für Lagerung und Versand. Skalierbare Logistik ohne Fixkosten."
    }
  ],

  studios: [
    {
      name: "Brand Studio",
      summary: "Brand DNA, Voice, Werte, Look & Feel, Guidelines, Assets."
    },
    {
      name: "Legal Studio",
      summary: "Verträge, NDAs, Checks, Compliance, Vorlagen."
    },
    {
      name: "Marketing Studio",
      summary: "AI Content, Kampagnen, Media Generator, Face/Lip/Character Tools."
    },
    {
      name: "Sourcing Studio",
      summary: "Lieferanten, Samples, Orders, Supplier-Tracking, AI Discovery."
    },
    {
      name: "Decision Hall",
      summary: "Voting & Entscheidungen im Squad."
    },
    {
      name: "Music & Sounds",
      summary: "Lizenzierte Musik & SFX (Soundstripe), Suche + Preview."
    },
    {
      name: "Admin Studio",
      summary: "Venture-Admin, Mitglieder, Rechte, Settings."
    }
  ],

  aiCapabilities: [
    "Context-Aware AI Assistant (Sidebar + Communication)",
    "Bildanalyse (Prompt aus Bild)",
    "PDF Zusammenfassung",
    "AI Sourcing Matching (DB-first)",
    "Marketing Media Generation (Video/Image)",
    "3D Camera Prompt Workbench mit model-optimierten Copy-Ready Prompts",
    "Prompt Routing für Veo 3.1 / Kling 4.0 / Kling 2.6 / Sora 2"
  ],

  mediaModels: [
    "Veo 3.1 (Text/Image → Video, Audio optional)",
    "Kling 4.0 (Video bis 30s, bis 1080p)",
    "Kling 2.6 Pro (Video + Audio)",
    "Sora 2 (Video)",
    "Luma Ray 3.2 (Video)",
    "MiniMax H3 (Video)",
    "Flux 3 (Bild)",
    "Nano Banana 2.1 / Nano Banana Pro (Multi-Image I2I)"
  ],

  credits: {
    system: "Energy System (AI Credits) mit Reserve/Settle/Refund Pattern + Billing v2 Usage-Breakdown (Provider Cost, Platform Fee, Total)",
    starter: "Neue User starten mit 50 Credits (Freemium)."
  },

  integrations: [
    "Notion Sync (Brand DNA & Roadmap)",
    "Stripe (Subscriptions + Credits)",
    "Vercel (Hosting)",
    "Soundstripe (Music & SFX)"
  ],

  legalStructure: {
    model: "Slicing Pie (Fair Equity)",
    explanation: "Anteile werden basierend auf dem realen Beitrag (Zeit, Kapital, Know-how) verteilt, um maximale Fairness zu garantieren."
  },

  membershipTiers: [
    { name: "Platform Access", price: "49,00 EUR / Monat", focus: "Zugang zur Plattform & Studios" },
    { name: "Credits", price: "Usage-basiert", focus: "AI-Features via Credit Top-ups / passthrough" },
    { name: "Enterprise", price: "Auf Anfrage", focus: "White-Label & Custom Integrationen" }
  ]
};

/**
 * Helper to format the knowledge for an AI system prompt
 */
export function getForgePromptContext() {
  const modulesStr = FORGE_SYSTEM_KNOWLEDGE.modules
    .map(m => `#${m.id} ${m.name}: ${m.description} (${m.details}) - Status: ${m.status}`)
    .join('\n');

  return `
WISSENSBASIS "THE FORGE":
${FORGE_SYSTEM_KNOWLEDGE.philosophy}
Aktueller Stand: ${FORGE_SYSTEM_KNOWLEDGE.updated}

CORE MODULES (SYSTEM_MODULES.CONFIG):
${modulesStr}

NAVIGATION (MENÜS):
- Public: ${FORGE_SYSTEM_KNOWLEDGE.navigation.public.join(' • ')}
- Forge: ${FORGE_SYSTEM_KNOWLEDGE.navigation.forge.join(' • ')}
- Marketing: ${FORGE_SYSTEM_KNOWLEDGE.navigation.marketing.join(' • ')}

STUDIOS & WORKFLOWS:
${FORGE_SYSTEM_KNOWLEDGE.studios.map(s => `- ${s.name}: ${s.summary}`).join('\n')}

AI CAPABILITIES:
${FORGE_SYSTEM_KNOWLEDGE.aiCapabilities.map(item => `- ${item}`).join('\n')}

MEDIA MODELS:
${FORGE_SYSTEM_KNOWLEDGE.mediaModels.map(item => `- ${item}`).join('\n')}

ENERGY / CREDITS:
${FORGE_SYSTEM_KNOWLEDGE.credits.system}
Starter: ${FORGE_SYSTEM_KNOWLEDGE.credits.starter}

INTEGRATIONS:
${FORGE_SYSTEM_KNOWLEDGE.integrations.map(item => `- ${item}`).join('\n')}

RECHTLICHE STRUKTUR:
${FORGE_SYSTEM_KNOWLEDGE.legalStructure.model}: ${FORGE_SYSTEM_KNOWLEDGE.legalStructure.explanation}

MITGLIEDSCHAFTEN:
${FORGE_SYSTEM_KNOWLEDGE.membershipTiers.map(t => `- ${t.name}: ${t.price} (${t.focus})`).join('\n')}

OPERATIVE HINWEISE:
- Personal Studio wird systemseitig über isPersonalStudio-Flag geführt (nicht über Description-Marker als Primärlogik).
- Landing CTA für Signup verweist auf #start.
- Billing-Kommunikation immer transparent: Subscription getrennt von Usage.
`;
}
