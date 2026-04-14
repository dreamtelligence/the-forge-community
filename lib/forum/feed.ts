import { prisma } from '@/lib/database/prisma';

export type ForumFeedComment = {
  id: string;
  authorId: string | null;
  parentId: string | null;
  author: string;
  authorImage: string | null;
  authorSlug: string | null;
  founderNumber: number;
  content: string;
  likes: number;
  time: string;
  userVote: number;
};

export type ForumFeedPost = {
  id: string;
  authorId: string | null;
  author: string;
  authorImage: string | null;
  authorSlug: string | null;
  founderNumber: number;
  content: string;
  createdTime: string;
  likes: number;
  category: string;
  userVote: number;
  commentCount: number;
  commentsLoaded: boolean;
  comments: ForumFeedComment[];
};

type FeedSort = 'new' | 'top' | 'hot';
type CommentsMode = 'none' | 'preview' | 'full';

type GetForumFeedOptions = {
  viewerEmail?: string | null;
  cursor?: string | null;
  limit?: number;
  category?: string | null;
  sort?: string | null;
  commentsMode?: CommentsMode;
  previewRootComments?: number;
};

const commentSelect = {
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
  createdAt: true,
} as const;

const postAuthorSelect = {
  id: true,
  image: true,
  profileSlug: true,
  name: true,
  founderNumber: true,
} as const;

function normalizeSort(value?: string | null): FeedSort {
  switch ((value || '').toLowerCase()) {
    case 'top':
      return 'top';
    case 'hot':
      return 'hot';
    case 'new':
    default:
      return 'new';
  }
}

function buildOrderBy(sort: FeedSort) {
  if (sort === 'top') {
    return [{ likes: 'desc' as const }, { createdAt: 'desc' as const }];
  }

  if (sort === 'hot') {
    return [{ createdAt: 'desc' as const }];
  }

  return [{ createdAt: 'desc' as const }];
}

function buildCommentsSelect(mode: CommentsMode, previewRootComments: number) {
  if (mode === 'none') return undefined;

  if (mode === 'preview') {
    return {
      where: { parentId: null },
      orderBy: { createdAt: 'asc' as const },
      take: previewRootComments,
      select: commentSelect,
    };
  }

  return {
    orderBy: { createdAt: 'asc' as const },
    select: commentSelect,
  };
}

function mapComment(
  comment: {
    id: string;
    authorId: string | null;
    parentId: string | null;
    authorName: string;
    author?: {
      id: string;
      image: string | null;
      profileSlug: string | null;
      founderNumber: number | null;
      name: string | null;
    } | null;
    content: string;
    likes: number;
    createdAt: Date;
  },
  commentVotes: Map<string, number>
): ForumFeedComment {
  return {
    id: comment.id,
    authorId: comment.authorId,
    parentId: comment.parentId,
    author: comment.author?.name || comment.authorName,
    authorImage: comment.author?.image || null,
    authorSlug: comment.author?.profileSlug || null,
    founderNumber: comment.author?.founderNumber ?? 0,
    content: comment.content,
    likes: comment.likes,
    time: comment.createdAt.toISOString(),
    userVote: commentVotes.get(comment.id) || 0,
  };
}

export async function getForumFeed({
  viewerEmail = null,
  cursor = null,
  limit = 10,
  category = null,
  sort = 'new',
  commentsMode = 'preview',
  previewRootComments = 1,
}: GetForumFeedOptions = {}) {
  const take = Math.min(limit, 50);
  const normalizedSort = normalizeSort(sort);
  const where: Record<string, unknown> = {};

  if (category && category !== 'All' && category !== 'Popular') {
    where.category = category;
  }

  const commentsSelect = buildCommentsSelect(commentsMode, previewRootComments);

  const posts = await prisma.forumPost.findMany({
    take: take + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    where,
    orderBy: buildOrderBy(normalizedSort),
    select: {
      id: true,
      authorId: true,
      authorName: true,
      founderNumber: true,
      content: true,
      category: true,
      likes: true,
      createdAt: true,
      author: {
        select: postAuthorSelect,
      },
      _count: {
        select: {
          comments: true,
        },
      },
      ...(commentsSelect ? { comments: commentsSelect } : {}),
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > take) {
    nextCursor = posts[posts.length - 1]?.id ?? null;
    posts.pop();
  }

  const commentIds = posts.flatMap((post) => (post.comments || []).map((comment) => comment.id));
  const postIds = posts.map((post) => post.id);

  let userVotes = new Map<string, number>();
  let commentVotes = new Map<string, number>();

  if (viewerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: viewerEmail },
      select: {
        forumVotes: {
          where: { postId: { in: postIds } },
          select: { postId: true, voteType: true },
        },
        forumCommentVotes: {
          where: { commentId: { in: commentIds } },
          select: { commentId: true, voteType: true },
        },
      },
    });

    userVotes = new Map((user?.forumVotes || []).map((vote) => [vote.postId, vote.voteType]));
    commentVotes = new Map(
      (user?.forumCommentVotes || []).map((vote) => [vote.commentId, vote.voteType])
    );
  }

  const items: ForumFeedPost[] = posts.map((post) => ({
    id: post.id,
    authorId: post.authorId,
    author: post.author?.name || post.authorName,
    authorImage: post.author?.image || null,
    authorSlug: post.author?.profileSlug || null,
    founderNumber: post.author?.founderNumber ?? post.founderNumber ?? 0,
    content: post.content,
    createdTime: post.createdAt.toISOString(),
    likes: post.likes,
    category: post.category,
    userVote: userVotes.get(post.id) || 0,
    commentCount: post._count.comments,
    commentsLoaded: commentsMode === 'full',
    comments: (post.comments || []).map((comment) => mapComment(comment, commentVotes)),
  }));

  return {
    items,
    nextCursor,
  };
}

export async function getForumCommentsForPost(postId: string, viewerEmail?: string | null) {
  const comments = await prisma.forumComment.findMany({
    where: { postId },
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
      createdAt: true,
    },
  });

  let commentVotes = new Map<string, number>();

  if (viewerEmail && comments.length > 0) {
    const user = await prisma.user.findUnique({
      where: { email: viewerEmail },
      select: {
        forumCommentVotes: {
          where: { commentId: { in: comments.map((comment) => comment.id) } },
          select: { commentId: true, voteType: true },
        },
      },
    });

    commentVotes = new Map(
      (user?.forumCommentVotes || []).map((vote) => [vote.commentId, vote.voteType])
    );
  }

  return comments.map((comment) => mapComment(comment, commentVotes));
}
