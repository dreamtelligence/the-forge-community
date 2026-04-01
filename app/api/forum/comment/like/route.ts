import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { applyKarmaDelta, karmaDeltaFromScores } from '@/lib/karma';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, delta } = body;

    if (!id || typeof delta !== 'number') {
      return NextResponse.json({ error: 'Missing id or delta' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const comment = await tx.forumComment.findUnique({
        where: { id },
        select: { id: true, likes: true, authorId: true }
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      const existingVote = await tx.forumCommentVote.findUnique({
        where: { commentId_userId: { commentId: id, userId: user.id } }
      });

      let likeDelta = 0;
      let newUserVote = 0;

      if (existingVote) {
        if (existingVote.voteType === delta) {
          await tx.forumCommentVote.delete({
            where: { commentId_userId: { commentId: id, userId: user.id } }
          });
          likeDelta = -delta;
          newUserVote = 0;
        } else {
          await tx.forumCommentVote.update({
            where: { commentId_userId: { commentId: id, userId: user.id } },
            data: { voteType: delta }
          });
          likeDelta = delta * 2;
          newUserVote = delta;
        }
      } else {
        await tx.forumCommentVote.create({
          data: { commentId: id, userId: user.id, voteType: delta }
        });
        likeDelta = delta;
        newUserVote = delta;
      }

      const nextLikes = comment.likes + likeDelta;
      const updatedComment = await tx.forumComment.update({
        where: { id },
        data: { likes: nextLikes },
        select: { likes: true }
      });

      if (comment.authorId && comment.authorId !== user.id) {
        const karmaDelta = karmaDeltaFromScores(comment.likes, nextLikes);
        await applyKarmaDelta(tx, {
          userId: comment.authorId,
          points: karmaDelta,
          reason: 'forum_comment_vote',
        });
      }

      return { likes: updatedComment.likes, userVote: newUserVote };
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating comment likes:', error);
    return NextResponse.json({ error: 'Failed to update comment likes' }, { status: 500 });
  }
}
