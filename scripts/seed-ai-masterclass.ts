import fs from 'node:fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL missing. Define it in .env.local or .env before seeding.');
}

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const courseSlug = 'ki-masterclass-2025';

  // 1. Kurs anlegen oder updaten
  const course = await prisma.trainingCourse.upsert({
    where: { slug: courseSlug },
    update: {},
    create: {
      slug: courseSlug,
      title: 'KI-Masterclass 2025: Vom Anwender zum Strategen',
      summary: 'Lerne abseits vom Hype, wie du KI wirklich im Business einsetzt. Von Prompt Engineering bis zu autonomen Agenten.',
      category: 'KI & AUTOMATION',
      level: 'BEGINNER',
      durationMins: 45,
      coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
    },
  });

  console.log(`Course created: ${course.title}`);

  const modules = [
    {
      order: 1,
      title: 'Schritt 1: Kontext, Hype und Rolle',
      summary: 'Warum jetzt der beste Zeitpunkt ist, welche Fallen dich bremsen und wie du deine Rolle definierst.',
      content: `
## Einstieg: Nur Laptop + klare Schritte
Alles, was du brauchst, ist dein Laptop und eine klare Roadmap. Ich bin selbst KI-Unternehmer, habe ein Team von 30 Mitarbeitern und habe über 1500 Unternehmen bei der KI-Implementierung begleitet. Es hat mich über drei Jahre gekostet, dieses Wissen aufzubauen - deshalb bekommst du hier die Abkürzung.

## Ziel dieser Masterclass
Mein Ziel: Du weißt abseits vom Hype mehr über KI als 99% deines Umfelds und kannst die Skills praktisch einsetzen.

## Warum jetzt?
Der KI-Markt wächst rasant und soll bis 2030 auf rund **2 Billionen USD** anwachsen. Wir sind noch früh in der Revolution - Modelle wie ChatGPT machen den Einstieg leichter als je zuvor.

## Das Rabbit Hole verstehen
Du könntest ein ganzes Jahr **16 Stunden täglich** lernen und hättest trotzdem nur **1-2%** des verfügbaren Wissens abgedeckt. Täglich erscheinen neue Tools, Updates, Studien und Ideen. Viele geben nach zwei Wochen auf, weil sie sich im Überfluss verlieren.

## Fokus 2025: Praxis statt Theorie
Lerne keine oberflächliche Theorie. Lerne die **Skills, die Unternehmen gerade brauchen** und mit denen du **sofort Wert schaffst**.

## Die 3 größten KI-Fallen
1. **Toolpalyse:** Produkt-Launches, Features und Benchmarks erzeugen Lärm. Du brauchst **nicht alle Tools**, sondern eine kleine, gezielte Auswahl plus klare Strategie.
2. **Zertifikats- & Compliance-Wahn:** Zertifikate geben Sicherheit, lösen aber selten reale Probleme. Investiere die Zeit in **echte Skills**.
3. **Rollen-Verwirrung:** Nicht-Techniker glauben, sie müssten Programmierer werden. Techniker glauben, ihre Skills seien wertlos. Beides ist falsch.

## Rolle wählen: Techniker vs. Anwender
- **Techniker:** Du baust und installierst KI-Agenten für Unternehmen.
- **Anwender:** Du nutzt KI-Agenten, um z.B. Marketingkampagnen effizient zu erstellen und zu kontrollieren.

Beides sind **riesige Chancen**. Entscheide dich bewusst - das spart Monate.
      `,
    },
    {
      order: 2,
      title: 'Schritt 2: KI-Basics & Begriffe',
      summary: 'Die Begriffe, die dir ständig begegnen, sauber einordnen und sicher erklären.',
      content: `
## Prozess vs. Workflow vs. Script
- **Prozess** = Was soll passieren? (z.B. Kundenanfragen bearbeiten)
- **Workflow** = Die Abfolge der Schritte (E-Mail -> Kategorisieren -> Weiterleiten -> Antwort)
- **Script** = Die technische Umsetzung (Code/Automatisierung)

## KI-Modelle vs. KI-Agenten
- **Modelle** sind statisch: sie antworten nur, wenn du fragst.
- **Agenten** sind autonom: sie handeln selbst, nutzen Tools, erledigen mehrere Schritte.

## No-Code / Low-Code Plattformen
Unterschiedliche Namen, gleiche Logik:
- **Make.com** nennt sie **Szenarien**
- **n8n** nennt sie **Workflows**
- **Power Automate** nennt sie **Flows**

## APIs, Webhooks, HTTP Requests
- **API** = Der Kellner, der Daten bringt.
- **Webhook** = Die Türklingel, die klingelt, wenn etwas passiert.
- **HTTP Request** = Die konkrete Bestellung (z.B. „Gib mir Kundendaten von Müller“)

## Module, Datenmapping, JSON
- **Module** = Funktionsbausteine (wie LEGO).
- **Datenmapping** = Der Übersetzer zwischen System A und B.
- **JSON** = Die gemeinsame Sprache der Systeme (nicht „Jason“).

> **Mini-Test:** Pausiere kurz und erkläre die Begriffe in eigenen Worten. Das ist dein Fundament.
      `,
    },
    {
      order: 3,
      title: 'Schritt 3: Prompt Engineering',
      summary: 'Die wichtigste Hebel-Fähigkeit mit dem höchsten ROI: klare Anweisungen, klare Ergebnisse.',
      content: `
## Warum Prompting so wichtig ist
Prompting ist der Prozess, KI-Tools **präzise Anweisungen** zu geben, um ein Ergebnis zu bekommen. Das geht per Text, Bild, Audio, Video oder Code. Es ist die Basis jeder produktiven KI-Arbeit.

## Dein Einstieg: Ein KI-Chatbot
Wähl einen Chatbot, der dir liegt (ChatGPT, Gemini, Claude). Der Skill ist **modell-agnostisch**.

## Framework: TASK / CONTEXT / RESOURCES / EVALUATE / ITERATE
Merksatz (DE): **Alpakas kaufen Regenschirme bei IKEA**
- **Aufgabe:** Was soll die KI tun?
- **Kontext:** Wer bist du? Was ist das Ziel?
- **Ressourcen:** Beispiele, Vorlagen, Referenzen
- **Bewertung:** Ergebnis prüfen
- **Iteration:** Nachschärfen, verbessern

Der englische Merksatz aus einem Google Prompting Kurs lautet: **Tiny Crabs Write Enormous Iguanas**.

### Beispiel (LinkedIn-Post)
Statt: „Schreib mir einen Post.“
Nutze:
1. Rolle: „Du bist Experte für emotionales Copywriting.“
2. Kontext: „Everlast AI, 1500 Projekte, ROI-Fokus.“
3. Format: „Statistik-Intro -> Angebot -> 2 Hashtags.“

## Ressourcen & Beispiele
Wenn du Beispiele gibst (Posts, Texte, Landingpages), bekommt die KI **alle Nuancen** gratis. Beispiele schlagen lange Erklärungen.

## Bewertung & Iteration
Prompting ist iterativ. Wenn das Ergebnis nicht passt, drehst du nach: kürzer, klarer, mehr Fokus, anderes Format.

## Geheimtipp: System Prompts
Alle Top-Modelle laufen selbst auf **System Prompts**. Such nach den System Prompts von OpenAI, Google oder Anthropic (GitHub) und lerne Struktur + Stil.
      `,
    },
    {
      order: 4,
      title: 'Schritt 4: KI-Automatisierungen',
      summary: 'Welche Aufgaben sich lohnen, wie du sie testest und wie du schnell startest.',
      content: `
## Was Automatisierungen leisten
Low-Code Plattformen wie Make.com, n8n oder eigene Skripte können Buchhaltung, Datenmanagement oder E-Mail-Workflows automatisieren.

## Der 4-Fragen-Test
1. Kann ich Input & Output klar beschreiben?
2. Passiert es jedes Mal gleich?
3. Kann ich es in unter 1 Minute erklären?
4. Spart es mir mind. 30 Minuten pro Woche?

Wenn **4x JA**, ist es perfekt zum Automatisieren.

## Start klein
Beginne mit wiederkehrenden Alltagsaufgaben. Komplexität kommt später. Automatisiere zuerst, was du **täglich** oder **wöchentlich** wiederholst.
      `,
    },
    {
      order: 5,
      title: 'Schritt 5: KI-Agenten verstehen',
      summary: 'Autonome Systeme, die nicht nur reden, sondern handeln und Entscheidungen treffen.',
      content: `
## Was ist ein KI-Agent?
Ein Agent ist ein **digitaler Mitarbeiter**, der Aufgaben selbstständig erledigt.
Beispiel: Ein Immobilien-Kundenservice-Agent, der E-Mails versteht, Lösungen anbietet und Vorgänge dokumentiert. Standardanfragen, die 80% des Alltags ausmachen, kann er heute schon abwickeln.

## Warum der Markt riesig ist
Für jede erfolgreiche Software wird es bald eine **Agenten-Version** geben. Milliarden fließen in diese Systeme – und sie werden monatlich besser. Stell dir vor, jedes erfolgreiche SaaS-Produkt bekommt einen **KI-Zwilling**.

## Beispiel aus der Praxis
Ein Coding-Agent baut dir eine erste Website-Version für ein Restaurant. Nicht perfekt, aber **ein funktionsfähiger Start** in Minuten statt Wochen.

## Die 6 Komponenten eines Agenten
1. **Modell** (Gehirn/Motor)
2. **Tools** (Hände/Füße: Mail, DB, Browser)
3. **Wissen & Gedächtnis** (Kontext + Langzeitwissen)
4. **Sprache/Audio** (menschliche Interaktion)
5. **Leitplanken** (Sicherheit/Regeln)
6. **Orchestrierung** (Monitoring & Steuerung)

Prompting bleibt auch hier der Schlüssel – besonders bei mehreren Agenten.
      `,
    },
    {
      order: 6,
      title: 'Schritt 6: KI-Routine im Alltag',
      summary: 'Von Wissen zu Gewohnheit: KI muss Standard in deinem Alltag werden.',
      content: `
## KI im Alltag verankern
Der längste Schritt: **Umlernen**. Du brauchst eine Routine.
Nutze KI für alles: Texte, Audio, Analyse, Recherche, Planung.

## Tool-Stack
ChatGPT ist die Basis für den Alltag – aber:
- **GPT-Modelle** für schnelle Textaufgaben
- **O-Modelle (Reasoning)** für komplexe Entscheidungen

## Regel
Mache **nichts** mehr ohne KI-Unterstützung, bis es Normalität ist.
      `,
    },
    {
      order: 7,
      title: 'Schritt 7: Vogelperspektive & Zukunft',
      summary: 'Text/Bild sind gelöst. Video & Audio sind der nächste Umbruch.',
      content: `
## Wo geht die Reise hin?
Text und Bild sind praktisch **ununterscheidbar** vom Menschen.
Der nächste Durchbruch ist **Video + Audio**.

- KI-Avatare + Voice-Agenten werden reale Telefonate ersetzen.
- Wer früh Voice-Modelle integriert, überholt die Konkurrenz.
- Neue Videotools (z.B. Veo) machen klassische Werbespots obsolet.

## Lernsystem für 2025+
- **Täglich 5-10 Min:** Updates & Newsletter
- **Wochenende 2 Std:** Use-Cases testen & implementieren
- Wähl 10 Quellen, behalte 1-2 Top-Quellen

Am Ende gewinnen die, die KI **in der Praxis** nutzen – nicht die, die nur Informationen sammeln.
      `,
    },
  ];

  for (const mod of modules) {
    await prisma.trainingModule.upsert({
      where: { 
        courseId_order: { 
          courseId: course.id, 
          order: mod.order 
        } 
      },
      update: {
        title: mod.title,
        summary: mod.summary,
        content: mod.content,
      },
      create: {
        courseId: course.id,
        order: mod.order,
        title: mod.title,
        summary: mod.summary,
        content: mod.content,
      },
    });
  }

  console.log('All modules seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
