import * as cheerio from 'cheerio';
import { createHash } from 'crypto';

export interface SnapshotData {
  title: string;
  description: string;
  prices: number[];
  keywords: string[];
  headlines: string[];
  htmlLength: number;
}

export interface WatchdogResult {
  snapshot: SnapshotData;
  contentHash: string;
  priceHash: string;
  productHash: string;
}

export async function scanCompetitor(url: string): Promise<WatchdogResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ForgeBot/1.0; +https://stakeandscale.de)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Basic Metadata
    const title = $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content') || '';

    // 2. Extract Prices
    // Regex for €/$ prices (e.g. 19,99 €, €19.99, $19.99)
    const priceRegex = /([€$]\s?\d+[.,]\d{2})|(\d+[.,]\d{2}\s?[€$])/g;
    const bodyText = $('body').text();
    const priceMatches = bodyText.match(priceRegex) || [];
    const prices = priceMatches
      .map(p => parseFloat(p.replace(/[^\d.,]/g, '').replace(',', '.')))
      .filter(p => !isNaN(p) && p > 0 && p < 10000); // Filter anomalies

    const uniquePrices = Array.from(new Set(prices)).sort((a, b) => a - b);

    // 3. Extract Headlines & Product-like text
    const headlines: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 100) headlines.push(text);
    });

    // 4. Generate Hashes
    const contentHash = createHash('md5').update(headlines.join('|') + description).digest('hex');
    const priceHash = createHash('md5').update(uniquePrices.join(',')).digest('hex');
    const productHash = createHash('md5').update(headlines.slice(0, 10).join('|')).digest('hex'); // Top headlines often contain product names

    // 5. Detect Keywords (Simple frequency)
    const words = bodyText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordCounts: Record<string, number> = {};
    words.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
    const keywords = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([w]) => w);

    return {
      snapshot: {
        title,
        description,
        prices: uniquePrices,
        keywords,
        headlines,
        htmlLength: html.length
      },
      contentHash,
      priceHash,
      productHash
    };

  } catch (error) {
    console.error(`Watchdog scan failed for ${url}:`, error);
    throw error;
  }
}

export function compareSnapshots(oldSnap: SnapshotData, newSnap: SnapshotData): string | null {
  const changes: string[] = [];

  // Price Check
  if (oldSnap.prices.length > 0 && newSnap.prices.length > 0) {
    const oldAvg = oldSnap.prices.reduce((a, b) => a + b, 0) / oldSnap.prices.length;
    const newAvg = newSnap.prices.reduce((a, b) => a + b, 0) / newSnap.prices.length;
    
    if (Math.abs(newAvg - oldAvg) > (oldAvg * 0.05)) { // 5% diff
      const direction = newAvg > oldAvg ? 'gestiegen' : 'gesunken';
      const percent = Math.round(Math.abs((newAvg - oldAvg) / oldAvg) * 100);
      changes.push(`Durchschnittspreise sind um ${percent}% ${direction}.`);
    }
  }

  // Content Check
  if (oldSnap.title !== newSnap.title) {
    changes.push(`Titel geändert: "${newSnap.title}"`);
  }

  // Keywords (Campaign detection)
  const newKeywords = newSnap.keywords.filter(k => !oldSnap.keywords.includes(k));
  if (newKeywords.length > 0) {
    changes.push(`Neue Keywords erkannt: ${newKeywords.slice(0, 3).join(', ')}`);
  }

  if (changes.length === 0) return null;
  return changes.join(' ');
}
