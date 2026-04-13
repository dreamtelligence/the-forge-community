const copy = {
  header: {
    brand: 'Stake & Scale',
    nav: [
      { label: 'Start', href: '#hero' },
      { label: 'Studios', href: '#services' },
      { label: 'Inhalte', href: '#marketing' },
      { label: 'Preise', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
    cta: {
      login: 'Login',
      start: 'Jetzt starten',
    },
    languageToggle: {
      label: 'EN',
    },
  },
  hero: {
    lines: ['Starte und skaliere', 'dein Venture mit', 'AI-gestütztem Build', 'System für Brand,', 'Marketing, Sourcing & Legal.'],
  },
  b2b: {
    titleLines: ['Direkter Zugang', 'zu Großhändlern.'],
    body:
      'Für Solo Gründer, kleine oder große Teams. Samples, Orders und Lieferanten-Tracking in einem System – ohne Zwischenhändler und mit voller Marge für deine Brand.',
    cta: 'Zugang sichern',
  },
  services: {
    title: 'Services',
    count: '(16)',
    tabs: ['Briefing', 'Build', 'Launch', 'Scale', 'Shop'],
    helper: 'AI-gestützt, Squad-ready und direkt im Forge Workspace - inkl. WMS, Trend Radar, API Keys und BYOK.',
    items: [
      {
        id: '01',
        title: 'Squad Matching',
        description: 'Starte solo oder finde den passenden Co-Founder aus der Community.',
        tab: 'Briefing',
      },
      {
        id: '02',
        title: 'Venture Wizard',
        description: 'Idee, Modell, Ziele – der Wizard erstellt deinen Blueprint und die Phasen.',
        tab: 'Briefing',
      },
      {
        id: '03',
        title: 'Decision Hall',
        description: 'Transparente Abstimmungen für Roadmap, Budget und Meilensteine.',
        tab: 'Briefing',
      },
      {
        id: '04',
        title: 'Brand DNA Studio',
        description: 'Definiere Marke, Zielgruppe, Tonalität, USPs und Wettbewerber. Diese DNA steuert Prompts, Content und Vertragsentwürfe.',
        tab: 'Build',
      },
      {
        id: '05',
        title: 'Marketing Studio',
        description: 'Plane Kampagnen mit Ziel, Budget und Zeitraum. Generiere Posts, Ads und Newsletter und speichere sie direkt als Drafts pro Kampagne.',
        tab: 'Build',
      },
      {
        id: '06',
        title: 'Sourcing Studio',
        description: 'Finde Lieferanten per AI Discovery oder manuell, tracke Samples und steuere Purchase Orders. Inklusive WMS-Flow für Inbound, Bestand, Picking und Versand.',
        tab: 'Build',
      },
      {
        id: '07',
        title: 'Legal Studio',
        description: 'Erzeuge NDAs, Co-Founder-, Service- und Supplier-Verträge aus Vorlagen. Dokumente laufen durch Draft, Review, Sent und Signed.',
        tab: 'Build',
      },
      {
        id: '08',
        title: 'Campaigns & Content',
        description: 'Setze Kampagnen mit Ziel, Budget und Timeline auf und erzeuge passende Posts, Ads und Newsletter direkt als Drafts.',
        tab: 'Launch',
      },
      {
        id: '09',
        title: 'Media Generation',
        description: 'Erstelle Bild-, Video- und Voice-Assets in Avatar Studio, Veo 3.1 und Prompt-Tab; alles landet automatisch in deiner Library.',
        tab: 'Launch',
      },
      {
        id: '10',
        title: 'Export & Delivery',
        description: 'Exportiere Copy als Datei und nutze Media-Assets direkt für Shop, Social und Ads.',
        tab: 'Launch',
      },
      {
        id: '11',
        title: 'Venture Ops',
        description: 'Steuere Tasks, Status, Phasen, Budget und Alerts in einem Dashboard; Entscheidungen laufen transparent über die Decision Hall.',
        tab: 'Scale',
      },
      {
        id: '12',
        title: 'Integrationen',
        description: 'Verbinde Notion, Slack, DocuSign oder nutze API Keys für Zapier, Make, n8n und eigene Workflows.',
        tab: 'Scale',
      },
      {
        id: '13',
        title: 'Community & Knowledge',
        description: 'Nutze Forum, Threads, DMs und AI-Kommunikation für schnelles Feedback und geteiltes Team-Wissen.',
        tab: 'Scale',
      },
      {
        id: '16',
        title: 'Forge Academy',
        description: 'Praxis-Playbooks mit echten Beispielen, z. B. "Forge Studio Guide", "AI Venture Playbook 2026" und "Rechtlicher Leitfaden (DE/EU)".',
        tab: 'Scale',
      },
      {
        id: '14',
        title: 'Warehouse Management (WMS)',
        description: 'Steuere Inbound, Bestand, Lagerorte, Picking, Versand und Retouren; inklusive Reorder-Hinweisen und täglichem Ops-Digest.',
        tab: 'Scale',
      },
      {
        id: '15',
        title: 'Venture Shop',
        description: 'Beispiel-Shop ansehen und verstehen, wie Brand, Assets und Copy live wirken.',
        href: '/demo-shop',
        linkLabel: 'Shop öffnen',
        tab: 'Shop',
      },
    ],
  },
  marketing: {
    title: 'Marketing',
    description:
      'Erstelle in Minuten konsistente AI-Influencer & Brand Faces. Dank Multi-Image DNA bleiben Gesichter über alle Videos & Bilder hinweg gleich – perfekt für Storytelling, Kampagnen & Social Media. Du entscheidest pro Asset: selbst generieren oder vorhandenes Stock-Material (Bilder/Videos) aus Quellen deiner Wahl nutzen.',
    featuresLabel: 'Features:',
    features: ['Multi-Image DNA', 'Face Consistency', 'Virtual Influencer', 'Character Swap', 'Veo 3.1 & Kling', 'Flux Pro'],
    modelsNote: 'Du erhältst immer die besten verfügbaren AI Image-, Video- und Voiceover-Generatoren. Abrechnung: 49,00€/Monat Plattformzugang + nutzungsbasierte AI-Kosten (BYOK mit eigenem Replicate Key oder Credits über die Plattform). Zusätzlich: automatische Rechnungen, 10 Jahre Archivierung (GoBD) und CSV-Export für Steuerberater/Finanzamt.',
    trendingLabel: 'Trending:',
    trendingTags: ['#aiinfluencer', '#consistentcharacter', '#brandface', '#virtualmodel', '#storytelling'],
    cta: 'Assets generieren',
  },
  mission: {
    text:
      'Wir verbinden Founder, Brand und Execution zu einem klaren Build-System – strukturiert, schnell und messbar bis Launch und Scale.',
    cta: 'Jetzt starten',
  },
  categoryScroll: {
    header: 'B2B',
    footer: 'Kategorien',
  },
  practice: {
    title: 'Build System.',
    paragraph1:
      'Branding, Rechtliches, Marketing und Sourcing laufen im Forge an einem Faden zusammen. Du startest mit der Brand DNA und ziehst daraus Copy, Creatives und klare Kampagnen. Parallel entstehen NDAs, Verträge und sichere Prozesse - ohne Juristenchaos.',
    paragraph2:
      'Jeder Schritt speist den nächsten: Was du definierst, wird automatisch in Assets, Entscheidungen und Supply-Workflows gespiegelt. Ergebnis: schneller vom Konzept zum Launch und messbar in den Scale.',
    bullets: [
      'Brand DNA -> Voice, Styleguide, Assets',
      'Marketing -> Kampagnen, Ads, Social, Media',
      'Legal -> Vertraege, Checks, Compliance',
      'Sourcing -> Lieferanten, Samples, Orders',
    ],
    diagramTitle: 'vereine deine Tools im Build System',
    diagramButtons: { first: 'Forge OS', second: 'Build System' },
    diagramBadges: { first: 'BRAND', second: 'LEGAL', third: 'MKTG', fourth: 'SOURCE' },
  },
  testimonials: {
    label: 'Community',
    title: 'Founder Stories.',
    cta: 'Zugang sichern',
    marquee: 'JOIN — COMMUNITY',
    items: [
      {
        id: 1,
        quote:
          'Wir haben das Tool privat schon genutzt und nutzen es ständig fürs Brainstorming. Es bringt Struktur rein und spart uns richtig Zeit.',
        name: 'Lisa K.',
        title: 'Schuhbranche',
        avatar: '/images/realism_pose.jpg',
      },
      {
        id: 2,
        quote:
          'Wir arbeiten als Freunde zusammen und die Boards helfen uns, Ideen sauber zu sortieren. Brainstorming fühlt sich endlich fokussiert an.',
        name: 'Serkan A.',
        title: 'Home & Living',
        avatar: '/images/realism_male_model.jpg',
      },
      {
        id: 3,
        quote:
          'Wir haben es erst aus Neugier genutzt, aber die AI-Studios liefern wirklich brauchbaren Output für Copy und Ads.',
        name: 'Jule S.',
        title: 'Beauty-Branche',
        avatar: '/images/realism_b_w.jpg',
      },
      {
        id: 4,
        quote:
          'Wir nutzen es für unsere Launch-Planung: klare Schritte, klare Deliverables. Genau das hat uns vorher gefehlt.',
        name: 'David H.',
        title: 'Software-Branche',
        avatar: '/images/realistic_portraits_preview.jpg',
      },
      {
        id: 5,
        quote:
          'Wir testen gerade Supplier und Samples – alles in einem Flow. Für unser kleines Team ist das super praktisch.',
        name: 'Emre P.',
        title: 'Modebranche',
        avatar: '/images/paar.jpg',
      },
    ],
  },
  forgeFeatures: {
    title: 'Forge Features',
    tabs: ['Community', 'Tools', 'Services', 'Growth'],
    previewAlt: 'Feature Vorschau',
    content: {
      Community: [
        {
          id: '01',
          title: 'Squad System',
          description: 'Gemeinsam gründen: Co-Founder finden, Teams aufbauen und Rollen klar verteilen.',
          images: ['/images/project-1.jpg', '/images/project-2.jpg', '/images/project-3.jpg', '/images/project-4.jpg'],
        },
        {
          id: '02',
          title: 'Decision Hall',
          description: 'Transparente Abstimmungen für Roadmap, Budget und Meilensteine – wie in echten Squads.',
          images: ['/images/mission-1.jpg', '/images/mission-2.jpg', '/images/mission-3.jpg', '/images/hero-fashion.jpg'],
        },
        {
          id: '03',
          title: 'Squad Wallet',
          description: 'Budget-Tracking und Transaktionshistorie für maximale finanzielle Transparenz im Team.',
          images: ['/images/article-1.jpg', '/images/article-2.jpg', '/images/3ff7b622-be00-433d-b735-7e46c1763b80.jpg.avif', '/images/article-4.jpg'],
        },
        {
          id: '04',
          title: 'Forum & Knowledge',
          description: 'Community Hub mit Moderation, Threads, DMs und Best‑Practice‑Austausch.',
          images: ['/images/location-1.jpg', '/images/location-2.jpg', '/images/location-3.jpg', '/images/location-4.jpg'],
        },
      ],
      Tools: [
        {
          id: '01',
          title: 'Brand DNA Studio',
          description: 'Logo, Brand Voice, Werte, Guidelines und Assets – zentral, konsistent, KI‑gestützt.',
          images: ['/images/project-1.jpg', '/images/project-2.jpg', '/images/project-3.jpg', '/images/project-4.jpg'],
        },
        {
          id: '02',
          title: 'Marketing Studio',
          description: 'Campaigns, Content‑Kalender, AI Assets, Face‑Swap & Lip‑Sync Videos für Social Media.',
          images: ['/images/mission-1.jpg', '/images/mission-2.jpg', '/images/mission-3.jpg', '/images/hero-fashion.jpg'],
        },
        {
          id: '03',
          title: 'Sourcing Studio',
          description: 'Supplier‑Discovery, Sample‑Tracking und PO‑Management in einem Workflow.',
          images: ['/images/article-1.jpg', '/images/article-2.jpg', '/images/3ff7b622-be00-433d-b735-7e46c1763b80.jpg.avif', '/images/article-4.jpg'],
        },
        {
          id: '04',
          title: 'Legal Studio',
          description: 'NDAs, Co‑Founder Agreements und Vertrags‑Checks – rechtssicher und schnell.',
          images: ['/images/location-1.jpg', '/images/location-2.jpg', '/images/location-3.jpg', '/images/location-4.jpg'],
        },
      ],
      Services: [
        {
          id: '01',
          title: 'Forge AI Assistant',
          description: 'Kontext‑Aware KI‑Assistent in jedem Studio – Branding, Marketing, Legal & Sourcing.',
          images: ['/images/project-1.jpg', '/images/project-2.jpg', '/images/project-3.jpg', '/images/project-4.jpg'],
        },
        {
          id: '02',
          title: 'AI Communication',
          description: 'Zentrale Chat‑UI mit Bild‑ & PDF‑Analyse, Prompt‑Extraktion, smarter Zusammenfassung und sicheren Action-Bestätigungen.',
          images: ['/images/mission-1.jpg', '/images/mission-2.jpg', '/images/mission-3.jpg', '/images/hero-fashion.jpg'],
        },
        {
          id: '03',
          title: 'Notion Sync',
          description: 'Notion-, Slack- und DocuSign-Workflows live nutzbar – inkl. Export und Team-Flow.',
          images: ['/images/article-1.jpg', '/images/article-2.jpg', '/images/3ff7b622-be00-433d-b735-7e46c1763b80.jpg.avif', '/images/article-4.jpg'],
        },
        {
          id: '04',
          title: 'Music & Sounds',
          description: 'Soundstripe‑Integration für Songs & SFX direkt im Forge (Preview & Suche).',
          images: ['/images/location-1.jpg', '/images/location-2.jpg', '/images/location-3.jpg', '/images/location-4.jpg'],
        },
      ],
      Growth: [
        {
          id: '01',
          title: 'Venture Wizard',
          description: 'Geführter Setup‑Flow: Venture‑Typ, Ziele, Budget & Team in Minuten.',
          images: ['/images/project-1.jpg', '/images/project-2.jpg', '/images/project-3.jpg', '/images/project-4.jpg'],
        },
        {
          id: '02',
          title: 'Energy System',
          description: 'Credits‑System mit Free Start, Packs und transparentem Verbrauch.',
          images: ['/images/mission-1.jpg', '/images/mission-2.jpg', '/images/mission-3.jpg', '/images/hero-fashion.jpg'],
        },
        {
          id: '03',
          title: 'Founder Cockpit',
          description: 'KPIs, Fortschritt, Tasks, Trend Radar und Transparenz-Kennzahlen im zentralen Venture‑Dashboard.',
          images: ['/images/article-1.jpg', '/images/article-2.jpg', '/images/3ff7b622-be00-433d-b735-7e46c1763b80.jpg.avif', '/images/article-4.jpg'],
        },
        {
          id: '04',
          title: 'Scalable Infrastructure',
          description: 'Vercel + Postgres + Stripe + Blob – Multi‑Tenant Architektur mit Rollen, RLS, Limits und klaren Audit-Pfaden.',
          images: ['/images/location-1.jpg', '/images/location-2.jpg', '/images/location-3.jpg', '/images/location-4.jpg'],
        },
      ],
    },
  },
  pricing: {
    headline: 'Invest in Execution.',
    subheadline: '49,00€/Monat für Platform Access. AI-Usage wird transparent nach Verbrauch abgerechnet (BYOK oder Credits).',
    tabs: [
      { id: 'login', label: 'Login' },
      { id: 'membership', label: 'Membership' },
      { id: 'credits', label: 'Credits' },
      { id: 'transparency', label: 'Transparenz' },
    ],
    loginPlan: {
      name: 'Free Access',
      price: '0',
      period: '€',
      description: 'Teste den kompletten Plattform-Workflow mit vollem Kontext.',
      features: [
        'Venture Workspace mit Tasks, Roadmaps & Decisions',
        'Brand, Marketing, Sourcing & Legal – alles integriert',
        'Warehouse Management (WMS) für Bestand, Picking & Versand',
        'Orion KI‑Assistant mit Context & Aktionen',
        'Squads & Forum für echte Collaboration',
      ],
      cta: 'Kostenlos starten',
      href: '/login',
    },
    membershipPlan: {
      name: 'Platform Access',
      price: '49,00',
      period: '/monat',
      description: 'Die komplette Venture‑Plattform für Aufbau, Execution & Launch. AI-Kosten laufen nutzungsbasiert.',
      features: [
        'Venture Ops: Tasks, Steps, Roadmaps & Decisions',
        'Brand DNA, Content & Kampagnen‑Studio',
        'Legal Docs, Signaturen & Vertrags‑Flows',
        'Warehouse Management (WMS): Inbound, Bestand, Picking, Versand & Retouren',
        'Sourcing, Samples & Production Orders',
        'Integrationen: Notion, Slack, DocuSign',
        'AI‑Assistant „Orion" mit Action‑Flow',
        'BYOK: Eigener Replicate Key pro User möglich',
        'Alternativ Credits mit transparenter Usage-Abrechnung',
        'Monatlich kündbar',
      ],
      cta: 'Membership starten',
      href: '/pricing',
      badge: '',
    },
    creditPacks: [
      {
        id: 'credits_small',
        name: '100 Credits',
        price: '12,90',
        credits: 100,
        bestFor: 'Starter',
      },
      {
        id: 'credits_medium',
        name: '400 Credits',
        price: '49,99',
        credits: 400,
        originalPrice: '55,00',
        bestFor: 'Beliebt',
        popular: true,
      },
      {
        id: 'credits_large',
        name: '1000 Credits',
        price: '119,00',
        credits: 1000,
        originalPrice: '129,00',
        bestFor: 'Pro',
      },
    ],
    credits: {
      popular: 'Beliebt',
      oneTime: 'Einmalig',
      nanoBananaImages: 'Nano Banana Bilder',
      veoVideosWithAudio: 'Veo 3.1 Videos (5s, mit Audio)',
      veoVideosNoAudio: 'Veo 3.1 Videos (5s, ohne Audio)',
      buyCta: 'Credits kaufen',
      footer: '* Richtwerte auf Basis aktueller Modellpreise',
    },
    transparency: {
      headline: 'Transparente Usage-Kosten',
      subheadline: 'Pro Job siehst du vor dem Start: Basispreis, 10% Plattform-Fee und Endpreis in Credits.',
      items: [
        { label: 'Veo 3.1 (5s, mit Audio)', base: '20 Credits', fee: '+10%', total: '22 Credits' },
        { label: 'Veo 3.1 (5s, ohne Audio)', base: '10 Credits', fee: '+10%', total: '11 Credits' },
        { label: 'Nano Banana Bild', base: '4 Credits', fee: 'inkl.', total: '4 Credits' },
      ],
      bullets: [
        'Platform Access: 49,00€/Monat (separat zur Usage).',
        'Video-Kosten skalieren mit Dauer, Audio und Modell.',
        'Security by design: Rollenmodell, Tenant-Isolation (RLS) und Rate-Limits in kritischen Flows.',
        'Alle Preise können sich bei Provider-Updates ändern.',
      ],
    },
  },
  faq: {
    title: 'Häufige Fragen zu Ablauf, Tools und Ownership.',
    items: [
      {
        id: '01',
        question: 'Was ist STAKE & SCALE?',
        answer:
          'STAKE & SCALE ist ein Community Venture Studio, weil Solo-Gründer keine fünf verschiedenen Tools, keine Agentur und kein großes Team brauchen sollten, um ein Venture zu launchen. Du startest solo oder mit einem Squad (1–20 Personen) und arbeitest in The Forge mit Brand-, Marketing-, Sourcing- und Legal-Studios plus Venture-Ops. Alles in einem System, von der Idee bis zum Launch.',
      },
      {
        id: '02',
        question: 'Wie wird Geld im Squad verwaltet?',
        answer:
          'Jedes Squad verwaltet Budget und Einnahmen eigenständig. Ihr legt intern Regeln für Einzahlungen, Ausgaben und Gewinnverteilung fest; die Plattform stellt dafür die Infrastruktur bereit, mischt sich aber nicht in eure internen Abmachungen ein.',
      },
      {
        id: '03',
        question: 'Welche Ventures kann ich bauen?',
        answer:
          'E-Commerce, SaaS oder Service. Du verkaufst Produkte, baust eine App oder bietest Dienstleistungen an - der Venture-Wizard erkennt dein Modell und führt dich durch den passenden Blueprint. Forge3D wurde genau so gestartet.',
      },
      {
        id: '04',
        question: 'Welche Integrationen gibt es?',
        answer:
          'Live sind Notion-Export, Slack-Notifications, DocuSign-Workflows, Soundstripe und Stripe-Billing. Weitere Integrationen folgen community-gesteuert über das Roadmap-Voting.',
      },
      {
        id: '05',
        question: 'Wie veröffentliche ich meine Inhalte?',
        answer:
          'Du exportierst fertige Assets - Bilder, Videos, Copy, PDFs - und veröffentlichst sie selbst auf Shop, Social oder Ads. Kein Auto-Posting, volle Kontrolle.',
      },
      {
        id: '06',
        question: 'Gehören mir die Inhalte?',
        answer:
          'Ja, komplett. Du behältst alle Rechte. Wir verarbeiten deine Inhalte nur technisch, damit die Plattform funktioniert - Speicherung und Bereitstellung. Nicht mehr.',
      },
      {
        id: '07',
        question: 'Was kostet die Plattform?',
        answer:
          'Platform Access kostet 49,00EUR/Monat und ist monatlich kündbar. Was eine Agentur oft allein für ein Branding nimmt, kostet hier ein Monat Zugang zu allen Studios. AI-Nutzung wird separat nach echtem Verbrauch berechnet - über Credits oder deinen eigenen API-Key (BYOK).',
      },
      {
        id: '08',
        question: 'Funktioniert das wirklich oder ist es noch halb fertig?',
        answer:
          'Die Plattform ist produktiv im Einsatz. Forge3D - eine echte 3D-Druck Manufaktur - wurde komplett innerhalb von Stake & Scale entwickelt, von der Produktidee bis zur Finanzplanung. Das ist kein Demo-Projekt, sondern ein produktiver Referenzfall.',
      },
      {
        id: '09',
        question: 'Wie sind meine Daten geschützt?',
        answer:
          'Verschlüsselte Authentifizierung, rollenbasierte Zugriffe, Tenant-Isolation und nachvollziehbare Logs. Deine Daten sind von anderen Nutzern vollständig isoliert.',
      },
      {
        id: '10',
        question: 'Wie schnell kann ich starten?',
        answer:
          'In wenigen Minuten: Magic Link anfordern, Venture im Wizard anlegen, Blueprint starten und direkt in den Studios arbeiten.',
      },
      {
        id: '11',
        question: 'Was passiert mit meinen Daten bei Kündigung?',
        answer:
          'Deine Inhalte bleiben deine. Du kannst Assets exportieren; für Aufbewahrung, Archivierung und Löschung gelten die Datenschutz- und Vertragsbedingungen.',
      },
      {
        id: '12',
        question: 'Wie läuft die Zahlung?',
        answer:
          'Über Stripe. Platform Access monatlich, AI-Usage transparent nach Verbrauch. Credits gibt es als Einmalkauf - keine versteckten Kosten.',
      },
    ],
  },
  signup: {
    title: 'Werde Teil von The Forge',
    description: 'Gib deine E-Mail ein, um deinen kostenlosen Magic Link zu erhalten.',
    loginText: 'Einloggen',
    emailLabel: 'E-Mail-Adresse',
    emailPlaceholder: 'name@company.com',
    leftTitleLines: ['Starte jetzt kostenlos', 'dein erstes Venture.'],
    leftBody: 'Magic Link anfordern, Squad finden, Blueprint starten – und direkt in die Studios gehen.',
    leftBullets: [
      'KI‑Workflows für Brand, Marketing & Sourcing an einem Ort',
      'Venture‑Ops: Aufgaben, Roadmaps, Entscheidungen & Team‑Flow',
      '100% Eigentum, keine VCs',
      'Sicherheit im Betrieb: Zugriffskontrollen, Limits und transparente Prozesse',
    ],
    termsPrefix: 'Ich stimme den',
    termsLink: 'AGB zu',
    submit: 'Magic Link anfordern',
    successTitle: 'Link gesendet',
    successBody: 'Prüfe deinen Posteingang für den Zugriff.',
    errorTerms: 'Bitte akzeptiere die Nutzungsbedingungen.',
    errorSend: 'Fehler beim Senden des Magic Links.',
    errorSystem: 'Ein Systemfehler ist aufgetreten.',
  },
  footer: {
    backToTop: 'Nach oben',
    quickLinksLabel: 'Schnellzugriff',
    quickLinks: [
      { label: 'Start', href: '#hero' },
      { label: 'Studios', href: '#services' },
      { label: 'FAQ', href: '#faq' },
    ],
    legal: 'Rechtliches',
    legalLinks: [
      { label: 'Impressum', href: '/legal/impressum' },
      { label: 'Datenschutz', href: '/legal/datenschutz' },
      { label: 'AGB', href: '/legal/agb' },
    ],
    contact: 'Kontakt',
    social: 'Soziale Medien',
    payments: 'Zahlungsarten',
    rights: '© 2026 STAKE & SCALE. Alle Rechte vorbehalten.',
  },
  pricingPage: {
    title: 'Preise',
    subtitle: '49,00€/Monat Plattformzugang + nutzungsbasierte AI-Kosten',
    checkoutError: 'Fehler beim Checkout. Bitte nochmal versuchen.',
    checkoutUnauthorized: 'Bitte einloggen.',
  },
  login: {
    title: 'Founder-Login',
    subtitle: 'Melde dich per Magic Link an.',
    emailLabel: 'E-Mail-Adresse',
    emailPlaceholder: 'founder@stakeandscale.de',
    submitIdle: 'Magic Link anfordern',
    submitLoading: 'Übertrage...',
    orDivider: 'oder',
    googleCta: 'Mit Google fortfahren',
    googleLoading: 'Verbinde...',
    verifyTitle: 'Posteingang prüfen',
    verifyBody: 'Wir haben dir einen Magic Link an',
    verifyBodySuffix: 'gesendet. Klicke auf den Link in der E-Mail, um dich anzumelden.',
    spamHint: '(Prüfe auch deinen Spam-Ordner)',
    errorBot: 'Bitte bestätige, dass du kein Bot bist.',
    errorGeneric: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
    errorNetwork: 'Verbindungsfehler. Bitte prüfe deine Internetverbindung.',
    errorVerification:
      'Der Link ist abgelaufen oder wurde bereits genutzt. Bitte fordere einen neuen an.',
    applyPrompt: 'Noch kein Founder?',
    applyCta: 'Jetzt bewerben',
    securityNote: 'Verschlüsselte Authentifizierung',
    loadingFallback: 'Lade System...',
  },
  forumCta: {
    kicker: 'Forum',
    title: 'Werde Teil unserer Community',
    body: 'Du weißt nicht, wo du anfangen sollst? Komm ins Forum – wir helfen dir weiter.',
    cta: 'Zum Forum',
  },
};

export default copy;
