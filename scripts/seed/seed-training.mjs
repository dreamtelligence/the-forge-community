import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const course = {
  slug: 'ai-venture-playbook-2026',
  title: 'AI Venture Playbook 2026',
  summary:
    'Pre-Selling, Marktwahl, Margin-Modelle und Distribution in einem klaren Founder-Track. Basierend auf den Gemini-Notizen aus Dan Martell, TikTok-2026 Trends und den AI-Income Buckets.',
  category: 'Go-To-Market',
  level: 'Founder Track',
  durationMins: 90,
};

const modules = [
  {
    order: 1,
    title: 'Pre-Selling statt Produkt-Roulette',
    summary:
      'Baue erst dann, wenn ein echtes Ja am Markt existiert. Pre-Sell reduziert Risiko und beschleunigt Time-to-Value.',
    content: `## Kernidee
Du verkaufst **vor** dem Bauen. Nicht, weil du bluffst, sondern weil du klare Probleme validierst und ein sauberes Angebot testest.

## Vorgehen (kompakt)
- Finde 10 potenzielle Kunden und frage nach **Beratung**, nicht nach Geld.
- Leitfrage: **"Was ist in deinem Business so schwer/teuer, dass du es sofort mit AI automatisieren würdest?"**
- Aus der Antwort formst du ein klares Ergebnis-Angebot.
- Preisregel: 12-Monats-Preis -50% gegen **Case Study + Name als Proof**.

## Time-to-Value
Der Deal ist nur der Start. Plane den Weg:
1. Zahlung -> 2. erstes Ergebnis -> 3. messbarer Nutzen.

## Output dieses Moduls
- 1 Interview-Skript
- 1 Ergebnis-Angebot (Outcome statt Feature)
- 1 Pilot-Plan (14-30 Tage)`,
  },
  {
    order: 2,
    title: 'Boring Markets & echte Schmerzen',
    summary:
      'Boring Markets schlagen Hype. Du suchst Stabilität, hohe Deal-Size und manuelle Prozesse.',
    content: `## Warum "boring" gewinnt
Hype-Märkte sind laut, aber instabil. "Boring" bedeutet:
- Langfristige Nachfrage
- weniger Wettbewerb
- höhere Margen

## Praktische Auswahl
- Frage AI: **"Nenne 20 boring Industrien mit hoher Deal-Size und manuellen Prozessen."**
- Suche **einen** klaren Pain (z.B. verpasste Anrufe, manuelle Nachbearbeitung).

## Nutzen in Benefits übersetzen
Ein Pain = ein Outcome. Beispiel:
- Pain: verpasste Anrufe
- Benefit: **"10 neue Kunden/Woche ohne ein Telefon anzufassen"**

## Output dieses Moduls
- 1 Markt
- 1 Schmerz
- 1 messbares Ergebnis`,
  },
  {
    order: 3,
    title: 'Margin-Modelle & Produktisierung',
    summary:
      'AI verschiebt die Kostenkurve. Du willst hohe Margen und eine klare Produktisierungs-Route.',
    content: `## Margin-Logik (vereinfacht)
Gewinn = Preis - Kosten. AI senkt die Delivery-Kosten drastisch.

## Modell-Stack (aus dem File)
- AI Services: ~70% Margin
- AI Consulting: ~80%
- AI Digital Products: ~90%
- AI Software: ~95%

## Strategie
Starte mit Services/Consulting, dokumentiere den Workflow und **produktisiere** ihn in Software.
So kommst du von "Zeit gegen Geld" zu **Skalierung ohne Burnout**.

## Output dieses Moduls
- 1 Modell-Entscheidung
- 1 Produktisierungspfad (Service -> Software)`,
  },
  {
    order: 4,
    title: 'Cashflow-Offer, das nicht dicht macht',
    summary:
      'Wenn das Angebot falsch gepackt ist, stirbt das Business am Cashflow - nicht am Markt.',
    content: `## Outcome verkaufen, nicht Stunden
- Ein Outcome = ein Satz
- Kein Feature-Bla: **Ergebnis in Zeit X**

## Cashflow-Mechanik
- **Upfront** zahlen lassen (z.B. 6 Monate mit Discount)
- So sinkt Churn und du investierst aus eigener Power, nicht fremdem Kredit.

## Scarcity + Objection-Killer
- Begrenzte Plätze (echte Kapazität)
- Bonus, der die größte Angst klärt (z.B. Team-Onboarding)

## Output dieses Moduls
- 1 Angebots-Satz
- 1 Upfront-Preis-Option
- 1 Bonus gegen die Top-Einrede`,
  },
  {
    order: 5,
    title: 'MVP bauen und Delivery automatisieren',
    summary:
      'MVP muss liefern, nicht glänzen. Danach automatisierst du den gesamten Delivery-Funnel.',
    content: `## MVP-Optionen (aus dem File)
1. **No-Code** (Zapier, Make, GoHighLevel, Lovable)
2. **AI-Assisted Coding** (Cursor, Replit)
3. **AI-Dev** (erst Mini-Testprojekt!)

## Delivery-System (4 Schritte)
1. Purchase (Stripe)
2. Access (Zugang/Community/Software)
3. Onboarding (Automatisierter Start)
4. Support (skalierbar)

## Output dieses Moduls
- 1 MVP-Plan mit Tool-Stack
- 1 Delivery-Flow (4 Schritte)`,
  },
  {
    order: 6,
    title: 'Long-Term Greedy & die 3 S',
    summary:
      'Kurzfristige Gier killt langfristigen Wert. Die 3 S bringen Substanz.',
    content: `## Long-Term Greedy
Du optimierst für 50 Jahre, nicht für 50 Tage.

## Die 3 S der Skalierung
1. **Sell** - erster stabiler Umsatz
2. **Scale** - Systeme, Team, bessere Angebote
3. **Stack** - weitere Produkte auf den Cashflow stapeln

## Output dieses Moduls
- 1 Jahresfokus (Sell/Scale/Stack)
- 1 Systemisierungsliste`,
  },
  {
    order: 7,
    title: 'Distribution 2026: Reali-TEA & Build in Public',
    summary:
      'TikTok 2026 belohnt radikale Echtheit. Du verkaufst nicht nur Software, sondern den Prozess.',
    content: `## Reali-TEA (Trend 2026)
- Keine Hochglanz-Ästhetik
- Fehler und Chaos sind **Proof of Work**
- Screen + Handheld statt sterile Screen-Recording

## Curiosity Detours
Hooks müssen Wissenslücken öffnen:
Schlecht: "Neues Tool!"
Gut: "Ich habe die 4-Sekunden-Antwort gebaut, die Dan Martell meint."

## Build in Public
Hook-Typen mit hohem ROI:
- **F* Up** (Fehler zeigen)
- **Revenue-Striptease** (Zahlen offenlegen)
- **Feature-Leak**
- **Industry Beef**

## Output dieses Moduls
- 3 Hook-Ideen
- 1 Build-in-Public Content-Format`,
  },
  {
    order: 8,
    title: 'Hook-Skripte, Funnel & Community',
    summary:
      'Der Content braucht einen Funnel: Hook -> Demo -> CTA. Danach Community als Engine.',
    content: `## Hook-Architektur (aus dem Bericht)
1. **Martell Hack**: Autorität + Demo + CTA
2. **Trauma/Fail**: Schmerz zeigen, dann Wendepunkt
3. **Mathematische Logik**: simple Rechnung + Automation
4. **Geheimer Code**: exklusive Struktur statt Output

## Funnel
Hook -> Demo im Gemini-Window -> CTA (Kommentar für Warteliste).
Automatisiere DMs (ManyChat o.a.), sonst brichst du unter Nachfrage zusammen.

## Community-Mechanik
Nutze "Belief Collector":
Frag die Community nach Annahmen, die dein System testen soll.

## Output dieses Moduls
- 1 Hook-Skript
- 1 CTA-Mechanik
- 1 Community-Prompt`,
  },
  {
    order: 9,
    title: 'Opportunity Buckets & Fokus',
    summary:
      'Die falsche Idee kostet Zeit. Filtere hart, wähle einen Bucket und bleib drin.',
    content: `## Trash-Filter (sofort aussortieren)
- AI ersetzt es bereits?
- Industrie schrumpft?
- Mehr Risiko als Upside?

## Buckets (aus dem File)
**Easy (5-10k/Monat):**
Short-Form Editing, Social Copy, AI Chatbots, AI Receptionist, UGC, Virtual Assistant.

**Medium (10-50k/Monat):**
Automation Agencies, LinkedIn Growth, Micro-SaaS, AI Content Agency, Motion Graphics.

**Hard (1M+/Monat):**
AI Software Products, Buying boring businesses + AI, Personal Brand + Commerce, Subscription Communities, Playbook Licensing.

## Fokus-Regel
Commit auf einen Track (1.000 Tage). Shiny-Object-Syndrom killt mehr Companies als der Markt.

## Output dieses Moduls
- 1 Bucket-Entscheidung
- 1 Fokus-Regel für 12 Monate`,
  },
];

async function run() {
  const createdCourse = await prisma.trainingCourse.upsert({
    where: { slug: course.slug },
    update: {
      title: course.title,
      summary: course.summary,
      category: course.category,
      level: course.level,
      coverImage: course.coverImage,
      durationMins: course.durationMins,
    },
    create: course,
  });

  for (const trainingModule of modules) {
    await prisma.trainingModule.upsert({
      where: {
        courseId_order: {
          courseId: createdCourse.id,
          order: trainingModule.order,
        },
      },
      update: {
        title: trainingModule.title,
        summary: trainingModule.summary,
        content: trainingModule.content,
      },
      create: {
        courseId: createdCourse.id,
        order: trainingModule.order,
        title: trainingModule.title,
        summary: trainingModule.summary,
        content: trainingModule.content,
      },
    });
  }

  console.log('Training seeded:', createdCourse.slug);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
