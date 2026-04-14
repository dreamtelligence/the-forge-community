'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { applyKarmaDelta } from '@/lib/user/karma';
import { revalidatePath } from 'next/cache';

export async function getRoadmapItems() {
  const session = await auth();
  if (!session?.user?.email) return [];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      role: true,
      squadMemberships: {
        where: { leftAt: null },
        select: { squadId: true }
      }
    }
  });

  if (!user) return [];

  const squadIds = user.squadMemberships.map(m => m.squadId);

  const items = await prisma.roadmapItem.findMany({
    where: user.role === 'ADMIN' ? {} : { squadId: { in: squadIds.length > 0 ? squadIds : ['none'] } },
    include: {
      votes: true,
      _count: {
        select: { votes: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return items.map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    status: item.status,
    votes: item._count.votes,
    hasVoted: item.votes.some((v: any) => v.userId === user.id)
  }));
}

export async function toggleVote(roadmapItemId: string) {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  // 1. Get User
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      role: true,
      squadMemberships: {
        where: { leftAt: null },
        select: { squadId: true }
      }
    }
  });

  if (!user) throw new Error('User not found');

  const userSquadIds = user.squadMemberships.map(m => m.squadId);

  // 2. Security Check (Squad Access)
  // We need to know which squad the item belongs to.
  const item = await prisma.roadmapItem.findUnique({
    where: { id: roadmapItemId },
    select: { squadId: true }
  });

  if (!item) throw new Error('Item not found');

  // Verify access (User must be in the squad of the item)
  if (user.role !== 'ADMIN' && !userSquadIds.includes(item.squadId)) {
     throw new Error('Access denied');
  }

  // 3. Check existing vote
  const existingVote = await prisma.roadmapVote.findUnique({
    where: {
      userId_roadmapItemId: {
        userId: user.id,
        roadmapItemId: roadmapItemId,
      },
    },
  });

  if (existingVote) {
    // 4a. Remove Vote
    await prisma.$transaction(async (tx) => {
      await tx.roadmapVote.delete({
        where: { id: existingVote.id },
      });
      await applyKarmaDelta(tx, {
        userId: user.id,
        points: -10,
        reason: 'roadmap_vote_removed',
        squadId: item.squadId,
      });
    });
    console.log(`Vote removed by ${user.email}`);
  } else {
    // 4b. Add Vote & Karma
    await prisma.$transaction(async (tx) => {
      await tx.roadmapVote.create({
        data: {
          userId: user.id,
          roadmapItemId: roadmapItemId,
        },
      });
      await applyKarmaDelta(tx, {
        userId: user.id,
        points: 10,
        reason: 'roadmap_vote',
        squadId: item.squadId,
      });
    });
    console.log(`Vote added by ${user.email}`);
  }

  // 5. Revalidate
  revalidatePath('/forum');
}
