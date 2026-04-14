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

async function run() {
  const modules = await prisma.trainingModule.findMany({
    select: { id: true, title: true, content: true },
  });

  let updated = 0;

  for (const trainingModule of modules) {
    const formatted = formatTrainingContent(trainingModule.content);
    if (formatted && formatted !== trainingModule.content) {
      await prisma.trainingModule.update({
        where: { id: trainingModule.id },
        data: { content: formatted },
      });
      updated += 1;
    }
  }

  console.log(`Training modules updated: ${updated}/${modules.length}`);
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
