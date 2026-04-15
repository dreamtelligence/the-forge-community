#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const onlyMigrations = process.argv.includes('--migrations-only');

const errors = [];
const warnings = [];
const info = [];
const IGNORE_DIRS = new Set(['.git', '.next', '.vercel', 'node_modules']);
const LEGACY_FILE_PATTERNS = [
  /^page_old\.[a-z]+$/i,
  /^page-old\.[a-z]+$/i,
  /(?:^|[_-])old\.(?:ts|tsx|js|jsx|mjs|cjs)$/i,
  /\.(?:bak|backup)$/i,
];

const readFile = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const listFiles = (relativePath) => fs.readdirSync(path.join(ROOT, relativePath));
const pathExists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));

const walkFiles = (relativePath = '.') => {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return [];

  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextRelative = relativePath === '.'
      ? entry.name
      : path.posix.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...walkFiles(nextRelative));
      continue;
    }

    files.push(nextRelative);
  }

  return files;
};

const MANUAL_MIGRATIONS_DIR = 'prisma/manual_sql';
const MAX_TOP_LEVEL_LIB_FILES = 10;
const ALLOWED_TOP_LEVEL_LIB_FILES = new Set([
  'beta-access.server.ts',
  'beta-access.ts',
  'caseworker-login.ts',
  'media-models.ts',
]);
const ALLOWED_SCRIPT_ROOT_ENTRIES = new Set([
  'architecture',
  'db',
  'exports',
  'founders',
  'forum',
  'imports',
  'ops',
  'python',
  'seed',
  'smoke-tests',
  'tests',
]);
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
const WAREHOUSE_BOUNDARY_ROUTES = [
  'app/api/ventures/[id]/warehouse/bins/route.ts',
  'app/api/ventures/[id]/warehouse/import-errors/[errorId]/route.ts',
  'app/api/ventures/[id]/warehouse/import-errors/route.ts',
  'app/api/ventures/[id]/warehouse/inbound-packages/[packageId]/photos/route.ts',
  'app/api/ventures/[id]/warehouse/inbound-packages/[packageId]/pickup-receipt/route.ts',
  'app/api/ventures/[id]/warehouse/inbound-packages/[packageId]/route.ts',
  'app/api/ventures/[id]/warehouse/inbound-packages/route.ts',
  'app/api/ventures/[id]/warehouse/inventory-transactions/route.ts',
  'app/api/ventures/[id]/warehouse/items/[itemId]/adjust/route.ts',
  'app/api/ventures/[id]/warehouse/items/route.ts',
  'app/api/ventures/[id]/warehouse/orders/[orderId]/route.ts',
  'app/api/ventures/[id]/warehouse/orders/import/manual/route.ts',
  'app/api/ventures/[id]/warehouse/orders/import/shopify/route.ts',
  'app/api/ventures/[id]/warehouse/orders/import/woocommerce/route.ts',
  'app/api/ventures/[id]/warehouse/orders/route.ts',
  'app/api/ventures/[id]/warehouse/picklists/[pickListId]/route.ts',
  'app/api/ventures/[id]/warehouse/picklists/generate/route.ts',
  'app/api/ventures/[id]/warehouse/picklists/route.ts',
  'app/api/ventures/[id]/warehouse/reorder-suggestions/route.ts',
  'app/api/ventures/[id]/warehouse/returns/[returnId]/route.ts',
  'app/api/ventures/[id]/warehouse/returns/route.ts',
  'app/api/ventures/[id]/warehouse/shipments/create/route.ts',
  'app/api/ventures/[id]/warehouse/shipments/route.ts',
];
const THIN_APPLICATION_ROUTES = [
  {
    path: 'app/api/ventures/[id]/marketing/media/route.ts',
    requiredImports: [
      "@/lib/ai/application/start-marketing-media-generation",
      "@/lib/ai/application/get-marketing-media-generation-status",
    ],
    forbiddenImports: [
      '@/lib/database/prisma',
      '@/lib/integrations/provider-keys',
      '@/lib/finance/energy',
      '@vercel/blob',
    ],
  },
  {
    path: 'app/api/webhooks/replicate/route.ts',
    requiredImports: [
      "@/lib/ai/application/handle-replicate-webhook-receipt",
      "@/lib/ai/infrastructure/replicate-webhook-verifier",
    ],
    forbiddenImports: [
      '@/lib/database/prisma',
      '@/lib/finance/energy',
      '@vercel/blob',
      'crypto',
    ],
  },
];
const CORE_DOMAIN_MODULES = [
  'ai',
  'billing',
  'integrations',
  'ventures',
  'warehouse',
];
const TARGET_DOMAIN_SUBDIRS = [
  'domain',
  'application',
  'infrastructure',
  'contracts',
];

