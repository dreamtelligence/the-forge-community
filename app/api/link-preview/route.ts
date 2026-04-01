import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callAI } from '@/lib/ai';
import * as cheerio from 'cheerio';

export const maxDuration = 30;

/**
 * Fetch Link Preview with OpenGraph metadata + AI summary
 */
export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Check cache (7 days expiry)
    const cached = await prisma.linkPreview.findUnique({
      where: { url: validUrl.href }
    });

    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return NextResponse.json(cached);
    }

    // Fetch page
    const response = await fetch(validUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ForgeBot/1.0; +https://stakeandscale.de)'
      },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract OpenGraph & Twitter Card metadata
    const metadata = {
      title:
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        'Untitled',

      description:
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '',

      image:
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '',

      siteName:
        $('meta[property="og:site_name"]').attr('content') ||
        validUrl.hostname
    };

    // Generate AI summary (only if we have description)
    let aiSummary = '';
    if (metadata.description) {
      try {
        const summaryResult = await callAI([
          {
            role: 'system',
            content: 'Du bist ein präziser Content-Summarizer. Fasse den folgenden Website-Inhalt in EINEM Satz zusammen (max 100 Zeichen). Nur der Kern, kein Fluff.'
          },
          {
            role: 'user',
            content: `Titel: ${metadata.title}\n\nBeschreibung: ${metadata.description}`
          }
        ], { temperature: 0.3, maxTokens: 50 });

        aiSummary = summaryResult.content.trim();
      } catch (error) {
        console.error('AI summary failed:', error);
        // Continue without AI summary
      }
    }

    // Save to DB (cache for 7 days)
    const preview = await prisma.linkPreview.upsert({
      where: { url: validUrl.href },
      create: {
        url: validUrl.href,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        siteName: metadata.siteName,
        aiSummary,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      update: {
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        siteName: metadata.siteName,
        aiSummary,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return NextResponse.json(preview);

  } catch (error: any) {
    console.error('Link preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: error.message },
      { status: 500 }
    );
  }
}
