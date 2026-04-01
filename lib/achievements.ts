import { prisma } from '@/lib/prisma';
import { AchievementCategory } from '@prisma/client';

const FORUM_POSTS_MIN = 1;
const FORUM_LIKES_MIN = 25;

const ACHIEVEMENTS = [
  {
    key: 'forge_launch',
    title: 'Forge Launch',
    description: 'Brand im Squad gelauncht.',
    category: AchievementCategory.LAUNCH,
    icon: 'rocket',
    tier: 3,
  },
  {
    key: 'forum_contributor',
    title: 'Forum Contributor',
    description: 'Aktiv im Forum beigetragen.',
    category: AchievementCategory.COMMUNITY,
    icon: 'message-square',
    tier: 1,
  },
  {
    key: 'community_signal',
    title: 'Community Signal',
    description: 'Wissen mit starker Resonanz.',
    category: AchievementCategory.EXPERTISE,
    icon: 'award',
    tier: 2,
  },
];

async function ensureAchievements() {
  await Promise.all(
    ACHIEVEMENTS.map((achievement) =>
      prisma.achievement.upsert({
        where: { key: achievement.key },
        update: {
          title: achievement.title,
          description: achievement.description,
          category: achievement.category,
          icon: achievement.icon,
          tier: achievement.tier,
        },
        create: achievement,
      })
    )
  );
}

export async function syncUserAchievements(userId: string) {
  await ensureAchievements();

  const [launchCount, forumPostCount, forumLikes] = await prisma.$transaction([
    prisma.venture.count({
      where: {
        ownerId: userId,
        status: 'LAUNCHED',
        squadId: { not: null },
      },
    }),
    prisma.forumPost.count({
      where: { authorId: userId },
    }),
    prisma.forumPost.aggregate({
      where: { authorId: userId },
      _sum: { likes: true },
    }),
  ]);

  const totalForumLikes = forumLikes._sum.likes ?? 0;
  const earnedKeys: string[] = [];

  if (launchCount > 0) earnedKeys.push('forge_launch');
  if (forumPostCount >= FORUM_POSTS_MIN) earnedKeys.push('forum_contributor');
  if (totalForumLikes >= FORUM_LIKES_MIN) earnedKeys.push('community_signal');

  if (earnedKeys.length === 0) {
    return { earnedKeys, totalForumLikes, forumPostCount, launchCount };
  }

  const earnedAchievements = await prisma.achievement.findMany({
    where: { key: { in: earnedKeys } },
    select: { id: true, key: true },
  });

  if (earnedAchievements.length === 0) {
    return { earnedKeys, totalForumLikes, forumPostCount, launchCount };
  }

  const existing = await prisma.userAchievement.findMany({
    where: {
      userId,
      achievementId: { in: earnedAchievements.map((a) => a.id) },
    },
    select: { achievementId: true },
  });

  const existingIds = new Set(existing.map((entry) => entry.achievementId));
  const missing = earnedAchievements
    .filter((achievement) => !existingIds.has(achievement.id))
    .map((achievement) => ({
      userId,
      achievementId: achievement.id,
    }));

  if (missing.length > 0) {
    await prisma.userAchievement.createMany({ data: missing });
  }

  return { earnedKeys, totalForumLikes, forumPostCount, launchCount };
}

export async function getProfileAchievements(userId: string) {
  await syncUserAchievements(userId);

  const [achievements, earned] = await prisma.$transaction([
    prisma.achievement.findMany({
      orderBy: [{ tier: 'desc' }, { title: 'asc' }],
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, earnedAt: true },
    }),
  ]);

  const earnedMap = new Map(
    earned.map((item) => [item.achievementId, item.earnedAt])
  );

  return achievements.map((achievement) => ({
    key: achievement.key,
    title: achievement.title,
    description: achievement.description,
    category: achievement.category,
    icon: achievement.icon,
    tier: achievement.tier,
    earnedAt: earnedMap.get(achievement.id) || null,
  }));
}
