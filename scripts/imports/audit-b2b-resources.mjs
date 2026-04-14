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
  throw new Error('DATABASE_URL missing. Define it in .env.local or .env before auditing.');
}

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SOURCE_FILES = [
  'B2B',
  'b2b_',
  'B2B_Lager',
];

const PARSED_INPUT = path.resolve(process.cwd(), 'data', 'b2b-import.json');

const COMPANY_TOKENS = [
  'gmbh', 'ag', 'kg', 'ug', 'se', 's.a', 'b.v', 'inc', 'ltd', 'llc', 'group',
  'logistik', 'logistics', 'fulfillment', 'company', 'ohg', 'e.v', 's.r.o', 'srl'
];

const SKIP_TOKENS = [
  'einleitung', 'dienstleistung', 'beschreibung', 'kategorie', 'hinweise',
  'kontaktdaten', 'adresse', 'preis', 'preise', 'leistung', 'quelle', 'nutzungshinweis',
  'zusatzleistungen', 'verfuegbarkeit', 'verfügbarkeit', 'weitere', 'partner',
  'versanddienstleister', 'paketdienste', 'tabellen', 'uebersicht', 'übersicht'
];

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'und')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isLikelyCompany = (value) => {
  const lower = value.toLowerCase();
  if (SKIP_TOKENS.some(token => lower.includes(token))) return false;
  return COMPANY_TOKENS.some(token => lower.includes(token)) || value.split(' ').length >= 2;
};

const extractCandidates = (content) => {
  const candidates = [];
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.includes('\t')) continue;

    const cleaned = line.replace(/^[*\-•\d.\s]+/, '').trim();
    if (!cleaned) continue;

    const dashSplit = cleaned.split(/\s[–-]\s/);
    if (dashSplit.length > 1) {
      const name = dashSplit[0].trim().replace(/[:;,.]$/, '');
      if (name && isLikelyCompany(name)) {
        candidates.push(name);
      }
      continue;
    }

    if (isLikelyCompany(cleaned)) {
      candidates.push(cleaned.replace(/[:;,.]$/, ''));
    }
  }

  return candidates;
};

async function main() {
  let candidateTitles = [];

  if (fs.existsSync(PARSED_INPUT)) {
    const parsed = JSON.parse(fs.readFileSync(PARSED_INPUT, 'utf8'));
    candidateTitles = parsed.map((entry) => entry.title).filter(Boolean);
  } else {
    const allCandidates = [];
    for (const file of SOURCE_FILES) {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Missing file: ${filePath}`);
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      allCandidates.push(...extractCandidates(content));
    }
    candidateTitles = allCandidates;
  }

  const uniqueCandidates = Array.from(new Set(candidateTitles.map(name => name.trim()))).filter(Boolean);
  const dbResources = await prisma.resource.findMany({ select: { title: true } });
  const dbTitles = new Set(dbResources.map(resource => normalize(resource.title)));

  const missing = uniqueCandidates.filter(name => !dbTitles.has(normalize(name)));
  const matched = uniqueCandidates.length - missing.length;

  const report = {
    totalCandidates: uniqueCandidates.length,
    matched,
    missingCount: missing.length,
    missing
  };

  const reportDir = path.resolve(process.cwd(), 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'b2b-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`B2B audit done.`);
  console.log(`Candidates: ${uniqueCandidates.length}`);
  console.log(`Matched: ${matched}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Report: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error('B2B audit failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
