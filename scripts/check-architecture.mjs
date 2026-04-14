#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const onlyMigrations = process.argv.includes('--migrations-only');

const errors = [];
const warnings = [];
const info = [];

const readFile = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const listFiles = (relativePath) => fs.readdirSync(path.join(ROOT, relativePath));

const MANUAL_MIGRATIONS_DIR = 'prisma/manual_sql';
const MAX_TOP_LEVEL_LIB_FILES = 10;
const HEAVY_NODE_ROUTES = [
  { path: 'app/api/forge/media/route.ts', requireMaxDuration: true },
  { path: 'app/api/webhooks/replicate/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/veo/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/media/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/nano-banana/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/faceswap/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/lipsync/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/motion-transfer/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/voice/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/voice/sfx/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/voice/history/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/voice/history/[itemId]/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/voice/dictionaries/route.ts', requireMaxDuration: true },
  { path: 'app/api/ventures/[id]/marketing/tools/rembg/route.ts', requireMaxDuration: true },
];

const checkManualMigrationPrefixes = () => {
  const fullPath = path.join(ROOT, MANUAL_MIGRATIONS_DIR);
  if (!fs.existsSync(fullPath)) {
    info.push(`Manuelle SQL-Migrations Ordner nicht gefunden: ${MANUAL_MIGRATIONS_DIR}`);
    return;
  }
  const files = listFiles(MANUAL_MIGRATIONS_DIR)
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  const prefixes = new Map();
  for (const file of files) {
    const prefix = file.split('_')[0];
    const seen = prefixes.get(prefix);
    if (seen) {
      errors.push(
        `Doppelte manuelle Migrations-Prefixe in ${MANUAL_MIGRATIONS_DIR}: "${seen}" und "${file}". ` +
          'Verwende eindeutige, sortierbare Prefixe.'
      );
      continue;
    }
    prefixes.set(prefix, file);
  }

  info.push(`Manuelle SQL-Migrations geprüft: ${files.length}`);
};

const checkHeavyRoutes = () => {
  for (const route of HEAVY_NODE_ROUTES) {
    const fullPath = path.join(ROOT, route.path);
    if (!fs.existsSync(fullPath)) continue;
    
    const source = readFile(route.path);

    if (!/export const runtime = ['"]nodejs['"]/.test(source)) {
      errors.push(`${route.path} muss explizit \`export const runtime = 'nodejs'\` setzen.`);
    }

    if (route.requireMaxDuration && !/export const maxDuration = \d+/.test(source)) {
      errors.push(`${route.path} muss explizit \`export const maxDuration = ...\` setzen.`);
    }
  }

  info.push(`Langlaufende/API-Routen geprüft: ${HEAVY_NODE_ROUTES.length}`);
};

const checkLibBoundary = () => {
  const topLevelLibFiles = listFiles('lib')
    .filter((entry) => {
       const p = path.join(ROOT, 'lib', entry);
       return fs.existsSync(p) && fs.statSync(p).isFile();
    })
    .filter((entry) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry))
    .sort();

  if (topLevelLibFiles.length > MAX_TOP_LEVEL_LIB_FILES) {
    errors.push(
      `lib/ ist zu unübersichtlich (${topLevelLibFiles.length} Top-Level-Dateien > ${MAX_TOP_LEVEL_LIB_FILES}). ` +
        'Verschiebe Logik in Unterordner (z.B. lib/ai, lib/billing).'
    );
  }

  info.push(`Top-Level-Dateien in lib/: ${topLevelLibFiles.length}`);
};

checkManualMigrationPrefixes();

if (!onlyMigrations) {
  checkHeavyRoutes();
  checkLibBoundary();
}


if (info.length > 0) {
  console.log('Architecture check');
  for (const line of info) {
    console.log(`- ${line}`);
  }
}

if (warnings.length > 0) {
  console.warn('\nWarnungen');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error('\nFehler');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('\nArchitecture guardrails passed.');
