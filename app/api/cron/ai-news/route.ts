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
import { prisma } from '@/lib/prisma';
import { braveSearch } from '@/lib/research';
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
  'arxiv.org'
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

const enforceUmlauts = (value: string) => {
  if (!value) return value;
  const urls: string[] = [];
  const withoutUrls = value.replace(/https?:\/\/[^\s)]+/g, (match) => {
    const id = urls.length;
    urls.push(match);
    return `__URL_${id}__`;
  });

  let output = withoutUrls
    .replace(/AE/g, 'Ä')
    .replace(/OE/g, 'Ö')
    .replace(/UE/g, 'Ü')
    .replace(/Ae/g, 'Ä')
    .replace(/Oe/g, 'Ö')
    .replace(/Ue/g, 'Ü')
    .replace(/ae/g, 'ä')
    .replace(/oe/g, 'ö')
    .replace(/ue/g, 'ü');

  output = output.replace(/__URL_(\d+)__/g, (match, id) => urls[Number(id)] ?? match);
  return output;
};

const stripHtml = (value: string) => {
  if (!value) return value;
  return value.replace(/<[^>]*>/g, '').trim();
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

    const query = [
      'AI news new model release',
      'OpenAI Anthropic Google DeepMind Meta Llama Mistral xAI model',
      'AI safety policy regulation model release',
      'AI research paper breakthrough',
      'AI agent tool release'
    ].join(' ');

    const search = await braveSearch(query, 12);
    const rawResults = search.results || [];

    const recentUrls = new Set<string>();
    for (const post of recentPosts) {
      const matches = post.content.match(/https?:\/\/[^\s)]+/g) || [];
      for (const match of matches) {
        recentUrls.add(match);
      }
    }

    const dedupe = new Set<string>();
    const results = rawResults.filter((item) => {
      if (!item?.url) return false;
      if (!isAllowedSource(item.url)) return false;
      if (!isRecent(item.published, MAX_AGE_HOURS)) return false;
      if (recentUrls.has(item.url)) return false;
      if (dedupe.has(item.url)) return false;
      dedupe.add(item.url);
      return true;
    });

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No allowed recent sources'
      });
    }

    const context = buildContext(results);

    const systemPrompt = `Du bist Orion Daily, ein frecher, junger, mutiger AI-News-Host.
Schreibe auf Deutsch. Verwende KEINE ue/oe/ae Schreibweise; nutze Umlaute oder umschreibe.
Entscheide selbst, ob heute eine kurze News reicht oder ein laengerer Report noetig ist.
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
      const content = `# ${enforceUmlauts(fallback.title)}\n\n${enforceUmlauts(fallback.body)}`.trim();
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

    const title = enforceUmlauts(String(parsed.title || 'Daily AI News').trim());
    const body = enforceUmlauts(String(parsed.body || '').trim());

    if (!body) {
      const fallback = buildFallbackPost(results);
      const content = `# ${enforceUmlauts(fallback.title)}\n\n${enforceUmlauts(fallback.body)}`.trim();
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
