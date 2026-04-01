import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL missing. Define it in .env.local or .env before running.');
}

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const normalizeNewlines = (value) => value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const formatTrainingContent = (value) => {
  const trimmed = normalizeNewlines(value || '').trim();
  if (!trimmed) return '';

  const lines = trimmed.split('\n');
  const out = [];
  let inCode = false;
  let previousType = null;

  const classify = (line) => {
    const t = line.trim();
    if (!t) return 'blank';
    if (/^```/.test(t)) return 'code';
    if (/^#{1,6}\s+/.test(t)) return 'heading';
    if (/^\s{0,3}([-*+]|\d+\.)\s+/.test(t)) return 'list';
    if (/^\s{0,3}>\s?/.test(t)) return 'quote';
    if (/^\*\*[^*]+?\*\*:/.test(t)) return 'label';
    return 'text';
  };

  for (const line of lines) {
    const trimmedLine = line.trimEnd();
    const type = classify(trimmedLine);

    if (type === 'code') {
      inCode = !inCode;
      out.push(trimmedLine);
      previousType = 'code';
      continue;
    }

    if (inCode) {
      out.push(line);
      previousType = 'code';
      continue;
    }

    if (type === 'blank') {
      if (out[out.length - 1] !== '') out.push('');
      previousType = 'blank';
      continue;
    }

    const needsSpacer =
      out.length > 0 &&
      out[out.length - 1] !== '' &&
      (type === 'heading' || type === 'label' || (previousType && previousType !== type && type !== 'list'));

    if (needsSpacer) {
      out.push('');
    }

    out.push(trimmedLine);
    previousType = type;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const extractSummary = (content) => {
  if (!content) return null;
  const normalized = content.replace(/^#{1,6}\s+/gm, '').trim();
  const paragraph = normalized.split(/\n\s*\n/).find((item) => item.trim());
  if (!paragraph) return null;
  const compact = paragraph.replace(/\s+/g, ' ').trim();
  return compact.length > 200 ? `${compact.slice(0, 197)}...` : compact;
};

const splitModulesByHeading = (lines, matches) => {
  const modules = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const contentLines = lines.slice(current.index + 1, next ? next.index : lines.length);
    modules.push({
      title: current.title,
      content: contentLines.join('\n').trim(),
    });
  }
  return modules;
};

const parseKursGruendung = (text) => {
  const lines = normalizeNewlines(text).split('\n');
  const titleLineIndex = lines.findIndex((line) => line.trim());
  const bodyLines = lines.slice(titleLineIndex + 1);

  const moduleMatches = bodyLines
    .map((line, index) => {
      const match = line.match(/^Modul\s+(\d+)\s*[-–]\s*(.+)$/i);
      if (!match) return null;
      return { index, title: match[2].trim() };
    })
    .filter(Boolean);

  if (moduleMatches.length === 0) {
    return [
      {
        title: 'Kursinhalt',
        content: bodyLines.join('\n').trim(),
      },
    ];
  }

  const introLines = bodyLines.slice(0, moduleMatches[0].index).join('\n').trim();
  const modules = splitModulesByHeading(bodyLines, moduleMatches);
  if (introLines) {
    modules[0].content = `## Ueberblick\n${introLines}\n\n${modules[0].content}`;
  }

  return modules;
};

const parseLegalGuide = (text) => {
  const lines = normalizeNewlines(text).split('\n');
  const titleLineIndex = lines.findIndex((line) => line.trim());
  const bodyLines = lines.slice(titleLineIndex + 1);

  const sectionMatches = bodyLines
    .map((line, index) => {
      const match = line.match(/^(\d+)\.\s+(.+)$/);
      if (!match) return null;
      return { index, title: match[2].trim() };
    })
    .filter(Boolean);

  if (sectionMatches.length === 0) {
    return [
      {
        title: 'Rechtliche Grundlagen',
        content: bodyLines.join('\n').trim(),
      },
    ];
  }

  return splitModulesByHeading(bodyLines, sectionMatches);
};

const courses = [
  {
    slug: 'veo-shop-fotos',
    title: 'VEO 3.1: Produktfoto zu Shop-Visuals',
    summary: 'Aus drei Inputs wird ein markenfaehiges Shop- und Lifestyle-Visual fuer deine Produktseite.',
    category: 'Distribution',
    level: 'Content Lab',
    durationMins: 45,
    coverImage: '/Veo/fashion_ecommerce_shot.png',
    sourceFile: 'veo_shop_fotos',
    parser: parseKursGruendung,
  },
  {
    slug: 'kurs-gruendung',
    title: 'Kurs zur Gruendung eines Online-Business',
    summary: 'Schritt-fuer-Schritt von der Idee ueber Rechtsform bis zum Launch in Deutschland.',
    category: 'Strategy',
    level: 'Founder Track',
    durationMins: 120,
    coverImage: '/survival_camera_set.jpg',
    sourceFile: 'kurs_gruendung',
    parser: parseKursGruendung,
  },
  {
    slug: 'rechtlicher-leitfaden',
    title: 'Rechtlicher Leitfaden (DE/EU)',
    summary: 'Rechtsform, Steuern, Markenschutz, Datenschutz und Pflichten fuer Gruender.',
    category: 'Legal',
    level: 'Compliance',
    durationMins: 80,
    coverImage: '/glases.jpg.webp',
    sourceFile: 'REchtliche_Leitfaden',
    parser: parseLegalGuide,
  },
  {
    slug: 'rechtliches',
    title: 'Rechtliches kompakt',
    summary: 'Kurzfassung rechtlicher Pflichten fuer Gruender in Deutschland.',
    category: 'Legal',
    level: 'Quickstart',
    durationMins: 60,
    coverImage: '/man_glases.png',
    sourceFile: 'rechtliches',
    parser: parseLegalGuide,
  },
  {
    slug: 'veo3-json-prompting',
    title: 'VEO 3 Tree Ads: JSON Prompting Playbook',
    summary: 'Virale VEO 3 Tree Ads mit sauberem JSON-Workflow: Unboxing, Room-Transformations und Cinematic Brand Ads.',
    category: 'Distribution',
    level: 'Content Lab',
    durationMins: 55,
    coverImage: '/Veo/fashion_ecommerce_shot.png',
    sourceFile: 'veo_json_prompting',
    parser: parseKursGruendung,
  },
  {
    slug: 'trendprodukte-2026',
    title: 'Trendprodukte 2026: Markt-Map fuer Online-Verkauf',
    summary: 'Top-Kategorien, Quartals-Trends und ein klarer Workflow, um Hypes von echten Chancen zu trennen.',
    category: 'Research',
    level: 'Market Intel',
    durationMins: 70,
    coverImage: '/survival_camera_set.jpg',
    sourceFile: 'trendprodukte_2026',
    parser: parseKursGruendung,
  },
];

async function run() {
  const root = process.cwd();

  for (const course of courses) {
    const filePath = path.join(root, course.sourceFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping ${course.slug}: missing ${course.sourceFile}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const modules = course.parser(raw).map((module, index) => {
      const formatted = formatTrainingContent(module.content);
      return {
        order: index + 1,
        title: module.title,
        summary: extractSummary(formatted),
        content: formatted,
      };
    });

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
      create: {
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        category: course.category,
        level: course.level,
        coverImage: course.coverImage,
        durationMins: course.durationMins,
      },
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

    console.log(`Upserted course: ${course.slug} (${modules.length} modules)`);
  }
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
