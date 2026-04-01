export const knowledgeBase = {
  brand: {
    name: 'STAKE & SCALE',
    tagline: 'Community Venture Studio',
    positioning: 'Premium, ruhig, editorial, fokussiert auf Ownership und Skalierung.',
  },
  model: {
    description:
      'STAKE & SCALE verbindet Gruppen von 5 bis maximal 25 gleichberechtigten Foundern, die gemeinsam profitable Projekte auf einer zentralen Infrastruktur bauen.',
    groupSizes: {
      small: '5 Founder für MVPs',
      medium: '25 Founder für Scale-ups',
      large: 'Maximal 25 Founder pro Gruppe',
    },
    philosophy:
      'Mehrere Gruppen. Ein Projekt pro Gruppe. Eine Plattform für alle. Demokratisch gewählt, gemeinschaftlich entwickelt, fair verteilt.',
    ownership:
      'Jeder investiert gleich viel innerhalb der Gruppe und erhält gleiche Rechte (Anteil = 1 ÷ Mitgliederzahl).',
    scalability:
      'Unbegrenzt skalierbar durch parallele Gruppen in den Bereichen E-Commerce, SaaS und Services (Portfolio-Effekt).',
    managedServices: {
      role: 'STAKE & SCALE agiert als operativer Enabler und System-Architekt.',
      automation: 'Einsatz von KI und High-End Automatisierungen für Operations, Bestellung und Verwaltung.',
      setup: 'Professionelles Setup der gesamten Infrastruktur durch Özgür Azap.',
      fee: 'Für die Starthilfe, Organisation und den laufenden Betrieb wird eine Service-Provision erhoben.',
      benefit:
        'Founder können partizipieren, ohne tiefes technisches Fachwissen zu besitzen – das System arbeitet für die Gruppe.',
    },
  },
  pricing: {
    monthlyMembership: '49,00 EUR pro Monat (Platform Access)',
    entryOptions: [
      'Usage-basiertes Credit-System für AI-Features (Provider Cost passthrough)',
      'Credit Top-ups via Stripe (One-time Käufe)',
      'Optionale Plattform-Fee auf Usage je nach Tarif/Modus',
    ],
    serviceProvision:
      'Abrechnung transparent: Subscription + nutzungsbasierte AI-Kosten mit separater Aufschlüsselung.',
  },
  governance: {
    ownership:
      'Die Plattform STAKE & SCALE wird als Einzelunternehmen durch Özgür Azap zentral betrieben.',
    authority:
      'Operative Entscheidungen, Aufnahme und Ausschluss von Mitgliedern liegen bei der Plattformleitung.',
    conduct:
      'Mitgliedschaft setzt respektvolles Verhalten und Einhaltung der Regeln voraus.',
  },
  onboarding: {
    steps: [
      'Bewerbung: Formular ausfüllen und Motivation teilen.',
      'Review: Prüfung der Bewerbung innerhalb von 48 Stunden.',
      'Investment: Beitrag je Founder richtet sich nach Zielkapital und Gruppengröße.',
      'Build: Als gleichberechtigter Founder abstimmen, diskutieren und mitbauen.',
    ],
  },
  platform: {
    description: 'Eine professionelle, skalierbare Infrastruktur für alle Gruppen.',
    features: [
      'Projekt-Voting: Demokratische Abstimmung über neue Projekte (1 Stimme pro Founder).',
      'Community-Forum: Kategorisierter Austausch für Ideen und Strategien.',
      'Finanz-Transparenz: Live-Tracking aller Einnahmen, Ausgaben und des Kapital-Progress.',
      'Task-Management: Klare Verteilung von Aufgaben, Status-Tracking und Deadlines.',
      'Events & Termine: Zentraler Ort für Founder Calls und Launch-Dates.',
      'Dokumente & Verträge: Zentrale Ablage für Guides und rechtliche Unterlagen.',
    ],
  },
  firstProject: {
    id: 'Gruppe #1',
    name: 'SmartStore Fulfillment Hub',
    status: 'Voting läuft',
    problem:
      'Kleine Brands haben keinen Zugang zu Profi-Fulfillment (Mindestmengen zu hoch oder Anbieter unprofessionell).',
    solution:
      'Community-getriebener 3PL Micro-Fulfillment Service mit WMS, Pick-by-Scan und transparentem Pricing.',
    targetCustomers: 'E-Commerce Brands mit 100-1.000 Orders/Monat.',
    targets: [
      '10 Kunden innerhalb von 6 Monaten',
      '1.200+ Orders pro Monat geplant',
      'Startkapital je nach Gruppenziel: 25k / 50k / 100k',
    ],
  },
  transparency: {
    access: 'Radikale Transparenz: Jede Transaktion ist öffentlich einsehbar.',
    pages: ['/transparency', '/forum'],
  },
  legal: {
    operator: 'Özgür Azap',
    business: 'Einzelunternehmen Özgür Azap',
    address: 'Wittbräuckerstraße 109, 44287 Dortmund, Deutschland',
    email: 'info@stakeandscale.de',
    vatId: 'DE456989341',
    jurisdiction: 'Dortmund',
  },
  links: {
    dashboard: '/forum',
    transparency: '/transparency',
    forum: '/forum',
    start: '#start',
    studio: '/studio',
    legal: ['/legal/impressum', '/legal/datenschutz', '/legal/agb'],
  },
} as const;

