import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getForumCommentsForPost } from '@/lib/forum/feed';
import { createForumJsonResponse } from '@/lib/forum/performance';

export async function GET(request: Request) {
  const routeStart = performance.now();
  const session = await auth();
  const afterAuth = performance.now();
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return createForumJsonResponse(
      { error: 'Missing postId' },
      {
        route: '/api/forum/comments',
        status: 400,
        durationMs: performance.now() - routeStart,
        steps: [{ name: 'auth', durationMs: afterAuth - routeStart }],
        details: {
          commentCount: 0,
        },
      }
    );
  }

  try {
    const postLookupStart = performance.now();
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    const afterPostLookup = performance.now();

    if (!post) {
      return createForumJsonResponse(
        { error: 'Post not found' },
        {
          route: '/api/forum/comments',
          status: 404,
          durationMs: afterPostLookup - routeStart,
          steps: [
            { name: 'auth', durationMs: afterAuth - routeStart },
            { name: 'post', durationMs: afterPostLookup - postLookupStart },
          ],
          details: {
            commentCount: 0,
          },
        }
      );
    }

    const commentsStart = performance.now();
    const comments = await getForumCommentsForPost(postId, session?.user?.email || null);
    const afterComments = performance.now();

    return createForumJsonResponse(
      { comments },
      {
        route: '/api/forum/comments',
        durationMs: afterComments - routeStart,
        steps: [
          { name: 'auth', durationMs: afterAuth - routeStart },
          { name: 'post', durationMs: afterPostLookup - postLookupStart },
          { name: 'comments', durationMs: afterComments - commentsStart },
        ],
        details: {
          commentCount: comments.length,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching forum comments:', error);
    return createForumJsonResponse(
      { error: 'Failed to fetch forum comments' },
      {
        route: '/api/forum/comments',
        status: 500,
        durationMs: performance.now() - routeStart,
        steps: [{ name: 'auth', durationMs: afterAuth - routeStart }],
        details: {
          commentCount: 0,
        },
      }
    );
  }
}
