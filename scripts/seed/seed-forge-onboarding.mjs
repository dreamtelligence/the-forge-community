import fs from 'node:fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const envLocalPath = new URL('../.env.local', import.meta.url);
const envPath = new URL('../.env', import.meta.url);

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL missing. Define it in .env.local or .env before seeding.');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const course = {
  slug: 'forge-studio-onboarding',
  title: 'Forge Studio Guide: Texte, Bilder und Videos erstellen',
  summary:
    'Ausfuehrlicher Walkthrough vom ersten Venture bis zur fertigen Kampagne: Copywriter, Media Studio, Video-Chain und Best Practices.',
  category: 'Strategy',
  level: 'Operator Track',
  durationMins: 50,
};

const modules = [
  {
    order: 1,
    title: 'Orientierung: Was ist die Forge?',
    summary:
      'Ein klarer Ueberblick ueber Bereiche, Workflows und wo dein Output landet.',
    content: `## Die Forge in einem Satz
Die Forge ist euer Content- und Marketing-HQ: **Texte, Bilder, Videos** generieren, organisieren und direkt in Kampagnen ueberfuehren.

## Die wichtigsten Bereiche
- **Marketing Studio (Copywriter):** Texte fuer Instagram, LinkedIn, Ads, Mails und mehr.
- **Media Studio:** Bilder und Videos generieren, verwalten, teilen und weiterverarbeiten.
- **Chain Builder:** Mehrere Clips zu einem laengeren Video verbinden.
- **Kampagnen Manager:** Inhalte in Kampagnen strukturieren und spaeter verwerten.
- **Academy:** Playbooks und Trainings wie dieses hier.

## Mental Model
1. **Venture** anlegen
2. **Brand DNA** definieren
3. **Content generieren** (Text, Bild, Video)
4. **Kampagne fuettern** und Assets sauber organisieren

Wenn du diesen Ablauf verinnerlichst, findest du dich in Minuten zurecht.`,
  },
  {
    order: 2,
    title: 'Zum Forge kommen: Venture & Brand DNA',
    summary:
      'Ohne Venture keine Kampagne. Ohne Brand DNA keine konsistente Brand.',
    content: `## Schritt 1: Venture erstellen
Du brauchst ein Venture, weil alle Inhalte dort verankert werden.

**Pfad:**
- Hauptnavigation -> **Ventures**
- **Neues Venture** anlegen

## Schritt 2: Brand DNA definieren
Die Brand DNA steuert Stimme, Ton, Stil und verbotene Begriffe. Sie ist der wichtigste Hebel fuer konsistente Outputs.

**Pfad:**
- \`/forge/[ventureId]/brand\`

**Minimum-Setup (empfohlen):**
- Markenname
- Mission / Vision
- Tonfall & Writing Style
- Zielgruppe / Persona
- Do-Not-Mention Liste

## Warum das wichtig ist
Je sauberer deine Brand DNA, desto weniger Iterationen brauchst du fuer nutzbaren Output.`,
  },
  {
    order: 3,
    title: 'Copywriter: Texte generieren, die sofort nutzbar sind',
    summary:
      'Format waehlen, Thema setzen, generieren und sauber exportieren.',
    content: `## Einstieg
**Pfad:** \`/forge/[ventureId]/marketing\` -> Tab **Copywriter**

## Workflow (kurz)
1. **Format** waehlen (Instagram, LinkedIn, Blog, Ads, etc.)
2. **Thema** festlegen (klar, konkret)
3. **Details** geben (Zielgruppe, Tonalitaet, CTA, Laenge)
4. **Generieren** und iterieren

## Prompt-Blueprint (copy/paste)
- **Zielgruppe:** ...
- **Problem:** ...
- **Loesung/Angebot:** ...
- **Tonalitaet:** ...
- **CTA:** ...
- **Laenge:** ...

## Output-Qualitaet maximieren
- Gib **konkrete Zahlen** (Preis, Zeit, Ergebnis).
- Nutze **Worte, die deine Kunden sagen**.
- Frage nach **2-3 Varianten** und mixe die besten Zeilen.

## Export & Copy
- **Vorschau**: zeigt Fett/Listen sauber an.
- **Markdown**: ideal fuer Docs/Notion.
- **Klartext**: ideal fuer Plattformen, die kein Markdown können.

## Kampagne fuettern (optional)
Wenn du aus einer Kampagne heraus arbeitest, wird der Text direkt im Kampagnen-Board gespeichert.`,
  },
  {
    order: 4,
    title: 'Media Studio: Bilder & Videos generieren',
    summary:
      'Vom ersten Prompt bis zur sauberen Asset-Library.',
    content: `## Einstieg
**Pfad:** \`/forge/[ventureId]/marketing\` -> Tab **Media Studio**

## Generator-Workflow
1. **Modus waehlen** (Bild oder Video)
2. **Prompt schreiben** (Motiv, Stil, Licht, Kamera, Format)
3. **Generieren** und beste Version speichern

## Prompt-Struktur (Beispiel)
- **Motiv:** Produkt im Fokus, cleanes Set
- **Stil:** Premium, high-contrast, editorial
- **Licht:** weiches Studiolicht, leichte Highlights
- **Kamera:** 50mm, shallow depth of field
- **Format:** 9:16 fuer Reels

## Library nutzen
Alle generierten Assets landen in der Library:
- sortieren
- erneut nutzen
- in Kampagnen einbauen

## Kosten & Energie
Bild und Video verbrauchen Energy-Credits. Im Zweifel lieber zwei starke Prompts statt zehn schwache.`,
  },
  {
    order: 5,
    title: 'Chain Builder: Videos verbinden',
    summary:
      'Mehrere Clips zu einer Story schneiden, direkt in der Forge.',
    content: `## Wozu Chain Builder?
Du kannst bis zu **4 Clips** aus der Library zu einem durchgehenden Video verbinden. Perfekt fuer Storytelling oder Ads mit mehreren Szenen.

## Workflow
1. Media Studio -> **Chain Builder**
2. Mindestens **2 Videos** auswaehlen
3. **Video erstellen** (Stitch)

## Tipps
- Halte alle Clips im gleichen Format (z.B. 9:16).
- Verwende aehnliche Farbwelt fuer ein cleanes Ergebnis.`,
  },
  {
    order: 6,
    title: 'Kampagnen-Manager: Inhalte strukturiert organisieren',
    summary:
      'Texte und Assets in Kampagnen organisieren, damit nichts verloren geht.',
    content: `## Einstieg
**Pfad:** \`/forge/[ventureId]/marketing/campaigns\`

## Kampagne erstellen
1. **Neue Kampagne** anlegen
2. Ziele, Budget, Zeitraum definieren
3. Status setzen (Draft, Active, Paused, Completed)

## Content in Kampagnen speichern
Wenn du im Copywriter mit aktiver Kampagne arbeitest, werden Texte automatisch als Posts gespeichert.

## Vorteile
- Einheitlicher Kontext fuer Content-Iterationen
- Schnellere Team-Uebergabe
- Saubere Historie fuer Reporting und Wiederverwendung`,
  },
  {
    order: 7,
    title: 'Best Practices: schneller zu Top-Output',
    summary:
      'Fehler vermeiden, Iterationen reduzieren, Markenqualitaet sichern.',
    content: `## 1. Arbeite von konkret nach abstrakt
Schlecht: "Ein Post ueber Fitness"
Gut: "Instagram-Post fuer Maenner 25-35, die keine Zeit fuer Sport haben, CTA: 7-Tage-Plan"

## 2. Gib Kontra-Constraints
- **Was darf nicht passieren?**
- **Welche Begriffe vermeiden?**
- **Welche Claims sind tabu?**

## 3. Iteriere nur mit einem Hebel
Wenn du alles gleichzeitig aenderst, findest du nie die Ursache.

## 4. Nutzung im Team
Teile die besten Prompts und Ergebnisse als interne Standards.

## 5. Mini-Checkliste vor dem Veroeffentlichen
- Ist die CTA klar?
- Passt der Ton zur Brand DNA?
- Ist die Message in 3 Sekunden verstanden?`,
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

  console.log('Forge onboarding course seeded:', createdCourse.slug);
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
