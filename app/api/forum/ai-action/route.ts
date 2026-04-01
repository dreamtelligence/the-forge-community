import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ForumAIActions } from '@/lib/ai';
import { RateLimiters } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

export async function POST(request: Request) {
  // SECURITY: Rate limit
  const rateLimitResponse = await RateLimiters.aiChatbot(request);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, postContent, category, postId, parentId } = await request.json();

    if (!action || !postId) {
      return NextResponse.json(
        { error: 'Missing action or postId' },
        { status: 400 }
      );
    }

    // Determine content to analyze: if replying to a comment (parentId exists), we might want to analyze that comment specifically
    // But usually the action is based on the provided "postContent" (which the client sends).
    // The client should send the comment content as postContent if the action is on a comment.

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { content: true, category: true },
    });

    // If postContent is provided (e.g. from a specific comment), use it. Otherwise fallback to main post.
    const resolvedContent = postContent || post?.content;
    const resolvedCategory = post?.category || category || 'General';

    if (!resolvedContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const userName = session.user.name || 'Founder';
    let result;

    switch (action) {
      case 'summarize':
        result = await ForumAIActions.summarize(resolvedContent, userName);
        break;
      case 'feedback':
        result = await ForumAIActions.feedback(resolvedContent, resolvedCategory, userName);
        break;
      case 'expand':
        result = await ForumAIActions.expand(resolvedContent, userName);
        break;
      case 'factCheck':
        result = await ForumAIActions.factCheck(resolvedContent, userName);
        break;
      case 'nextSteps':
        result = await ForumAIActions.nextSteps(resolvedContent, userName);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const actionLabels: Record<string, string> = {
      summarize: 'Kurzfassung',
      feedback: 'Feedback',
      expand: 'Weiter ausführen',
      factCheck: 'Faktencheck',
      nextSteps: 'Nächste Schritte',
    };

    const label = actionLabels[action] || 'Orion Insight';
    const aiContent = `**Orion Insight · ${label}**\n\n${result.content}`;

    const comment = await prisma.forumComment.create({
      data: {
        postId,
        parentId: parentId || null, // Support threading
        authorName: '@orion',
        content: aiContent,
      },
    });

    return NextResponse.json({
      content: result.content,
      provider: result.provider,
      action,
      comment: {
        id: comment.id,
        authorId: comment.authorId,
        parentId: comment.parentId,
        author: comment.authorName,
        content: comment.content,
        likes: comment.likes,
        userVote: 0,
        time: comment.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI Action error:', error);
    return NextResponse.json(
      { error: 'AI service failed', details: error.message },
      { status: 500 }
    );
  }
}
