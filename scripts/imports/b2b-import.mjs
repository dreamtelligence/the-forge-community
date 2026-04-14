import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

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
  throw new Error('DATABASE_URL missing. Define it in .env.local or .env before import.');
}

const INPUT_PATH = path.resolve(process.cwd(), 'data', 'b2b-import.json');
const REPORT_PATH = path.resolve(process.cwd(), 'reports', 'b2b-import-report.json');

if (!fs.existsSync(INPUT_PATH)) {
  throw new Error(
    `Missing input file: ${INPUT_PATH}. Run scripts/imports/b2b-parse.mjs first.`
  );
}

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const _normalize = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'und')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const mergeContactInfo = (current, next) => {
  const currentInfo = current && typeof current === 'object' ? current : {};
  const nextInfo = next && typeof next === 'object' ? next : {};
  return {
    ...currentInfo,
    ...nextInfo,
    phones: Array.from(new Set([...(currentInfo.phones || []), ...(nextInfo.phones || [])])),
    emails: Array.from(new Set([...(currentInfo.emails || []), ...(nextInfo.emails || [])]))
  };
};

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const report = {
    created: [],
    updated: [],
    skipped: []
  };

  for (const entry of payload) {
    if (!entry?.title) continue;
    const existing = await prisma.resource.findFirst({
      where: {
        title: {
          equals: entry.title,
          mode: 'insensitive'
        }
      }
    });

    if (!existing) {
      const created = await prisma.resource.create({
        data: {
          title: entry.title,
          category: entry.category || 'B2B_DIRECTORY',
          type: entry.type || entry.category || 'B2B_DIRECTORY',
          description: entry.description || null,
          url: entry.url || null,
          contactEmail: entry.contactEmail || null,
          contactInfo: entry.contactInfo || null,
          tags: entry.tags || [],
          location: entry.location || null,
          isPublic: true
        }
      });
      report.created.push(created.title);
      continue;
    }

    const updateData = {};

    if (!existing.description && entry.description) updateData.description = entry.description;
    if (!existing.url && entry.url) updateData.url = entry.url;
    if (!existing.contactEmail && entry.contactEmail) updateData.contactEmail = entry.contactEmail;
    if (!existing.location && entry.location) updateData.location = entry.location;
    if (!existing.type && entry.type) updateData.type = entry.type;
    if (!existing.category && entry.category) updateData.category = entry.category;

    const nextTags = Array.from(new Set([...(existing.tags || []), ...(entry.tags || [])]));
    if (nextTags.length !== (existing.tags || []).length) {
      updateData.tags = nextTags;
    }

    const mergedContact = mergeContactInfo(existing.contactInfo, entry.contactInfo);
    if (JSON.stringify(mergedContact) !== JSON.stringify(existing.contactInfo || {})) {
      updateData.contactInfo = mergedContact;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.resource.update({
        where: { id: existing.id },
        data: updateData
      });
      report.updated.push(existing.title);
    } else {
      report.skipped.push(existing.title);
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('B2B import done.');
  console.log(`Created: ${report.created.length}`);
  console.log(`Updated: ${report.updated.length}`);
  console.log(`Skipped: ${report.skipped.length}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main()
  .catch((error) => {
    console.error('B2B import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
