import crypto from 'crypto';
import type { LegalDocumentType } from '@/types/legal';
import { prisma } from '@/lib/prisma';

const LEGAL_CORPUS_VERSION = 'v1';
const LEGAL_CORPUS_INDEX_KEY = `legal-corpus:index:${LEGAL_CORPUS_VERSION}`;
const LEGAL_CORPUS_SOURCE_KEY_PREFIX = `legal-corpus:source:${LEGAL_CORPUS_VERSION}:`;
const FETCH_TIMEOUT_MS = 20000;
const FETCH_RETRY_TIMEOUT_MS = 35000;
const MAX_SOURCE_TEXT_CHARS = 80000;

export type LegalJurisdiction = 'DE' | 'EU';

export type LegalCorpusSourceDefinition = {
  id: string;
  title: string;
  url: string;
  jurisdiction: LegalJurisdiction;
  tags: string[];
  priority: number;
};

export type LegalCorpusSourceRecord = LegalCorpusSourceDefinition & {
  fetchedAt: string;
  statusCode: number;
  textLength: number;
  truncated: boolean;
  contentHash: string;
  text: string;
};

type LegalCorpusIndex = {
  version: string;
  syncedAt: string;
  successfulSources: number;
  failedSources: number;
  sourceIds: string[];
};

export type LegalCitation = {
  sourceId: string;
  title: string;
  url: string;
  jurisdiction: LegalJurisdiction;
  excerpt: string;
  score: number;
};

export type LegalGroundingResult = {
  context: string;
  citations: LegalCitation[];
  corpusVersion: string;
  lastSyncedAt?: string;
  sourceCount: number;
};

const LEGAL_CORPUS_SOURCES: LegalCorpusSourceDefinition[] = [
  {
    id: 'de-geschgehg',
    title: 'GeschGehG - Gesetz zum Schutz von Geschaeftsgeheimnissen',
    url: 'https://www.gesetze-im-internet.de/geschgehg/',
    jurisdiction: 'DE',
    tags: ['nda', 'geschaeftsgeheimnisse', 'vertraulichkeit', 'unterlassung'],
    priority: 100,
  },
  {
    id: 'de-bgb',
    title: 'BGB - Buergerliches Gesetzbuch',
    url: 'https://www.gesetze-im-internet.de/bgb/',
    jurisdiction: 'DE',
    tags: ['vertrag', 'schuldrecht', 'klauseln', 'kuendigung', 'haftung'],
    priority: 95,
  },
  {
    id: 'de-bdsg',
    title: 'BDSG - Bundesdatenschutzgesetz',
    url: 'https://www.gesetze-im-internet.de/bdsg_2018/',
    jurisdiction: 'DE',
    tags: ['datenschutz', 'personenbezogene-daten', 'verarbeitung', 'auftragsverarbeitung'],
    priority: 90,
  },
  {
    id: 'de-tdddg',
    title: 'TDDDG - Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz',
    url: 'https://www.gesetze-im-internet.de/tdddg/',
    jurisdiction: 'DE',
    tags: ['tracking', 'cookies', 'digitale-dienste', 'datenschutz'],
    priority: 70,
  },
  {
    id: 'eu-gdpr-eli',
    title: 'DSGVO / GDPR - Regulation (EU) 2016/679',
    url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    jurisdiction: 'EU',
    tags: ['gdpr', 'dsgvo', 'datenschutz', 'personenbezogene-daten', 'privacy'],
    priority: 96,
  },
  {
    id: 'eu-ai-act-eli',
    title: 'EU AI Act - Regulation (EU) 2024/1689',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    jurisdiction: 'EU',
    tags: ['ai-act', 'ki-verordnung', 'compliance', 'risk-management'],
    priority: 60,
  },
  {
    id: 'de-aktualitaetendienst',
    title: 'Gesetze im Internet - Aktualitaetendienst',
    url: 'https://www.gesetze-im-internet.de/aktuDienst.html',
    jurisdiction: 'DE',
    tags: ['aenderungen', 'gesetzesupdates', 'rechtsstand'],
    priority: 55,
  },
];