const checkManualMigrationPrefixes = () => {
  const fullPath = path.join(ROOT, MANUAL_MIGRATIONS_DIR);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Manuelle SQL-Migrations fehlen: ${MANUAL_MIGRATIONS_DIR}`);
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

const checkManualSqlArchiveBoundary = () => {
  if (pathExists('prisma/manual_sql/manual')) {
    errors.push(
      'Legacy-SQL-Ablage prisma/manual_sql/manual ist verboten. Archive gehören unter docs/archive/db/.'
    );
  }
};

const checkHeavyRoutes = () => {
  for (const route of HEAVY_NODE_ROUTES) {
    const fullPath = path.join(ROOT, route.path);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Guardrail verweist auf fehlende Route: ${route.path}`);
      continue;
    }
    
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

  const unexpectedTopLevelFiles = topLevelLibFiles.filter((entry) => !ALLOWED_TOP_LEVEL_LIB_FILES.has(entry));
  const missingFrozenFiles = [...ALLOWED_TOP_LEVEL_LIB_FILES].filter((entry) => !topLevelLibFiles.includes(entry));

  if (unexpectedTopLevelFiles.length > 0) {
    errors.push(
      `Neue Root-lib-Dateien sind verboten: ${unexpectedTopLevelFiles.join(', ')}. ` +
        'Nutze stattdessen Modulordner unter lib/<domain>/.'
    );
  }

  if (missingFrozenFiles.length > 0) {
    errors.push(
      `Die eingefrorene Root-lib-Allowlist wurde veraendert: ${missingFrozenFiles.join(', ')} fehlen. ` +
        'Aendere Legacy-Dateien nur bewusst und mit passender Guardrail-Anpassung.'
    );
  }

  info.push(`Top-Level-Dateien in lib/: ${topLevelLibFiles.length}`);
};

const checkDomainModuleStructure = () => {
  for (const domain of CORE_DOMAIN_MODULES) {
    const domainPath = `lib/${domain}`;
    if (!pathExists(domainPath)) {
      errors.push(`Kernmodul fehlt: ${domainPath}`);
      continue;
    }

    for (const subdir of TARGET_DOMAIN_SUBDIRS) {
      const subdirPath = `${domainPath}/${subdir}`;
      if (!pathExists(subdirPath)) {
        errors.push(
          `${domainPath} braucht die Zielstruktur ${TARGET_DOMAIN_SUBDIRS.join(', ')}. Fehlend: ${subdirPath}`
        );
        continue;
      }

      const absoluteSubdirPath = path.join(ROOT, subdirPath);
      if (!fs.statSync(absoluteSubdirPath).isDirectory()) {
        errors.push(`${subdirPath} muss ein Ordner sein.`);
      }
    }
  }

  info.push(`Kernmodule mit Zielstruktur geprueft: ${CORE_DOMAIN_MODULES.length}`);
};

const checkSharedBoundary = () => {
  if (!pathExists('shared')) return;

  const sharedFiles = walkFiles('shared').filter((relativePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relativePath));
  const forbiddenImportPattern = /@\/lib\/(ai|billing|database|finance|forum|legal|security|user|ventures|warehouse)\//;

  for (const relativePath of sharedFiles) {
    const source = readFile(relativePath);

    if (source.includes('@/lib/database/prisma')) {
      errors.push(`${relativePath} darf Prisma nicht direkt importieren. shared/ bleibt fachlogikfrei.`);
    }

    if (forbiddenImportPattern.test(source)) {
      errors.push(
        `${relativePath} importiert Fachlogik aus lib/. shared/ ist nur fuer stabile, bereichsuebergreifende Bausteine gedacht.`
      );
    }
  }

  info.push(`shared/-Boundary geprueft: ${sharedFiles.length} Dateien`);
};

