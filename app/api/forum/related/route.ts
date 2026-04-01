import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Find related forum posts based on content similarity
 */
export async function POST(request: Request) {
  try {
    const { postId, content, category } = await request.json();

    if (!postId || !content) {
      return NextResponse.json({ error: 'Missing postId or content' }, { status: 400 });
    }

    // Get all posts
    const allPosts = await prisma.forumPost.findMany({
      where: { id: { not: postId } },
      select: {
        id: true,
        content: true,
        category: true,
        likes: true,
        createdAt: true,
        authorName: true
      }
    });

    // Extract keywords from current post
    const keywords = extractKeywords(content);

    // Calculate similarity scores
    const postsWithScores = allPosts
      .map(post => ({
        id: post.id,
        author: post.authorName,
        content: post.content,
        category: post.category,
        likes: post.likes,
        createdTime: post.createdAt.toISOString(),
        score: calculateSimilarity(keywords, post.content, post.category, category)
      }))
      .filter(post => post.score > 0.1) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 related posts

    return NextResponse.json(postsWithScores);

  } catch (error: any) {
    console.error('Related posts error:', error);
    return NextResponse.json(
      { error: 'Failed to find related posts', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Extract important keywords from text
 * Simple TF-IDF-like approach
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'der', 'die', 'das', 'und', 'oder', 'aber', 'ist', 'sind', 'war', 'waren',
    'ein', 'eine', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mit', 'auf',
    'für', 'von', 'zu', 'in', 'an', 'bei', 'aus', 'als', 'auch', 'kann', 'hat',
    'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'a', 'an', 'i', 'you'
  ]);

  // Tokenize and clean
  const words = text
    .toLowerCase()
    .replace(/[^\w\säöüß]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 3 && // Min 4 characters
      !stopWords.has(word) &&
      !/^\d+$/.test(word) // Not just numbers
    );

  // Count frequency
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Get top keywords (sorted by frequency)
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Calculate similarity between two posts
 * Returns score from 0 to 1
 */
function calculateSimilarity(
  keywords1: string[],
  content2: string,
  category2: string,
  category1?: string
): number {
  let score = 0;

  // Category match (bonus)
  if (category1 && category1 === category2) {
    score += 0.3;
  }

  // Keyword overlap
  const keywords2 = extractKeywords(content2);
  const overlap = keywords1.filter(k => keywords2.includes(k)).length;
  const maxKeywords = Math.max(keywords1.length, keywords2.length);

  if (maxKeywords > 0) {
    score += (overlap / maxKeywords) * 0.7;
  }

  return Math.min(score, 1);
}
