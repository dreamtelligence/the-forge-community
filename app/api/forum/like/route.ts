import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { syncUserAchievements } from '@/lib/achievements';
import { applyKarmaDelta, karmaDeltaFromScores } from '@/lib/karma';
import { ensureSessionUser } from '@/lib/session-user';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id: postId, delta } = body; // delta is 1 or -1

    if (!postId || typeof delta !== 'number' || Math.abs(delta) !== 1) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
    }

    const user = await ensureSessionUser({
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });

    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.forumPost.findUnique({
        where: { id: postId },
        select: { likes: true, authorId: true }
      });

      if (!post) {
        throw new Error('Post not found');
      }

      const existingVote = await tx.forumVote.findUnique({
        where: {
          postId_userId: { postId, userId: user.id }
        }
      });

      let likesDelta = 0;
      let userVote = 0;

      if (existingVote) {
        if (existingVote.voteType === delta) {
          // User clicked the SAME arrow again -> Undo vote
          await tx.forumVote.delete({
            where: { id: existingVote.id }
          });
          likesDelta = -delta;
          userVote = 0;
        } else {
          // User changed vote from Up to Down or vice versa
          await tx.forumVote.update({
            where: { id: existingVote.id },
            data: { voteType: delta }
          });
          likesDelta = delta * 2;
          userVote = delta;
        }
      } else {
        // New vote
        await tx.forumVote.create({
          data: {
            postId,
            userId: user.id,
            voteType: delta
          }
        });
        likesDelta = delta;
        userVote = delta;
      }

      const nextLikes = post.likes + likesDelta;
      const updated = await tx.forumPost.update({
        where: { id: postId },
        data: { likes: nextLikes },
        select: { likes: true }
      });

      if (post.authorId && post.authorId !== user.id) {
        const karmaDelta = karmaDeltaFromScores(post.likes, nextLikes);
        await applyKarmaDelta(tx, {
          userId: post.authorId,
          points: karmaDelta,
          reason: 'forum_post_vote',
        });
      }

      return { likes: updated.likes, userVote, authorId: post.authorId };
    });

    if (result.authorId) {
      await syncUserAchievements(result.authorId);
    }

    return NextResponse.json({ 
      id: postId, 
      likes: result.likes, 
      userVote: result.userVote 
    });

  } catch (error) {
    if ((error as Error).message === 'Post not found') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    console.error('Error updating forum likes:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
