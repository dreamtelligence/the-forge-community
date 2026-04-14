/**
 * Daily AI News Cron Job
 *
 * Schedule: Daily at 08:00 (configured in vercel.json, UTC by default)
 *
 * - Fetches AI news via Brave Search
 * - Summarizes with AI (German, bold tone)
 * - Posts to Forum category "AI News"
 * - Skips posting if nothing important has happened
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { braveSearch } from '@/lib/ai/research-core';
import { callAI } from '@/lib/ai';

export const maxDuration = 60;

const CATEGORY = 'AI News';
const AUTHOR_NAME = 'Orion Daily';
const BERLIN_TZ = 'Europe/Berlin';
const MAX_AGE_HOURS = 168;
const ALLOWED_DOMAINS = [
  'openai.com',
  'mistral.ai',
  'cohere.com',
  'stability.ai',
  'huggingface.co',
  'anthropic.com',
  'ai.google.dev',
  'blog.google',
  'deepmind.google',
  'deepmind.googleblog.com',
  'research.google',
  'cloud.google.com',
  'developers.google.com',
  'meta.com',
  'about.meta.com',
  'ai.facebook.com',
  'research.facebook.com',
  'microsoft.com',
  'azure.microsoft.com',
  'nvidia.com',
  'x.ai',
  'arxiv.org',
  'cnbc.com',
  'reuters.com',
  'techcrunch.com',
  'theverge.com',
  'venturebeat.com',
  'arstechnica.com',
  'wired.com',
  'semafor.com',
  'bloomberg.com',
  'ft.com',
  'zdnet.com'
];
const PRIMARY_SEARCH_QUERY = [
  'AI news new model release',
  'OpenAI Anthropic Google DeepMind Meta Llama Mistral xAI model',
  'AI safety policy regulation model release',
  'AI research paper breakthrough',
  'AI agent tool release'
].join(' ');
const OFFICIAL_SOURCE_QUERIES = [
  'site:openai.com OpenAI model release OR research OR launch',
  'site:anthropic.com Claude model release OR research OR launch',
  'site:ai.google.dev Gemini release OR model OR launch',
  'site:deepmind.google DeepMind Gemini research OR launch',
  'site:about.meta.com Meta Llama AI release OR research',
  'site:x.ai Grok model release OR launch',
  'site:mistral.ai Mistral model release OR launch',
  'site:cohere.com Cohere model release OR launch',
  'site:huggingface.co Hugging Face release OR research',
  'site:nvidia.com AI model release OR research',
  'site:microsoft.com Copilot AI model release OR research'
];

const getBerlinParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('de-DE', {
    timeZone: BERLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour)
  };
};

const buildContext = (items: Array<{ title: string; url: string; snippet: string; published?: string | null }>) =>
  items
    .map((item, index) => {
      const published = item.published ? ` (${item.published})` : '';
      return `[${index + 1}] ${item.title}${published}\n${item.url}\n${item.snippet}`.trim();
    })
    .join('\n\n');

const runSearchQueries = async (queries: string[], count: number) => {
  const settled = await Promise.allSettled(queries.map((query) => braveSearch(query, count)));
  const successful = settled.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof braveSearch>>> =>
      result.status === 'fulfilled'
  );

  if (successful.length === 0) {
    const firstFailure = settled.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    throw firstFailure?.reason ?? new Error('Brave Search returned no results');
  }

  return successful.flatMap((result) => result.value.results || []);
};

const parseJson = (value: string) => {
  if (!value) return null;
  const trimmed = value
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    // Try minimal repair for trailing commas
    const repaired = candidate
      .replace(/,(\s*})/g, '$1')
      .replace(/,(\s*])/g, '$1');
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
};

const isAllowedSource = (url: string) => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const parseAgeToHours = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();

  // Relative formats (e.g. "2 hours ago", "3 days ago")
  const match = trimmed.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount)) return null;
    switch (unit) {
      case 'minute':
        return amount / 60;
      case 'hour':
        return amount;
      case 'day':
        return amount * 24;
      case 'week':
        return amount * 24 * 7;
      case 'month':
        return amount * 24 * 30;
      case 'year':
        return amount * 24 * 365;
      default:
        return null;
    }
  }

  // Absolute date strings
  const timestamp = Date.parse(trimmed);
  if (!Number.isNaN(timestamp)) {
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return 0;
    return diffMs / (1000 * 60 * 60);
  }

  return null;
};

const isRecent = (published?: string | null, maxHours = MAX_AGE_HOURS) => {
  const hours = parseAgeToHours(published);
  if (hours === null) return false;
  return hours <= maxHours;
};

const stripHtml = (value: string) => {
  if (!value) return value;
  return value.replace(/<[^>]*>/g, '').trim();
};

const filterNewsResults = (
  rawResults: Array<{ title: string; url: string; snippet: string; published?: string | null }>,
  recentUrls: Set<string>
) => {
  const dedupe = new Set<string>();

  return rawResults.filter((item) => {
    if (!item?.url) return false;
    if (!isAllowedSource(item.url)) return false;
    if (!isRecent(item.published, MAX_AGE_HOURS)) return false;
    if (recentUrls.has(item.url)) return false;
    if (dedupe.has(item.url)) return false;
    dedupe.add(item.url);
    return true;
  });
};

const buildFallbackPost = (items: Array<{ title: string; url: string; snippet: string }>) => {
  const top = items.slice(0, 5);
  const body = top
    .map((item, index) => {
      const title = stripHtml(item.title?.trim() || 'News');
      const snippet = stripHtml(item.snippet?.trim() || '');
      const source = `[${index + 1}] ${item.url}`;
      return `### ${title}\n${snippet}\n${source}`.trim();
    })
    .join('\n\n');

  return {
    title: 'Daily AI News (Fallback)',
    body: `Kurzüberblick (Auto-Fallback, weil die AI-Antwort nicht parsebar war).\n\n${body}`
  };
};

const proofreadGermanNewsPost = async (title: string, body: string) => {
  const proofread = await callAI([
    {
      role: 'system',
      content: `Du bist ein deutscher Schlussredakteur für AI-News.
Korrigiere ausschließlich Rechtschreibung, Grammatik, Zeichensetzung und unnatürliche Formulierungen.
Erhalte Ton, Aussage, Struktur, Markdown, Zitate, Quellenmarkierungen wie [1] und alle URLs exakt.
Nutze Umlaute und ß nur dort, wo sie sprachlich korrekt sind.
Verändere keine Eigennamen, Produktnamen oder Fakten.
Gib NUR gültiges JSON zurück:
{
  "title": string,
  "body": string
}`
    },
    {
      role: 'user',
      content: JSON.stringify({ title, body })
    }
  ], { maxTokens: 1600, temperature: 0 });

  const parsed = parseJson(proofread.content);
  if (!parsed) {
    return { title, body };
  }

  return {
    title: String(parsed.title || title).trim(),
    body: String(parsed.body || body).trim(),
  };
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const forceRun = searchParams.get('force') === '1';

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Unauthorized AI news attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date: berlinDate, hour: berlinHour } = getBerlinParts();

    if (!forceRun && berlinHour !== 8) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Outside Berlin schedule (${berlinHour}:00)`
      });
    }

    const recentPosts = await prisma.forumPost.findMany({
      where: { category: CATEGORY },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, content: true, createdAt: true }
    });
    const lastPost = recentPosts[0] ?? null;

    if (!forceRun && lastPost) {
      const lastPostBerlin = getBerlinParts(lastPost.createdAt);
      if (lastPostBerlin.date === berlinDate) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'Already posted today'
        });
      }
    }

    const rawResults = await runSearchQueries([PRIMARY_SEARCH_QUERY], 12);

    const recentUrls = new Set<string>();
    for (const post of recentPosts) {
      const matches = post.content.match(/https?:\/\/[^\s)]+/g) || [];
      for (const match of matches) {
        recentUrls.add(match);
      }
    }

    let results = filterNewsResults(rawResults, recentUrls);

    if (results.length === 0) {
      const officialRawResults = await runSearchQueries(OFFICIAL_SOURCE_QUERIES, 4);
      results = filterNewsResults(officialRawResults, recentUrls);
    }

    if (results.length === 0) {
      console.info('[Cron] AI news skipped after source filtering', {
        rawResults: rawResults.length,
        allowedDomains: ALLOWED_DOMAINS.length,
        maxAgeHours: MAX_AGE_HOURS,
      });
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No allowed recent sources'
      });
    }

    const context = buildContext(results);

    const systemPrompt = `Du bist Orion Daily, ein frecher, junger, mutiger AI-News-Host.
Schreibe idiomatisches, korrektes Deutsch mit natürlicher Rechtschreibung.
Nutze Umlaute und ß nur dort, wo sie sprachlich korrekt sind. Erfinde keine Umlaute in Wörtern wie "neu", "Steuerung" oder "Freude".
Entscheide selbst, ob heute eine kurze News reicht oder ein längerer Report nötig ist.
Wenn die Newslage schwach ist oder nichts Wichtiges passiert ist, setze hasImportant=false.
Wenn du postest: Ziel ist ca. 5 Minuten Lesezeit, aber nur wenn genug Material da ist.
Format: Markdown, klare Sections, knackige Headlines.
Am Ende eine kompakte Quellenliste mit [1], [2]... und URLs.
`;

    const userPrompt = `NEWS-QUELLEN:\n${context}\n\nLETZTER POST (falls vorhanden):\n${lastPost?.content ?? '---'}\n\nLiefere JSON mit Feldern:\n{
  "hasImportant": boolean,
  "title": string,
  "body": string,
  "reason": string
}\n\nNur JSON ausgeben.`;

    const ai = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 1400, temperature: 0.4 });

    let parsed = parseJson(ai.content);

    if (!parsed) {
      const repairSystem = `Du bist ein JSON-Repair-Bot. Gib NUR gültiges JSON zurück.
Schema:
{
  "hasImportant": boolean,
  "title": string,
  "body": string,
  "reason": string
}
Wenn Informationen fehlen oder unklar sind, setze hasImportant=false und erkläre kurz den Grund in reason.
Kein Markdown, keine Codeblocks.`;

      const repair = await callAI([
        { role: 'system', content: repairSystem },
        { role: 'user', content: `Antwort reparieren:\n${ai.content}` }
      ], { maxTokens: 500, temperature: 0 });

      parsed = parseJson(repair.content);
    }

    if (parsed && typeof parsed.hasImportant === 'string') {
      parsed.hasImportant = parsed.hasImportant.toLowerCase() === 'true';
    }

    if (!parsed || typeof parsed.hasImportant !== 'boolean') {
      const fallback = buildFallbackPost(results);
      const content = `# ${fallback.title}\n\n${fallback.body}`.trim();
      const post = await prisma.forumPost.create({
        data: {
          authorName: AUTHOR_NAME,
          founderNumber: 0,
          content,
          category: CATEGORY
        },
        select: { id: true, createdAt: true }
      });

      return NextResponse.json({
        success: true,
        postId: post.id,
        createdAt: post.createdAt,
        fallback: true
      });
    }

    if (!parsed.hasImportant) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: parsed.reason || 'No important updates'
      });
    }

    const draftedTitle = String(parsed.title || 'Daily AI News').trim();
    const draftedBody = String(parsed.body || '').trim();
    const proofread = await proofreadGermanNewsPost(draftedTitle, draftedBody);
    const title = proofread.title || draftedTitle;
    const body = proofread.body || draftedBody;

    if (!body) {
      const fallback = buildFallbackPost(results);
      const content = `# ${fallback.title}\n\n${fallback.body}`.trim();
      const post = await prisma.forumPost.create({
        data: {
          authorName: AUTHOR_NAME,
          founderNumber: 0,
          content,
          category: CATEGORY
        },
        select: { id: true, createdAt: true }
      });

      return NextResponse.json({
        success: true,
        postId: post.id,
        createdAt: post.createdAt,
        fallback: true
      });
    }

    const content = `# ${title}\n\n${body}`.trim();

    const post = await prisma.forumPost.create({
      data: {
        authorName: AUTHOR_NAME,
        founderNumber: 0,
        content,
        category: CATEGORY
      },
      select: { id: true, createdAt: true }
    });

    return NextResponse.json({
      success: true,
      postId: post.id,
      createdAt: post.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Cron] AI news failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
