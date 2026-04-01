import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const course = {
  slug: 'luxury-ai-content-machine',
  title: 'Luxury AI Content Machine',
  summary: 'Verwandle einfache Handyfotos in High-End Video-Ads für Instagram & TikTok. Nutze die Strategien von Brands wie Gucci und Louis Vuitton mit Higsfield & VO3.1.',
  category: 'Distribution',
  level: 'Expert Track',
  durationMins: 45,
};

const modules = [
  {
    order: 1,
    title: 'Die 3-Säulen-Formel der Viralität',
    summary: 'Warum Luxus-Ads funktionieren und wie du sie ohne Studio nachbaust.',
    content: `## Das Geheimnis der "Big Brands"

Marken wie Gucci, LV und Balenciaga nutzen kein 10.000€ Equipment mehr für Social Media – sie nutzen AI-Workflows. 

Die Formel besteht aus drei Elementen:

1. **Der Product Shot:** Ein sauberer, hochauflösender Studio-Look (auch wenn das Original ein Handyfoto ist).
2. **Der surreale Moment:** AI erlaubt es uns, mit Proportionen zu spielen. Ein Model, das auf einem riesigen Parfüm-Flakon sitzt? Das ist der "Scroll-Stopper".
3. **Elegante Bewegung:** Kein hektisches Blinken, sondern cineastische, langsame Kamerabewegungen.

---

## Dein Ziel

Wir wollen nicht nur "AI-Bilder" machen, sondern Content, der **verkauft**.`
  },
  {
    order: 2,
    title: 'Workflow: Von 2 Bildern zum fertigen Video',
    summary: 'Der Schritt-für-Schritt Prozess: Kombinieren, Generieren, Animieren.',
    content: `## Der 3-Schritt-Prozess

Hier ist der Kern-Workflow, um maximale Kontrolle über das Ergebnis zu haben:

### Schritt A: Die Quell-Bilder (Input)

Du startest mit zwei einfachen Bildern:

*   **Bild 1 (Produkt):** Ein einfaches Foto deines Produkts (z.B. Parfüm, Sneaker, Uhr) auf deinem Küchentisch.
*   **Bild 2 (Avatar):** Ein Bild eines Models oder Avatars, der farblich und stilistisch zu deiner Brand passt.

<br />

### Schritt B: Die Komposition (Marketing Image)

Diese beiden Bilder führst du in Tools wie **Higsfield (Nano Banana)** zusammen. 

*   **Input:** Bild 1 + Bild 2
*   **Prompt:** "Ein Model im schwarzen Anzug sitzt majestätisch auf einem riesigen Parfüm-Flakon, Studio-Beleuchtung, 8k."
*   **Resultat:** Ein surrealistisches, hochwertiges Marketing-Bild.

<br />

### Schritt C: Die Animation (Video)

Das fertige Bild wird nun in ein Video verwandelt (**VO3.1**).

*   **Motion Prompt:** "Cineastische Kamerfahrt nach vorne, leichter Partikelflug, weiche Schatten."
*   **Resultat:** Eine 4K High-End-Ad.`
  },
  {
    order: 3,
    title: 'Praxis-Beispiel & Platzhalter',
    summary: 'Visualisierung des Workflows.',
    content: `## Workflow Visualisierung

| Phase | Beschreibung | Visual (Beispiel) |
| :--- | :--- | :--- |
| **Input 1** | Quell-Produkt (Gucci) | ![Produkt](/glases.jpg.webp) |
| **Input 2** | Avatar/Model (Julian) | ![Model](/man.avif) |
| **Output Image** | Surreale Komposition | ![Final](/man_glases.png) |

---

## Tipps für Perfektionisten

*   **Color Matching:** Wenn die Farben des Avatars nicht zum Produkt passen, lade das Bild erneut hoch und nutze den Prompt: "Passe die Farbe des Anzugs exakt an das Gold des Flakons an."
*   **Upscaling:** Nutze immer einen AI-Upscaler (4K), bevor du die Ad postest. Qualität signalisiert Vertrauen.`
  },
  {
    order: 4,
    title: 'Use Cases & Monetarisierung',
    summary: 'Wie du diesen Skill in Cash verwandelst.',
    content: `## 5 Wege, um hiermit Geld zu verdienen

1. **E-Commerce Launch:** Erstelle Teaser für deine eigenen Produkte, die sofort "High-End" wirken.
2. **Client Portfolio:** Erstelle in 10 Minuten Test-Ads für lokale Brands und gewinne sie als Kunden.
3. **Personal Branding:** Setze dich selbst (als Avatar) in surreale Szenarien, um Aufmerksamkeit zu generieren.
4. **Content Repurposing:** Verwandle alte, schlecht performende Produktfotos in virale Video-Assets.
5. **Social Proof Ads:** Erstelle kommerziell wirkende Testimonials mit UGC-Charakteren.`
  }
];

async function run() {
  const createdCourse = await prisma.trainingCourse.upsert({
    where: { slug: course.slug },
    update: {
      title: course.title,
      summary: course.summary,
      category: course.category,
      level: course.level,
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

  console.log('Luxury Content Course seeded:', createdCourse.slug);
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