const formatList = (items: readonly string[]) => items.map((item) => `- ${item}`).join('\n');
const formatMap = (items: Record<string, string>) =>
  Object.values(items)
    .map((item) => `- ${item}`)
    .join('\n');

export const knowledgeBasePrompt = [
  'Du bist Orion, der AI-Concierge von STAKE & SCALE.',
  'Antworte kurz, klar und premium (maximal 5 Sätze).',
  'Nutze nur die Fakten aus der Wissensbasis.',
  'Wenn etwas nicht bekannt ist, sage das offen und biete an, die Infos intern zu klaeren.',
  'Gib keine rechtliche oder steuerliche Beratung.',
  '',
  'Wissensbasis:',
  `- Brand: ${knowledgeBase.brand.name}, ${knowledgeBase.brand.tagline}.`,
  `- Positionierung: ${knowledgeBase.brand.positioning}`,
  `- Modell: ${knowledgeBase.model.description}`,
  '- Gruppengrößen:',
  formatMap(knowledgeBase.model.groupSizes),
  `- Philosophie: ${knowledgeBase.model.philosophy}`,
  `- Ownership: ${knowledgeBase.model.ownership}`,
  `- Skalierung: ${knowledgeBase.model.scalability}`,
  '- Managed Services:',
  formatMap(knowledgeBase.model.managedServices),
  '- Pricing:',
  `- ${knowledgeBase.pricing.monthlyMembership}`,
  formatList(knowledgeBase.pricing.entryOptions),
  `- ${knowledgeBase.pricing.serviceProvision}`,
  '- Governance:',
  `- ${knowledgeBase.governance.ownership}`,
  `- ${knowledgeBase.governance.authority}`,
  `- ${knowledgeBase.governance.conduct}`,
  '- Onboarding:',
  formatList(knowledgeBase.onboarding.steps),
  `- Plattform: ${knowledgeBase.platform.description}`,
  '- Plattform:',
  formatList(knowledgeBase.platform.features),
  `- Erstes Projekt: ${knowledgeBase.firstProject.id} - ${knowledgeBase.firstProject.name}`,
  `- Projekt-Status: ${knowledgeBase.firstProject.status}`,
  `- Problem: ${knowledgeBase.firstProject.problem}`,
  `- Lösung: ${knowledgeBase.firstProject.solution}`,
  `- Zielkunden: ${knowledgeBase.firstProject.targetCustomers}`,
  '- Projekt-Ziele:',
  formatList(knowledgeBase.firstProject.targets),
  `- Transparenz: ${knowledgeBase.transparency.access}`,
  `- Relevante Seiten: ${knowledgeBase.links.dashboard}, ${knowledgeBase.links.transparency}, ${knowledgeBase.links.forum}`,
  `- Start: ${knowledgeBase.links.start} · Studio: ${knowledgeBase.links.studio}`,
  `- Legal: ${knowledgeBase.legal.operator}, ${knowledgeBase.legal.business}, ${knowledgeBase.legal.address}, ${knowledgeBase.legal.email}, USt-ID ${knowledgeBase.legal.vatId}, Gerichtsstand ${knowledgeBase.legal.jurisdiction}.`,
].join('\n');
