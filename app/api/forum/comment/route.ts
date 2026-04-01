import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { assignFounderNumberIfMissing } from '@/lib/founder-number';
import { ensureProfileSlug } from '@/lib/profile';
import { RateLimiters } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rateLimitResponse = await RateLimiters.forumComment(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { postId, content, parentId } = body;

    if (!postId || !content) {
      return NextResponse.json({ error: 'Missing postId or content' }, { status: 400 });
    }

    const trimmedContent = String(content).trim();
    if (trimmedContent.length < 1) {
      return NextResponse.json({ error: 'Content too short' }, { status: 400 });
    }
    if (trimmedContent.length > 4000) {
      return NextResponse.json({ error: 'Content too long' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, image: true, profileSlug: true, founderNumber: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, content: true, category: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    let parentAuthorId: string | null = null;
    let parentContent: string | null = null;
    if (parentId) {
      const parent = await prisma.forumComment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, authorId: true, content: true }
      });

      if (!parent || parent.postId !== postId) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 });
      }

      parentAuthorId = parent.authorId || null;
      parentContent = parent.content || null;
    }

    const founderNumber = await assignFounderNumberIfMissing(user.id);
    const profileSlug = await ensureProfileSlug({
      id: user.id,
      name: user.name,
      founderNumber,
      profileSlug: user.profileSlug,
    });

    const comment = await prisma.forumComment.create({
      data: {
        postId,
        parentId: parentId || null,
        authorId: user.id,
        authorName: user.name || 'Anonymous Founder',
        content: trimmedContent
      }
    });

    const actorName = user.name || 'Ein Founder';
    try {
      const { processMentions, sendNotification } = await import('@/lib/notifications');

      // 1. Notify Parent Comment Author (if reply)
      if (parentId && parentAuthorId && parentAuthorId !== user.id) {
        await sendNotification({
          recipientId: parentAuthorId,
          actorId: user.id,
          type: 'FORUM_REPLY',
          title: 'Antwort auf deinen Kommentar',
          message: `${actorName} hat auf deinen Kommentar geantwortet.`,
          link: `/forum#${postId}`
        });
      }

      // 2. Notify Post Author (if not already notified as parent)
      if (post.authorId && post.authorId !== user.id && post.authorId !== parentAuthorId) {
        await sendNotification({
          recipientId: post.authorId,
          actorId: user.id,
          type: 'FORUM_COMMENT',
          title: 'Neuer Kommentar',
          message: `${actorName} hat deinen Beitrag kommentiert.`,
          link: `/forum#${postId}`
        });
      }

      // 3. Process @Mentions in the comment text
      await processMentions({
        text: trimmedContent,
        actorId: user.id,
        resourceId: comment.id,
        resourceType: 'FORUM_COMMENT',
        link: `/forum#${postId}`,
        title: `${actorName} hat dich in einem Kommentar erwähnt`
      });
    } catch (notificationError) {
      console.error('Notification creation failed:', notificationError);
    }

    // --- Orion AI Logic (remains same) ---
    const mentionRegex = /(?:@orion|atorion)\b\s*([^\n]*)/i;
    let aiComment: {
      id: string;
      authorId?: string | null;
      parentId?: string | null;
      author: string;
      authorImage?: string | null;
      authorSlug?: string | null;
      founderNumber?: number;
      content: string;
      likes: number;
      userVote: number;
      time: string;
    } | null = null;

    const mentionMatch = trimmedContent.match(mentionRegex);
    if (mentionMatch) {
      try {
        const { ForumAIActions } = await import('@/lib/ai');
        const question = mentionMatch[1]?.trim() || trimmedContent;
        const contextParts = [
          `Kategorie: ${post.category}`,
          `Beitrag:\n${post.content}`,
        ];
        if (parentContent) {
          contextParts.push(`Parent-Kommentar:\n${parentContent}`);
        }
        contextParts.push(`Aktueller Kommentar:\n${trimmedContent}`);
        const aiResponse = await ForumAIActions.mentionReply(
          question,
          contextParts.join('\n\n')
        );

        if (aiResponse.content) {
          const aiReply = await prisma.forumComment.create({
            data: {
              postId,
              parentId: comment.id,
              authorName: '@orion',
              content: `**@orion antwortet:**\n\n${aiResponse.content}`
            }
          });

          aiComment = {
            id: aiReply.id,
            authorId: aiReply.authorId,
            parentId: aiReply.parentId,
            author: aiReply.authorName,
            authorImage: null,
            authorSlug: null,
            founderNumber: 0,
            content: aiReply.content,
            likes: aiReply.likes,
            userVote: 0,
            time: aiReply.createdAt.toISOString()
          };
        }
      } catch (aiError) {
        console.error('Orion comment reply failed:', aiError);
      }
    }

    return NextResponse.json({
      id: comment.id,
      authorId: comment.authorId,
      parentId: comment.parentId,
      author: comment.authorName,
      authorImage: user.image || null,
      authorSlug: profileSlug,
      founderNumber,
      content: comment.content,
      likes: comment.likes,
      userVote: 0,
      time: comment.createdAt.toISOString(),
      aiComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
