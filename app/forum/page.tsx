import { auth } from '@/auth';
import ForumClient from './ForumClient';
import { prisma } from '@/lib/prisma';
import { ensureSessionUser } from '@/lib/session-user';
import { assignFounderNumberIfMissing } from '@/lib/founder-number';
import { ensureProfileSlug } from '@/lib/profile';
import { getForumFeed } from '@/lib/forum-feed';
import {
  getJsonPayloadBytes,
  logForumMetric,
  type ForumInitialPageMetrics,
} from '@/lib/forum-performance';

type ForumPageSession =
  | {
      user?: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
      };
    }
  | null;

async function getInitialUser(session: ForumPageSession) {
  if (!session?.user?.email) return null;

  const ensuredUser = await ensureSessionUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });

  const user = await prisma.user.findUnique({
    where: { id: ensuredUser.id },
    select: {
      id: true,
      name: true,
      profileSlug: true,
      email: true,
      image: true,
      role: true,
      credits: true,
      onboardingComplete: true,
      hasSeenCockpitTour: true,
      founderNumber: true,
      karmaScore: true,
      _count: {
        select: {
          ventures: true,
          squadMemberships: true,
        },
      },
    },
  });

  if (!user) return null;

  const founderNumber = await assignFounderNumberIfMissing(user.id);
  const profileSlug = await ensureProfileSlug({
    id: user.id,
    name: user.name,
    founderNumber,
    profileSlug: user.profileSlug,
  });

  return {
    ...user,
    founderNumber,
    profileSlug,
  };
}

export default async function ForumPage() {
  const pageStart = performance.now();
  const session = await auth();
  const afterAuth = performance.now();
  const [feedResult, initialUserResult] = await Promise.all([
    (async () => {
      const feedStart = performance.now();
      const feed = await getForumFeed({
        viewerEmail: session?.user?.email || null,
        limit: 10,
        category: 'All',
        sort: 'hot',
        commentsMode: 'preview',
        previewRootComments: 1,
      });

      return {
        feed,
        durationMs: performance.now() - feedStart,
      };
    })(),
    (async () => {
      const userStart = performance.now();
      const initialUser = await getInitialUser(session);

      return {
        initialUser,
        durationMs: performance.now() - userStart,
      };
    })(),
  ]);

  const initialMetrics: ForumInitialPageMetrics = {
    route: '/forum',
    serverRenderMs: performance.now() - pageStart,
    authMs: afterAuth - pageStart,
    feedQueryMs: feedResult.durationMs,
    userQueryMs: initialUserResult.durationMs,
    bootstrapBytes: getJsonPayloadBytes({
      initialPosts: feedResult.feed.items,
      initialUser: initialUserResult.initialUser,
      initialNextCursor: feedResult.feed.nextCursor,
    }),
    initialPostCount: feedResult.feed.items.length,
    hasInitialUser: Boolean(initialUserResult.initialUser),
    hasNextCursor: Boolean(feedResult.feed.nextCursor),
    category: 'All',
    sort: 'hot',
  };

  logForumMetric({
    route: '/forum',
    durationMs: initialMetrics.serverRenderMs,
    payloadBytes: initialMetrics.bootstrapBytes,
    steps: [
      { name: 'auth', durationMs: initialMetrics.authMs },
      { name: 'feed', durationMs: initialMetrics.feedQueryMs },
      { name: 'user', durationMs: initialMetrics.userQueryMs },
    ],
    details: {
      initialPostCount: initialMetrics.initialPostCount,
      hasInitialUser: initialMetrics.hasInitialUser,
      hasNextCursor: initialMetrics.hasNextCursor,
      category: initialMetrics.category,
      sort: initialMetrics.sort,
    },
  });

  return (
    <ForumClient
      initialPosts={feedResult.feed.items}
      initialUser={initialUserResult.initialUser}
      initialNextCursor={feedResult.feed.nextCursor}
      initialMetrics={initialMetrics}
      forumVentureId={null}
    />
  );
}
