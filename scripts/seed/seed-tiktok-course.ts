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
  const courseSlug = 'tiktok-takeoff-plan-2025';

  const course = await prisma.trainingCourse.upsert({
    where: { slug: courseSlug },
    update: {},
    create: {
      slug: courseSlug,
      title: 'TikTok Takeoff 2025: 0-10k in 30 Tagen',
      summary:
        'Der komplette Sprint-Plan fuer Reichweite, Hooks und faceless Content - inklusive KI-Workflow.',
      category: 'SOCIAL MEDIA',
      level: 'BEGINNER',
      durationMins: 75,
      coverImage:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200',
    },
  });

  console.log(`Course created: ${course.title}`);

  const modules = [
    {
      order: 1,
      title: 'Warum TikTok 2025 die groesste Chance ist',
      summary: 'TikTok Rewards, Reichweite ohne Startkapital und der Vorteil von faceless Content.',
      content: `
## Die Chance 2025
TikTok ist 2025 die groesste Plattform fuer organische Reichweite. Du musst kein Startkapital mitbringen, kein Gesicht zeigen und keine teure Technik kaufen.

## Die groesste Illusion
Viele glauben, man kann nur Geld verdienen, wenn man beruehmt ist oder vor der Kamera steht. Das stimmt nicht. Faceless Accounts mit einfachen, klaren Formaten funktionieren nachweislich.

## Consumer vs. Creator
Die einen scrollen, die anderen bauen Systeme. Sobald du vom Konsumenten zum Creator wechselst, arbeitet die Plattform fuer dich.

## Warum KI der Booster ist
Mit KI kannst du in Minuten produzieren, wofuer frueher Stunden noetig waren. Das bedeutet: mehr Output, schnelleres Testen, schnelleres Lernen.
      `,
    },
    {
      order: 2,
      title: 'Der TikTok Takeoff Plan: Nische, System, Qualitaet',
      summary: 'So findest du eine profitable Nische und baust ein System, das funktioniert.',
      content: `
## Schritt 1: Nischenrecherche mit klaren Kriterien
Suche auf der For-You-Page nach Videos, die folgende Kriterien erfuellen:
- Mehr als 100.000 Views
- Kein Gesicht im Video
- Ueber eine Minute Laufzeit

Wenn ein Video diese Kriterien trifft, schaue dir den kompletten Account an:
- Gehen mehrere Videos regelmaessig viral?
- Ist die Konkurrenz ueberschaubar?
- Kannst du das Format selbst umsetzen oder verbessern?

## Schritt 2: KI smart nutzen
KI funktioniert nicht mit Copy-Paste-Prompts. Nutze Beispiele, die bereits viral waren, und trainiere deine Prompts damit.
Beispiel: Story-Skripte, Faktenvideos, Trend-Clips. Du lieferst Struktur und Beispiele - KI liefert Geschwindigkeit.

## Schritt 3: Qualitaet schlaegt Quantitaet
Ein starkes Video kann mehr bringen als 50 mittelmaessige. Fokus auf klare Hooks, saubere Struktur, einfache Produktion.
      `,
    },
    {
      order: 3,
      title: 'Ground Zero: Klarheit vor Wachstum',
      summary: 'Wenn du noch nicht weisst, wofuer du stehen willst, ist dieser Schritt Pflicht.',
      content: `
## Zwei Creator-Typen
1. Du hast ein klares Thema und eine Zielgruppe.
2. Du hast noch keine Klarheit und willst erst herausfinden, was funktioniert.

Wenn du zu Typ 2 gehoerst, startest du hier.

## Die Buffet-Strategie
Teste alles, was dich interessiert:
- Day in the life
- Coffee-Routinen
- Storytelling
- Haus-Reset
- Get ready with me

Das Ziel ist nicht Wachstum, sondern Klarheit. Deine besten Formate werden zu deiner Marke.

## Regel
Nicht denken, posten. Lernen durch Reps. Erst wenn du Klarheit hast, startest du den Sprint.
      `,
    },
    {
      order: 4,
      title: 'Woche 1: Profil, Recherche und Signature Series',
      summary: 'Account sauber aufsetzen und die ersten Formate mit Strategie testen.',
      content: `
## Profil Setup in 20 Minuten
- Profilfoto passend zur Nische
- Bio mit zwei Elementen: Was bietest du + wer bist du
Beispiel: "Home Workouts fuer Busy Moms. Wenn ich das mit Kids schaffe, schaffst du es auch."

## Content Research
So findest du virale Vorlagen:
- Suche nach Keywords in der TikTok-Suche
- Filter auf die letzten 30 Tage
- Achte auf Views-zu-Follower-Ratio (Videos mit deutlich mehr Views als Follower)

## Hook Layering
Die ersten Sekunden entscheiden:
- Bild: Was sieht man als Erstes?
- Audio: Trend oder klare Emotion?
- Text: Keywords und Nutzen

## Signature Series starten
Beispiel: "30 Tage Pumpkin Spice Latte". Am Ende jedes Videos: "Folge fuer Tag 2."
      `,
    },
    {
      order: 5,
      title: 'Woche 2: Messy Action und Community Building',
      summary: 'Hohe Frequenz, schnelle Learnings und echte Community.',
      content: `
## Posting-Frequenz
Im Sprint: 3 bis 5 Posts pro Tag. Nicht alles muss perfekt sein, aber alles muss raus.

## Content-Quellen
- Eigener Kameraroll
- Stock/B-Roll als visuelle Basis

## Analyse nach 7 Tagen
Du hast 20 bis 35 Posts - genug Daten, um zu erkennen, was funktioniert.
Halte an Formaten fest, die traction bringen. Verbessere sie, statt komplett zu wechseln.

## Community Routine
Taeghlich 10 bis 15 Minuten:
- Auf Kommentare antworten
- In anderen Accounts kommentieren
Das baut Vertrauen und Reichweite.
      `,
    },
    {
      order: 6,
      title: 'Woche 3: Konsistenz und Repurposing',
      summary: 'Wiedererkennbarkeit schaffen und starke Inhalte neu verpacken.',
      content: `
## Analyse nach 14 Tagen
Identifiziere 1 bis 2 Formate, die predictably funktionieren.
Diese Formate werden deine Brand-Signatur.

## Repackaging statt neu drehen
Ein Clip kann 5 bis 10 Videos werden:
- Neuer Hook
- Andere Story
- Anderes Timing

## Neue Taktiken
- Video Replies auf Kommentare
- Zweite Signature Series starten
- Einheitliches Design: Schrift, Farben, Cover, Intro-Linie
      `,
    },
    {
      order: 7,
      title: 'Woche 4: Flywheel und Wachstumsschub',
      summary: 'Finde die Inhalte, die Follows ausloesen und verdopple sie.',
      content: `
## Fokus auf Follows, nicht nur Views
In den Analytics siehst du, welche Videos Follows bringen. Diese Videos werden verdoppelt und verbessert.

## Community Flywheel
Content erzeugt Engagement -> Engagement erzeugt Follows -> Follows erzeugen mehr Engagement.
Finde das Format, das diesen Loop am staerksten startet.

## Wachstumstreiber
- Kooperationen, Duette, Stitches
- Mutige Meinungen (nur wenn du damit umgehen kannst)
- Mehr Fokus auf das, was bereits funktioniert
      `,
    },
    {
      order: 8,
      title: 'Nach dem Sprint: Nachhaltige Frequenz',
      summary: 'Vom Sprint in den Marathon wechseln, ohne die Reichweite zu verlieren.',
      content: `
## Runterfahren ohne Einbruch
Nach 30 Tagen nicht abrupt stoppen. Stattdessen langsam reduzieren:
- Woche 5: 2 Posts pro Tag
- Woche 6: 1 Post pro Tag
- Woche 7: 3 bis 5 Posts pro Woche

## 70 Prozent Nurture Content
Mehr Alltag, Behind the Scenes, Q und A. Weniger Druck, mehr Nachhaltigkeit.
      `,
    },
    {
      order: 9,
      title: 'Hook Library: Deutsch und Englisch',
      summary: 'Sofort nutzbare Hooks fuer Scroll-Stop und hohe Watchtime.',
      content: `
## 75 Hooks (Englisch)
- tiktok made me buy it
- My top shopping find I can't live without
- Favorite online shopping finds
- 3 Reasons You Need x For x
- Stop buy that buy this instead
- Here are the secrets to
- I am about to share with you
- I am about to share with you the secrets of
- Do you want traffic from
- The number one thing I’ve learned from
- Three simple steps to
- Do you get stuck when
- You are about to get more leads, sales and profit with
- How do you make sure your
- Here is how to become a
- The secret to using your
- Here is exactly how I
- How to get more
- This is how you can start getting results from
- I'm about to give you
- You won’t believe this
- X reasons why
- Something you didn’t know
- Simple important tip
- 10 tip I wish I knew earlier
- How I got x in 24 hours
- I don’t know who needs to hear this but
- Here are x tiny tips that can help you do
- This is why your x isn’t working
- Why is nobody talking about
- The number one reason you’re not
- X reasons why you should
- Life Hack I wish I knew sooner
- Things I discovered on the internet
- Products that have changed my life
- Best affordable dupes for x
- Things I use everyday
- Extremely unpopular opinion x
- I can't believe I lived without x
- If you struggle with x try this x
- How to never be x again
- 5 things that help my x
- Its just a friendly reminder x
- I finally found a way to quit immediately x
- 5 Reason why I love x
- The perfect x doesn't exist
- 3 Top TikTok shopping finds
- 3 Tips to get rid of x
- Getting my daily x hits different with x
- Want x? Check this out
- Want x? You should watch this
- 3 Things I wish I knew sooner
- Stop immediately scrolling if you suffer from x
- How I x while on a budget
- This is the secret to getting x
- What I ordered and what I got
- My top shopping finds
- Why is nobody talking about this x
- This is the simple way to do x
- How I do x
- This the quickest way to solve x
- Psst, I am sharing my secret about x
- How to get x in 24 hours
- Wtf is this? Reacting to x
- Here are 3 signs you're ready to x
- 7 mistakes you are probably making with x
- You are probably doing x all wrong if x
- 3 steps you need to take in order to x
- If you want to x make sure you x
- I just discovered the best x
- x trends that need to die in 2026
- 5 red flags to look for in x
- Stuff you actually need
- Would you x this
- Best x alternative

Du kannst die englischen Hooks auch direkt auf Deutsch testen.

## 49 Hooks (Deutsch)
- Du wirst nicht glauben, dass
- Niemand redet ueber
- x Tipps, die dir helfen mit
- Dieser x hat mein Leben veraendert
- Ich moechte dir den wahren Hintergrund erklaeren, warum wir
- Wolltest du schon immer wissen, wie x aussieht?
- Wolltest du schon immer wissen, wie x funktioniert?
- Wolltest du schon immer wissen, wie x gemacht wird?
- Ich darf das eigentlich nicht sagen, aber
- Das sind 3 Dinge, die du unbedingt wissen musst, wenn
- Dies ist die verrueckte Geschichte, wie
- Dieses Video wird die Art und Weise veraendern wie du
- x ist die groesste Herausforderung, vor der du stehst und hier ist der Grund
- Diese Technik solltest du anwenden, wenn du
- Du hast nur x Minuten Zeit fuer x? Versuch das
- x Tipps, wie du ganz schnell
- Hat noch jemand genug von x? Lass mich helfen
- Versuch dies wenn du nur x Minuten Zeit hast
- Das wirst du zwar nicht hoeren wollen, aber
- Jemand hat mich gerade auf diese tolle Idee gebracht
- Das wirst du hoeren wollen
- x Tipps, die ich gerne frueher gewusst haette
- x Tipps, die dir helfen mit
- Das ist, warum x nicht funktioniert
- Hier etwas, das ich gerne frueher gewusst haette
- Du wirst nicht glauben, was ich dir jetzt sage
- Das haben mich die Leute in letzter Zeit immer wieder gefragt
- Etwas, worueber ich gerade nachgedacht habe, ist
- Diese Nachricht ist fuer all meine
- x Gruende fuer x, die du nicht wusstest oder kanntest
- Etwas, das du nicht wusstest
- Wie ich x in 24 Stunden bekommen habe
- Diese Technik solltest du anwenden, wenn du x
- Wenn ich zurueckgehen und meinem juengeren Ich eine Sache ueber x sagen koennte, waere es x
- So haben wir fast x bevor wir x
- Wenn du das Geheimnis kennst, das ich dir jetzt verrate, wird sich alles veraendern
- So waere mein x vor dem Start fast gescheitert
- Das ist, warum x nicht funktioniert
- Diese Story ist die Wahrheit darueber, wo ich angefangen habe
- Du musst unbedingt wissen, was ich dir jetzt erzaehlen werde
- Dies ist einer meiner besten Tipps
- Das ist ein wirklich verrueckter Tipp, den du lieben wirst
- Ich habe mich gerade an diese verrueckte Sache erinnert
- Das ist das, worum mich meine Freunde immer wieder gebeten haben
- Dieses Video wird die Art und Weise veraendern wie du
- Willst du etwas Seltsames wissen?
- Ehrlich gesagt, der beste Rat, den ich dir geben kann, ist
- Dies ist das einzige x, das ich jemals wieder benutzen werde
- Warum redet niemand ueber x

## 50 Hook-Ideen (Deutsch)
- Wusstest du, dass
- Du wirst nicht glauben, was passiert ist
- XX macht fast jeder falsch
- Ich haette nie gedacht, dass XX funktioniert
- 3 Dinge, die du heute vermeiden solltest
- Ich habe XX getestet - das Ergebnis ueberrascht dich
- Dieser Trick spart dir jeden Tag Zeit
- Wenn du DAS tust, wirst du erfolgreicher
- Das erfaehrt kaum jemand im Internet
- Warum redet niemand darueber
- Dieses Video wird dein Mindset aendern
- Du hast TikTok bisher voellig falsch genutzt
- Ich zeig dir etwas, das dein Leben vereinfacht
- So machst du XX in weniger als 10 Minuten
- Ich habe 30 Tage lang XX gemacht - das ist passiert
- Du brauchst XX, wenn du mit Y kaempfst
- Haette ich XX frueher gewusst, dann
- Jeder sollte diesen Trick kennen
- So erkennst du sofort, ob
- Wie ich mit einem Fehler viral gegangen bin
- Dieses Produkt hat mein Leben veraendert
- Wenn du TikTok machst, dann sieh dir das an
- Nur 1 Prozent kennen diesen Hack
- Dieses Video wird dich umhauen
- Das beste Tool, was einfach noch niemand nutzt
- Ich wuenschte, mir haette das jemand gesagt
- So bekommst du X in 5 einfachen Schritten
- Meine Top 3 Geheimtipps fuer
- Das wird dein Game komplett veraendern
- Ich habe XY gefragt - das kam dabei raus
- Was dir niemand ueber X erzaehlt
- So sparst du bei jedem Einkauf
- Ich hab diesen Fehler gemacht, damit du es nicht musst
- Das musst du 2026 wissen
- Ein ehrlicher Blick hinter die Kulissen von XX
- Das dachte ich auch, bis ich das sah
- Wie du durch XX sofort mehr Aufmerksamkeit bekommst
- Dieser Fehler kostet dich Reichweite
- So verpasst du nie wieder einen Trend
- Ein Tool, das ich taeglich nutze
- Ich habe X mit Y verglichen - das ist der Unterschied
- Du brauchst nur DAS, um zu starten
- Mein bester Tipp fuer XX Anfaenger
- So steigert sich deine Engagement-Rate sofort
- 1 Video, 100000 Views. So hab ich es geschafft
- XX hat sich geaendert - das musst du wissen
- Warum du heute mit XX anfangen solltest
- Dieser einfache Hack bringt dir Views
- So ueberzeugst du in den ersten Sekunden
- Vergiss alles, was du bisher ueber XX wusstest

## 5 Hooks, die regelmaessig stoppen
- Nobody is talking about this
- You’re doing something wrong - here is why
- 3 secrets industry pros don’t want you to know
- This will save you hours
- Here’s the fastest way to a desirable outcome
      `,
    },
  ];

  for (const mod of modules) {
    await prisma.trainingModule.upsert({
      where: {
        courseId_order: {
          courseId: course.id,
          order: mod.order,
        },
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

  console.log('TikTok course seeded successfully.');
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
