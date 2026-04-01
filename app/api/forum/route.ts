import { NextResponse } from 'next/server';
import type { ModerationPolicy } from '@/lib/moderation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureProfileSlug } from '@/lib/profile';
import { assignFounderNumberIfMissing } from '@/lib/founder-number';
import { syncUserAchievements } from '@/lib/achievements';
import { RateLimiters } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'new'; // 'new', 'top', 'hot'

  try {
    const where: any = {};
    if (category && category !== 'All' && category !== 'Popular') {
      where.category = category;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'top') {
      orderBy = { likes: 'desc' };
    }

    const posts = await prisma.forumPost.findMany({
      take: limit + 1, // Fetch one more to know if there is a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            image: true,
            profileSlug: true,
            name: true,
            founderNumber: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            authorId: true,
            parentId: true,
            authorName: true,
            author: {
              select: {
                id: true,
                image: true,
                profileSlug: true,
                founderNumber: true,
                name: true,
              },
            },
            content: true,
            likes: true,
            createdAt: true
          }
        }
      }
    });

    let nextCursor: string | undefined = undefined;
    if (posts.length > limit) {
      nextCursor = posts[posts.length - 1].id;
    }

    // If user is logged in, attach their existing votes
    let userVotes: Map<string, number> = new Map();
    let commentVotes: Map<string, number> = new Map();
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          forumVotes: { 
            where: { postId: { in: posts.map(p => p.id) } },
            select: { postId: true, voteType: true } 
          },
          forumCommentVotes: { 
            where: { commentId: { in: posts.flatMap(p => p.comments.map(c => c.id)) } },
            select: { commentId: true, voteType: true } 
          }
        }
      });
      userVotes = new Map((user?.forumVotes || []).map(vote => [vote.postId, vote.voteType]));
      commentVotes = new Map((user?.forumCommentVotes || []).map(vote => [vote.commentId, vote.voteType]));
    }

    const postsWithVotes = posts.map(post => {
      return ({
      id: post.id,
      authorId: post.authorId,
      author: post.author?.name || post.authorName,
      authorImage: post.author?.image || null,
      authorSlug: post.author?.profileSlug || null,
      founderNumber: post.author?.founderNumber ?? post.founderNumber ?? 0,
      content: post.content,
      category: post.category,
      likes: post.likes,
      createdTime: post.createdAt.toISOString(),
      comments: post.comments.map(comment => ({
        id: comment.id,
        authorId: comment.authorId,
        parentId: comment.parentId,
        author: comment.author?.name || comment.authorName,
        authorImage: comment.author?.image || null,
        authorSlug: comment.author?.profileSlug || null,
        founderNumber: comment.author?.founderNumber || 0,
        content: comment.content,
        likes: comment.likes,
        time: comment.createdAt.toISOString(),
        userVote: commentVotes.get(comment.id) || 0
      })),
      userVote: userVotes.get(post.id) || 0
    });
    });

    return NextResponse.json({
      items: postsWithVotes,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forum posts' },
      { status: 500 }
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
    } = await import('@/lib/moderation');
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
      const { processMentions } = await import('@/lib/notifications');
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
