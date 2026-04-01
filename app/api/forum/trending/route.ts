import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CACHE_TTL_HOURS = 1;
const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=900',
};

type NormalizedPost = {
  id: string;
  content: string;
  category: string;
  likes: number;
  comments: number;
  created: Date;
};

const CACHE_KEY = 'forum:trends';

/**
 * Analyze trending topics from forum discussions
 * Uses AI to identify patterns and emerging themes
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === '1';
    
    // 1. Check DB Cache first
    if (!forceRefresh) {
      const cached = await prisma.systemCache.findUnique({
        where: { key: CACHE_KEY }
      });

      if (cached && cached.expiresAt && cached.expiresAt > new Date() && cached.value) {
        try {
          const data = JSON.parse(cached.value);
          return NextResponse.json(data, { 
            headers: { ...cacheHeaders, 'X-Cache': 'HIT-DB' } 
          });
        } catch (e) {
          console.error('Failed to parse cached trends:', e);
        }
      }
    }

    // 2. Prepare Data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPosts = await prisma.forumPost.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        id: true,
        content: true,
        category: true,
        likes: true,
        createdAt: true,
        _count: { select: { comments: true } },
      },
    });

    const normalized: NormalizedPost[] = recentPosts.map((post) => ({
      id: post.id,
      content: post.content || '',
      category: post.category || 'General',
      likes: post.likes || 0,
      comments: post._count.comments,
      created: post.createdAt,
    }));

    if (normalized.length === 0) {
      return NextResponse.json({
        topics: [],
        message: 'Nicht genug Daten für Trend-Analyse',
      });
    }

    const postsData = normalized.map(post => ({
      excerpt: post.content.slice(0, 400),
      category: post.category,
      likes: post.likes,
      comments: post.comments,
      created: post.created.toISOString(),
    }));

    // 3. Call AI
    const analysis = await callAI([
      {
        role: 'system',
        content: `Du bist ein Data Analyst für Community-Trends. Analysiere die Forum-Posts und identifiziere die TOP 5 Trending Topics.
        Antworte NUR mit JSON: { "topics": [{ "topic": string, "description": string, "heat": 0-100, "posts_count": number, "category": string }] }`,
      },
      {
        role: 'user',
        content: `Posts:\n${JSON.stringify(postsData)}`,
      },
    ], {
      temperature: 0.3,
      maxTokens: 1000,
    });

    let topics = [];
    try {
      const parsed = JSON.parse(extractJson(analysis.content || '') || '{}');
      topics = parsed.topics || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      topics = generateFallbackTrends(normalized);
    }

    const result = {
      topics,
      analyzed_posts: normalized.length,
      period: '30 days',
      provider: analysis.provider,
      generated_at: new Date().toISOString(),
    };

    // 4. Save to DB Cache
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    await prisma.systemCache.upsert({
      where: { key: CACHE_KEY },
      update: {
        value: JSON.stringify(result),
        expiresAt,
      },
      create: {
        key: CACHE_KEY,
        value: JSON.stringify(result),
        expiresAt,
      }
    });

    return NextResponse.json(result, { headers: cacheHeaders });
  } catch (error: any) {
    console.error('Trending topics error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze trends', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Simple category-based trending
 * Used if AI analysis fails
 */
function generateFallbackTrends(posts: NormalizedPost[]) {
  const categoryStats: Record<string, {
    count: number;
    likes: number;
    comments: number;
  }> = {};

  // Aggregate by category
  posts.forEach(post => {
    if (!categoryStats[post.category]) {
      categoryStats[post.category] = { count: 0, likes: 0, comments: 0 };
    }
    categoryStats[post.category].count++;
    categoryStats[post.category].likes += post.likes || 0;
    categoryStats[post.category].comments += post.comments || 0;
  });

  // Calculate heat and convert to topics
  return Object.entries(categoryStats)
    .map(([category, stats]) => {
      const heat = Math.min(
        100,
        (stats.count * 20) + (stats.likes * 5) + (stats.comments * 3)
      );
      return {
        topic: category,
        description: `Aktive Diskussionen in ${category}`,
        heat: Math.round(heat),
        posts_count: stats.count,
        category,
      };
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 5);
}

function extractJson(content: string) {
  const cleaned = content.replace(/```json|```/gi, '').trim();
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    return cleaned;
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : '';
}
