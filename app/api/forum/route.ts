import { NextResponse } from 'next/server';
import type { ModerationPolicy } from '@/lib/security/moderation';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { ensureProfileSlug } from '@/lib/user/profile';
import { assignFounderNumberIfMissing } from '@/lib/user/founder-number';
import { syncUserAchievements } from '@/lib/user/achievements';
import { RateLimiters } from '@/lib/security/rate-limit';
import { getForumFeed } from '@/lib/forum/feed';
import { createForumJsonResponse } from '@/lib/forum/performance';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const routeStart = performance.now();
  const session = await auth();
  const afterAuth = performance.now();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'new'; // 'new', 'top', 'hot'

  try {
    const feedStart = performance.now();
    const feed = await getForumFeed({
      viewerEmail: session?.user?.email || null,
      cursor,
      limit,
      category,
      sort,
      commentsMode: 'preview',
      previewRootComments: 1,
    });
    const afterFeed = performance.now();

    return createForumJsonResponse(feed, {
      route: '/api/forum',
      durationMs: afterFeed - routeStart,
      steps: [
        { name: 'auth', durationMs: afterAuth - routeStart },
        { name: 'feed', durationMs: afterFeed - feedStart },
      ],
      details: {
        itemCount: feed.items.length,
        hasNextCursor: Boolean(feed.nextCursor),
        category: category || 'All',
        sort,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return createForumJsonResponse(
      { error: 'Failed to fetch forum posts' },
      {
        route: '/api/forum',
        status: 500,
        durationMs: performance.now() - routeStart,
        steps: [{ name: 'auth', durationMs: afterAuth - routeStart }],
        details: {
          category: category || 'All',
          sort,
          limit,
        },
      }
    );
  }
}

export async function POST(request: Request) {
  const rateLimitResponse = await RateLimiters.forumPost(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, category } = body;

    if (!content || !category) {
      return NextResponse.json({ error: 'Missing content or category' }, { status: 400 });
    }

    const trimmedContent = String(content).trim();
    if (trimmedContent.length < 2) {
      return NextResponse.json({ error: 'Content too short' }, { status: 400 });
    }
    if (trimmedContent.length > 8000) {
      return NextResponse.json({ error: 'Content too long' }, { status: 400 });
    }
    if (typeof category !== 'string' || category.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // AI MODERATION CHECK
    const {
      moderateContent,
      issueWarning,
      canUserPost,
      sanitizeToxicContent,
      shouldBlockContent,
      shouldSanitizeContent
    } = await import('@/lib/security/moderation');
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, founderNumber: true, profileSlug: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is allowed to post
    const postCheck = await canUserPost(user.id);
    if (!postCheck.allowed) {
      return NextResponse.json({
        error: 'Posting restricted',
        reason: postCheck.reason
      }, { status: 403 });
    }

    // Run toxicity check
    const moderationResult = await moderateContent(trimmedContent);
    let finalContent = trimmedContent;

    const forumPolicy: ModerationPolicy = {
      minConfidence: 0.75,
      blockSeverities: ['MEDIUM', 'HIGH'],
      blockCategories: ['HARASSMENT', 'HATE_SPEECH', 'VIOLENCE'],
      requireTargeted: true,
      allowSanitize: true,
      sanitizeSeverities: ['MEDIUM'],
      sanitizeCategories: ['HARASSMENT', 'HATE_SPEECH']
    };

    const shouldBlock = shouldBlockContent(trimmedContent, moderationResult, forumPolicy);
    const shouldSanitize = shouldSanitizeContent(trimmedContent, moderationResult, forumPolicy);

    if (shouldBlock || shouldSanitize) {
      const warningResult = await issueWarning(user.id, trimmedContent, moderationResult);

      if (warningResult.shouldBan || shouldBlock) {
        return NextResponse.json({
          error: 'Content violates community guidelines',
          warning: {
            number: warningResult.warningNumber,
            message: warningResult.message,
            banned: warningResult.shouldBan
          }
        }, { status: 400 });
      }

      finalContent = await sanitizeToxicContent(trimmedContent, moderationResult);
    }

    const founderNumber = await assignFounderNumberIfMissing(user.id);
    await ensureProfileSlug({
      id: user.id,
      name: user.name,
      founderNumber,
      profileSlug: user.profileSlug,
    });

    // Erstelle den Post
    const response = await prisma.forumPost.create({
      data: {
        authorId: user.id,
        authorName: user.name || 'Anonymous Founder',
        founderNumber,
        content: finalContent,
        category: category.trim()
      }
    });

    // --- NEW: Handle Mentions ---
    try {
      const { processMentions } = await import('@/lib/forum/notifications');
      await processMentions({
        text: finalContent,
        actorId: user.id,
        resourceId: response.id,
        resourceType: 'FORUM_COMMENT', // Mapping to existing enum
        link: `/forum#${response.id}`,
        title: `${user.name} hat dich in einem Beitrag erwähnt`
      });
    } catch (e) {
      console.error('Failed to process mentions', e);
    }
    // ----------------------------
    
    // Check for @orion mention
    const mentionRegex = /(?:@orion|atorion)\b\s*([^\n]*)/i;
    const mentionMatch = finalContent.match(mentionRegex);

    if (mentionMatch) {
      // User mentioned AI - respond directly
      try {
        const { ForumAIActions } = await import('@/lib/ai');
        const question = mentionMatch[1]?.trim() || finalContent;
        const aiResponse = await ForumAIActions.mentionReply(
          question,
          `Kategorie: ${category}\n\nBeitrag:\n${finalContent}`
        );

        if (aiResponse.content && response.id) {
          await prisma.forumComment.create({
            data: {
              postId: response.id,
              authorName: '@orion',
              content: `**@orion antwortet:**\n\n${aiResponse.content}`
            }
          });
        }
      } catch (aiError) {
        console.error('AI Mention Reply failed:', aiError);
      }
    }

    try {
      await syncUserAchievements(user.id);
    } catch (achievementError) {
      console.error('Achievement sync failed:', achievementError);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error adding forum post:', error);
    return NextResponse.json(
      { error: 'Failed to add forum post', details: error.message },
      { status: 500 }
    );
  }
}
