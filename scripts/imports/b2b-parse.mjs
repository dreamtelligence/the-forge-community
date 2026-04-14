import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const mappingPath = path.join(ROOT, 'data', 'b2b-mapping.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

const SOURCE_FILES = ['B2B', 'b2b_', 'B2B_Lager'];
const OUTPUT_PATH = path.join(ROOT, 'data', 'b2b-import.json');

const COMPANY_MARKERS = /(gmbh|ag|kg|ug|se|s\.a|b\.v|inc|ltd|llc|group|ohg|s\.r\.o|srl|company|logistics|logistik)/i;
const IGNORE_LINE_PREFIXES = [
  'tel', 'telefon', 'adresse', 'beschreibung', 'kategorie', 'leistung',
  'kontakt', 'quelle', 'preis', 'preise', 'kundenservice'
];

const COUNTRY_MARKERS = [
  'deutschland',
  'oesterreich',
  'österreich',
  'schweiz',
  'polen',
  'niederlande',
  'spanien',
  'italien',
  'frankreich',
  'uk',
  'usa',
  'china',
  'tschechien'
];

const normalizeKey = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'und')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const shouldSkipLine = (line) => {
  const lower = line.toLowerCase();
  if (!line) return true;
  if (IGNORE_LINE_PREFIXES.some(prefix => lower.startsWith(prefix))) return true;
  if (lower.startsWith('händler') && lower.includes('kategorie')) return true;
  if (lower.includes('kategorie / unternehmen')) return true;
  if (lower.includes('kategorie / leistung')) return true;
  if (lower.includes('adresse/standort')) return true;
  if (lower.includes('telefon') && lower.includes('e‑mail')) return true;
  if (lower.startsWith('kategorie /')) return true;
  if (lower.startsWith('adresse /')) return true;
  if (lower.startsWith('beschreibung')) return true;
  if (lower.startsWith('preisabweichungen')) return true;
  if (line.length > 240 && !line.includes(' – ') && !line.includes(' - ')) return true;
  return false;
};

const isSectionHeading = (line) => {
  if (!line) return false;
  if (line.includes(' – ') || line.includes(' - ') || line.includes(' — ')) return false;
  if (/\d/.test(line)) return false;
  if (line.length > 160) return false;
  if (line.includes('@')) return false;
  if (line.includes(':')) return false;
  if (IGNORE_LINE_PREFIXES.some(prefix => line.toLowerCase().startsWith(prefix))) return false;
  return true;
};

const extractEmails = (text) => {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return matches ? Array.from(new Set(matches)) : [];
};

const extractPhones = (text) => {
  const matches = text.match(/\+?[0-9][0-9\s\-()/]{6,}[0-9]/g);
  return matches ? Array.from(new Set(matches.map(m => m.trim()))) : [];
};

const extractUrl = (text) => {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : null;
};

const extractLocation = (text) => {
  const lower = text.toLowerCase();
  const country = COUNTRY_MARKERS.find(marker => lower.includes(marker));
  if (country) return country.charAt(0).toUpperCase() + country.slice(1);
  const zipMatch = text.match(/\b\d{5}\s+[A-Za-zÄÖÜäöüß\- ]+/);
  if (zipMatch) return zipMatch[0].trim();
  return null;
};

const parseEntry = ({ line, section, sourceFile, defaultCategory }) => {
  const dashSplit = line.split(/\s[–-]\s/);
  let title = '';
  let details = '';

  if (dashSplit.length > 1) {
    title = dashSplit[0].trim();
    details = dashSplit.slice(1).join(' - ').trim();
  } else if (COMPANY_MARKERS.test(line)) {
    title = line.trim();
  } else {
    return null;
  }

  if (!title) return null;

  const titleClean = title.replace(/\s*\(([^)]+)\)\s*$/, '').trim();
  const sectionOverride = mapping.sectionTypeOverrides?.[section || ''];
  const type = sectionOverride || section || defaultCategory;

  const emailList = extractEmails(line);
  const phoneList = extractPhones(line);
  const url = extractUrl(line);
  const location = extractLocation(line);

  const tags = [];
  if (section) tags.push(section);
  tags.push('B2B_IMPORT');

  return {
    title: titleClean,
    category: defaultCategory,
    type,
    description: details || null,
    url,
    contactEmail: emailList[0] || null,
    contactInfo: {
      phones: phoneList,
      emails: emailList,
      sourceFile,
      sourceSection: section || null,
      raw: line
    },
    location,
    tags
  };
};

const mergeEntries = (existing, incoming) => {
  const merged = { ...existing };
  merged.description = merged.description || incoming.description;
  merged.url = merged.url || incoming.url;
  merged.contactEmail = merged.contactEmail || incoming.contactEmail;
  merged.location = merged.location || incoming.location;
  merged.type = merged.type || incoming.type;
  merged.category = merged.category || incoming.category;
  merged.tags = Array.from(new Set([...(merged.tags || []), ...(incoming.tags || [])]));

  const existingInfo = merged.contactInfo || {};
  const incomingInfo = incoming.contactInfo || {};
  merged.contactInfo = {
    ...existingInfo,
    ...incomingInfo,
    phones: Array.from(new Set([...(existingInfo.phones || []), ...(incomingInfo.phones || [])])),
    emails: Array.from(new Set([...(existingInfo.emails || []), ...(incomingInfo.emails || [])]))
  };

  return merged;
};

const loadFileEntries = (file) => {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Missing file: ${filePath}`);
    return [];
  }

  const defaultCategory = mapping.sourceDefaults?.[file]?.category || 'B2B_DIRECTORY';
  const ignoreSections = new Set(mapping.ignoreSections || []);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  let section = null;
  const entries = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t+/g, ' - ').trim();
    if (!line) continue;

    if (isSectionHeading(line)) {
      if (!ignoreSections.has(line)) {
        section = line;
      }
      continue;
    }

    if (shouldSkipLine(line)) continue;

    const entry = parseEntry({ line, section, sourceFile: file, defaultCategory });
    if (entry) entries.push(entry);
  }

  return entries;
};

const allEntries = SOURCE_FILES.flatMap(loadFileEntries);
const byKey = new Map();

for (const entry of allEntries) {
  const key = normalizeKey(entry.title);
  if (!key) continue;
  if (byKey.has(key)) {
    byKey.set(key, mergeEntries(byKey.get(key), entry));
  } else {
    byKey.set(key, entry);
  }
}

const output = Array.from(byKey.values());
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

console.log(`B2B parse complete. Entries: ${output.length}`);
console.log(`Output: ${OUTPUT_PATH}`);