const DOCUMENT_KEYWORDS: Record<LegalDocumentType, string[]> = {
  NDA: [
    'geheimhaltung',
    'vertraulichkeit',
    'geschaeftsgeheimnis',
    'offenlegung',
    'rueckgabe',
    'vertragsstrafe',
    'unterlassung',
    'datenschutz',
  ],
  SERVICE_AGREEMENT: ['leistungsumfang', 'vergutung', 'haftung', 'gewaehrleistung', 'kuendigung'],
  PARTNERSHIP: ['kooperation', 'gewinn', 'verlust', 'verantwortlichkeit', 'laufzeit', 'kuendigung'],
  SUPPLIER_CONTRACT: ['lieferung', 'qualitaet', 'mangel', 'haftung', 'preise', 'moq'],
  EMPLOYMENT: ['arbeitszeit', 'urlaub', 'kuendigungsfrist', 'arbeitsvertrag', 'arbeitsrecht'],
  CUSTOM: ['vertrag', 'klausel', 'haftung', 'kuendigung', 'datenschutz'],
};

const DOCUMENT_SOURCE_BOOST: Record<LegalDocumentType, Record<string, number>> = {
  NDA: {
    'de-geschgehg': 30,
    'de-bgb': 20,
    'eu-gdpr-eli': 12,
    'de-bdsg': 10,
  },
  SERVICE_AGREEMENT: {
    'de-bgb': 25,
    'de-bdsg': 10,
    'eu-gdpr-eli': 10,
  },
  PARTNERSHIP: {
    'de-bgb': 25,
    'eu-gdpr-eli': 10,
  },
  SUPPLIER_CONTRACT: {
    'de-bgb': 25,
    'de-bdsg': 10,
    'eu-gdpr-eli': 8,
  },
  EMPLOYMENT: {
    'de-bgb': 25,
    'de-bdsg': 10,
  },
  CUSTOM: {
    'de-bgb': 20,
    'eu-gdpr-eli': 8,
  },
};

const sourceKey = (sourceId: string) => `${LEGAL_CORPUS_SOURCE_KEY_PREFIX}${sourceId}`;

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const normalizeWhitespace = (value: string) =>
  value
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

const stripHtml = (value: string) => {
  const withoutScripts = value
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ');

  const withLineBreaks = withoutScripts
    .replace(/<\/(p|div|section|article|li|h\d|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>/gi, ' ');

  const textOnly = withLineBreaks.replace(/<[^>]*>/g, ' ');
  return normalizeWhitespace(decodeHtmlEntities(textOnly));
};

const tokenize = (value: string): string[] => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9äöüß\- ]+/g, ' ');
  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  return Array.from(new Set(tokens));
};

const safeParseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const withTimeout = async (url: string, timeoutMs: number, init?: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'user-agent':
          (init?.headers as Record<string, string> | undefined)?.['user-agent'] ||
          'Mozilla/5.0 (compatible; the-forge-legal-corpus-bot/1.0; +https://www.stakeandscale.de)',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
        'cache-control': 'no-cache',
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const fetchSource = async (
  source: LegalCorpusSourceDefinition,
  timeoutMs: number,
  userAgent?: string
): Promise<LegalCorpusSourceRecord> => {
  const response = await withTimeout(source.url, timeoutMs, {
    headers: userAgent ? { 'user-agent': userAgent } : undefined,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const raw = await response.text();
  const normalizedText = stripHtml(raw);
  if (normalizedText.length < 300) {
    throw new Error('Response text too short');
  }
  const truncatedText = normalizedText.slice(0, MAX_SOURCE_TEXT_CHARS);
  const contentHash = crypto.createHash('sha256').update(truncatedText).digest('hex');

  return {
    ...source,
    fetchedAt: new Date().toISOString(),
    statusCode: response.status,
    textLength: truncatedText.length,
    truncated: normalizedText.length > MAX_SOURCE_TEXT_CHARS,
    contentHash,
    text: truncatedText,
  };
};

const fetchSourceWithRetry = async (source: LegalCorpusSourceDefinition): Promise<LegalCorpusSourceRecord> => {
  const attempts: Array<{ timeoutMs: number; userAgent?: string }> = [
    { timeoutMs: FETCH_TIMEOUT_MS },
    {
      timeoutMs: FETCH_RETRY_TIMEOUT_MS,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    },
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return await fetchSource(source, attempt.timeoutMs, attempt.userAgent);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

const readIndex = async (): Promise<LegalCorpusIndex | null> => {
  const row = await prisma.systemCache.findUnique({ where: { key: LEGAL_CORPUS_INDEX_KEY } });
  return safeParseJson<LegalCorpusIndex>(row?.value ?? null);
};

const writeIndex = async (value: LegalCorpusIndex) => {
  await prisma.systemCache.upsert({
    where: { key: LEGAL_CORPUS_INDEX_KEY },
    update: { value: JSON.stringify(value), expiresAt: null },
    create: { key: LEGAL_CORPUS_INDEX_KEY, value: JSON.stringify(value), expiresAt: null },
  });
};

const writeSourceRecord = async (record: LegalCorpusSourceRecord) => {
  await prisma.systemCache.upsert({
    where: { key: sourceKey(record.id) },
    update: { value: JSON.stringify(record), expiresAt: null },
    create: { key: sourceKey(record.id), value: JSON.stringify(record), expiresAt: null },
  });
};

const readSourceRecord = async (sourceId: string): Promise<LegalCorpusSourceRecord | null> => {
  const row = await prisma.systemCache.findUnique({ where: { key: sourceKey(sourceId) } });
  return safeParseJson<LegalCorpusSourceRecord>(row?.value ?? null);
};

const scoreSource = (record: LegalCorpusSourceRecord, terms: string[]) => {
  const title = record.title.toLowerCase();
  const tags = record.tags.join(' ').toLowerCase();
  const text = record.text.toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 7;
    if (tags.includes(term)) score += 4;
    const matches = text.split(term).length - 1;
    if (matches > 0) score += Math.min(matches, 12);
  }

  score += Math.round(record.priority / 20);
  return score;
};

const buildExcerpt = (text: string, terms: string[], maxChars = 850) => {
  if (!text) return '';
  const lower = text.toLowerCase();

  let bestIdx = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx === -1) {
    return text.slice(0, maxChars).trim();
  }

  const start = Math.max(0, bestIdx - 260);
  const end = Math.min(text.length, bestIdx + maxChars - 120);
  return text.slice(start, end).trim();
};

const fallbackCitationsForType = (documentType: LegalDocumentType): LegalCitation[] => {
  const fallbackByType: Record<LegalDocumentType, string[]> = {
    NDA: ['de-geschgehg', 'de-bgb', 'eu-gdpr-eli'],
    SERVICE_AGREEMENT: ['de-bgb', 'eu-gdpr-eli', 'de-bdsg'],
    PARTNERSHIP: ['de-bgb', 'eu-gdpr-eli'],
    SUPPLIER_CONTRACT: ['de-bgb', 'de-bdsg', 'eu-gdpr-eli'],
    EMPLOYMENT: ['de-bgb', 'de-bdsg'],
    CUSTOM: ['de-bgb', 'eu-gdpr-eli'],
  };

  const ids = fallbackByType[documentType];
  return ids
    .map((id) => LEGAL_CORPUS_SOURCES.find((source) => source.id === id))
    .filter((source): source is LegalCorpusSourceDefinition => Boolean(source))
    .map((source) => ({
      sourceId: source.id,
      title: source.title,
      url: source.url,
      jurisdiction: source.jurisdiction,
      excerpt: 'Quelle vorhanden. Bitte Korpus-Sync ausfuehren, um konkrete Auszuege zu laden.',
      score: 1,
    }));
};

const buildContextFromCitations = (citations: LegalCitation[], syncedAt?: string) => {
  const header = [
    'Nutze die folgenden Rechtsquellen als Arbeitsgrundlage fuer DE/EU-konforme Vertragsentwuerfe.',
    syncedAt ? `Korpus-Stand: ${syncedAt}` : 'Korpus-Stand: unbekannt (Sync empfohlen).',
  ].join('\n');

  const blocks = citations.map((citation, index) => {
    const excerpt = citation.excerpt.length > 900 ? `${citation.excerpt.slice(0, 900)}...` : citation.excerpt;
    return [
      `[${index + 1}] ${citation.title} (${citation.jurisdiction})`,
      citation.url,
      `Auszug: ${excerpt}`,
    ].join('\n');
  });

  return [header, ...blocks].join('\n\n');
};

export async function syncLegalCorpus(options?: { force?: boolean }) {
  const startedAt = Date.now();
  const currentIndex = await readIndex();

  if (!options?.force && currentIndex?.syncedAt) {
    const elapsedMs = Date.now() - Date.parse(currentIndex.syncedAt);
    if (Number.isFinite(elapsedMs) && elapsedMs < 1000 * 60 * 60 * 12) {
      return {
        success: true,
        skipped: true,
        reason: 'Recently synced (<12h)',
        ...currentIndex,
      };
    }
  }

  const sortedSources = [...LEGAL_CORPUS_SOURCES].sort((a, b) => b.priority - a.priority);
  const sourceResults = await Promise.all(
    sortedSources.map(async (source) => {
      const existing = await readSourceRecord(source.id);
      try {
        const record = await fetchSourceWithRetry(source);
        await writeSourceRecord(record);
        return {
          sourceId: source.id,
          status: 'fresh' as const,
        };
      } catch (error) {
        if (existing) {
          return {
            sourceId: source.id,
            status: 'stale' as const,
            error: error instanceof Error ? error.message : String(error),
          };
        }
        return {
          sourceId: source.id,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  const successfulSources = sourceResults.filter((result) => result.status !== 'failed').length;
  const failedSources = sourceResults.filter((result) => result.status === 'failed').length;
  const sourceIds = sourceResults
    .filter((result) => result.status !== 'failed')
    .map((result) => result.sourceId);
  const failures = sourceResults
    .filter((result) => result.status === 'failed')
    .map((result) => ({ sourceId: result.sourceId, error: result.error || 'Unknown error' }));
  const staleFallbacks = sourceResults
    .filter((result) => result.status === 'stale')
    .map((result) => ({ sourceId: result.sourceId, error: result.error || 'Unknown error' }));

  const nextIndex: LegalCorpusIndex = {
    version: LEGAL_CORPUS_VERSION,
    syncedAt: new Date().toISOString(),
    successfulSources,
    failedSources,
    sourceIds,
  };
  await writeIndex(nextIndex);

  return {
    success: true,
    skipped: false,
    durationMs: Date.now() - startedAt,
    ...nextIndex,
    failures,
    staleFallbacks,
  };
}

export async function getLegalGroundingForContract(params: {
  documentType: LegalDocumentType;
  additionalInstructions?: string;
  contractTerms?: unknown;
  maxSources?: number;
}): Promise<LegalGroundingResult> {
  const { documentType, additionalInstructions, contractTerms, maxSources = 4 } = params;
  const documentTerms = DOCUMENT_KEYWORDS[documentType] || [];
  const instructionText = additionalInstructions || '';
  const contractTermsText = contractTerms ? JSON.stringify(contractTerms) : '';
  const queryTerms = tokenize(`${documentTerms.join(' ')} ${instructionText} ${contractTermsText}`);

  const index = await readIndex();
  const sourceIds = index?.sourceIds?.length ? index.sourceIds : LEGAL_CORPUS_SOURCES.map((source) => source.id);

  const loadedRecords = await Promise.all(sourceIds.map((sourceId) => readSourceRecord(sourceId)));
  const records = loadedRecords.filter((record): record is LegalCorpusSourceRecord => Boolean(record));

  if (records.length === 0) {
    const fallbackCitations = fallbackCitationsForType(documentType).slice(0, maxSources);
    return {
      context: buildContextFromCitations(fallbackCitations),
      citations: fallbackCitations,
      corpusVersion: LEGAL_CORPUS_VERSION,
      sourceCount: 0,
    };
  }

  const ranked = records
    .map((record) => ({
      record,
      score:
        scoreSource(record, queryTerms) +
        (DOCUMENT_SOURCE_BOOST[documentType]?.[record.id] || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSources)
    .map(({ record, score }) => ({
      sourceId: record.id,
      title: record.title,
      url: record.url,
      jurisdiction: record.jurisdiction,
      excerpt: buildExcerpt(record.text, queryTerms),
      score,
    }));

  return {
    context: buildContextFromCitations(ranked, index?.syncedAt),
    citations: ranked,
    corpusVersion: index?.version || LEGAL_CORPUS_VERSION,
    lastSyncedAt: index?.syncedAt,
    sourceCount: records.length,
  };
}

export async function getLegalCorpusStatus() {
  const index = await readIndex();
  if (!index) {
    return {
      configuredSources: LEGAL_CORPUS_SOURCES.length,
      synced: false,
      corpusVersion: LEGAL_CORPUS_VERSION,
    };
  }

  return {
    configuredSources: LEGAL_CORPUS_SOURCES.length,
    synced: true,
    corpusVersion: index.version,
    syncedAt: index.syncedAt,
    successfulSources: index.successfulSources,
    failedSources: index.failedSources,
  };
}