const checkThinApplicationRoutes = () => {
  for (const route of THIN_APPLICATION_ROUTES) {
    if (!pathExists(route.path)) {
      errors.push(`Thin-Route-Guardrail verweist auf fehlende Route: ${route.path}`);
      continue;
    }

    const source = readFile(route.path);

    for (const requiredImport of route.requiredImports) {
      if (!source.includes(requiredImport)) {
        errors.push(`${route.path} muss den Application-Layer via ${requiredImport} nutzen.`);
      }
    }

    for (const forbiddenImport of route.forbiddenImports) {
      if (source.includes(forbiddenImport)) {
        errors.push(`${route.path} darf ${forbiddenImport} nicht direkt importieren.`);
      }
    }
  }

  info.push(`Thin-Application-Routen geprueft: ${THIN_APPLICATION_ROUTES.length}`);
};

const checkRepoHygiene = () => {
  if (pathExists('app/components')) {
    errors.push('Legacy-Struktur gefunden: app/components/. Nutze ausschließlich components/.');
  }

  if (!pathExists('README.md')) {
    errors.push('README.md im Repo-Root fehlt. Ein öffentliches Repo braucht Pitch + Betriebsgrenzen.');
  }

  const files = walkFiles('.');
  const legacyFiles = files.filter((relativePath) =>
    LEGACY_FILE_PATTERNS.some((pattern) => pattern.test(path.basename(relativePath)))
  );

  if (legacyFiles.length > 0) {
    errors.push(
      `Legacy-/Backup-Dateien sind verboten: ${legacyFiles.slice(0, 10).join(', ')}` +
      (legacyFiles.length > 10 ? ', …' : '')
    );
  }

  const dsStoreFiles = files.filter((relativePath) => path.basename(relativePath) === '.DS_Store');
  if (dsStoreFiles.length > 0) {
    errors.push(
      `.DS_Store gehört nicht ins Repo: ${dsStoreFiles.slice(0, 10).join(', ')}` +
      (dsStoreFiles.length > 10 ? ', …' : '')
    );
  }

  const pythonOutsideScripts = files.filter(
    (relativePath) => relativePath.endsWith('.py') && !relativePath.startsWith('scripts/python/')
  );
  if (pythonOutsideScripts.length > 0) {
    errors.push(
      `Python-Skripte müssen unter scripts/python/ liegen: ${pythonOutsideScripts.join(', ')}`
    );
  }
};

const checkScriptsStructure = () => {
  if (!pathExists('scripts')) return;

  const rootEntries = listFiles('scripts').sort();
  const invalidEntries = rootEntries.filter((entry) => !ALLOWED_SCRIPT_ROOT_ENTRIES.has(entry));

  if (invalidEntries.length > 0) {
    errors.push(
      `scripts/ Root darf nur klar gruppierte Unterordner enthalten: ${invalidEntries.join(', ')}`
    );
  }

  info.push(`Top-Level-Ordner in scripts/: ${rootEntries.length}`);
};

const checkPublicAssetConventions = () => {
  if (!pathExists('public')) return;

  const topLevelPublicDirs = listFiles('public')
    .filter((entry) => fs.statSync(path.join(ROOT, 'public', entry)).isDirectory())
    .sort();

  const invalidNames = topLevelPublicDirs.filter(
    (entry) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry)
  );

  if (invalidNames.length > 0) {
    errors.push(
      `public/ Top-Level-Ordner müssen lowercase-kebab-case sein: ${invalidNames.join(', ')}`
    );
  }

  info.push(`Top-Level-Ordner in public/: ${topLevelPublicDirs.length}`);
};

const checkWarehouseBoundary = () => {
  for (const routePath of WAREHOUSE_BOUNDARY_ROUTES) {
    if (!pathExists(routePath)) {
      errors.push(`Warehouse-Guardrail verweist auf fehlende Route: ${routePath}`);
      continue;
    }

    const source = readFile(routePath);
    if (source.includes("@/lib/database/prisma")) {
      errors.push(
        `${routePath} darf Prisma nicht direkt importieren. Nutze die Warehouse-Boundary in lib/warehouse/*.`
      );
    }

    if (!source.includes("@/lib/warehouse/")) {
      errors.push(
        `${routePath} muss die Fachlogik aus lib/warehouse/* beziehen.`
      );
    }
  }

  info.push(`Warehouse-Boundary geprüft: ${WAREHOUSE_BOUNDARY_ROUTES.length} Kernrouten`);
};

checkManualMigrationPrefixes();
checkManualSqlArchiveBoundary();

if (!onlyMigrations) {
  checkHeavyRoutes();
  checkLibBoundary();
  checkDomainModuleStructure();
  checkRepoHygiene();
  checkPublicAssetConventions();
  checkScriptsStructure();
  checkSharedBoundary();
  checkThinApplicationRoutes();
  checkWarehouseBoundary();
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
