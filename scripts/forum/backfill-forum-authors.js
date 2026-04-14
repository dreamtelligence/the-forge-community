require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = `${process.env.DATABASE_URL || ''}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SYSTEM_AUTHORS = new Set(['anonymous founder', '@forge-ai']);

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildBaseSlug(name, founderNumber, userId) {
  const base = slugify(name || '');
  if (base) {
    if (founderNumber && founderNumber > 0) {
      return `${base}-${String(founderNumber).padStart(3, '0')}`;
    }
    return base;
  }
  return userId ? `founder-${userId.slice(0, 6)}` : 'founder';
}

async function ensureProfileSlug(user) {
  if (user.profileSlug) return user.profileSlug;

  const base = buildBaseSlug(user.name, user.founderNumber, user.id);
  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { profileSlug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === user.id) {
      break;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { profileSlug: candidate },
  });

  return candidate;
}

function normalizeKey(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function addToMap(map, key, id) {
  if (!key) return;
  const current = map.get(key) || [];
  current.push(id);
  map.set(key, current);
}

function getSingle(map, key) {
  const list = map.get(key);
  if (!list || list.length !== 1) return null;
  return list[0];
}

async function backfillForumAuthors() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      profileSlug: true,
      founderNumber: true,
    },
  });

  const usersById = new Map();
  const nameMap = new Map();
  const slugMap = new Map();
  const emailMap = new Map();

  for (const user of users) {
    const profileSlug = await ensureProfileSlug(user);
    const nextUser = { ...user, profileSlug };
    usersById.set(user.id, nextUser);

    addToMap(nameMap, normalizeKey(user.name || ''), user.id);
    addToMap(slugMap, slugify(profileSlug || ''), user.id);
    addToMap(emailMap, (user.email || '').toLowerCase().trim(), user.id);
  }

  const resolveUserId = authorName => {
    const raw = (authorName || '').trim();
    if (!raw) return null;
    if (SYSTEM_AUTHORS.has(raw.toLowerCase())) return null;

    if (raw.includes('@')) {
      const emailMatch = getSingle(emailMap, raw.toLowerCase());
      if (emailMatch) return emailMatch;
    }

    const nameKey = normalizeKey(raw);
    const nameMatch = getSingle(nameMap, nameKey);
    if (nameMatch) return nameMatch;

    const slugMatch = getSingle(slugMap, slugify(raw));
    if (slugMatch) return slugMatch;

    return null;
  };

  let postsUpdated = 0;
  let postsSkipped = 0;
  let commentsUpdated = 0;
  let commentsSkipped = 0;
  let postsSynced = 0;
  let commentsSynced = 0;

  const postsMissing = await prisma.forumPost.findMany({
    where: { authorId: null },
    select: { id: true, authorName: true, founderNumber: true },
  });

  for (const post of postsMissing) {
    const userId = resolveUserId(post.authorName);
    if (!userId) {
      postsSkipped += 1;
      continue;
    }
    const user = usersById.get(userId);
    const nextName = user.name || post.authorName;
    const nextFounder = user.founderNumber || post.founderNumber || 0;

    await prisma.forumPost.update({
      where: { id: post.id },
      data: {
        authorId: userId,
        authorName: nextName,
        founderNumber: nextFounder,
      },
    });

    postsUpdated += 1;
  }

  const postsWithAuthor = await prisma.forumPost.findMany({
    where: { authorId: { not: null } },
    select: {
      id: true,
      authorId: true,
      authorName: true,
      founderNumber: true,
      author: { select: { name: true, founderNumber: true } },
    },
  });

  for (const post of postsWithAuthor) {
    if (!post.author || SYSTEM_AUTHORS.has((post.authorName || '').toLowerCase())) continue;
    const nextName = post.author.name || post.authorName;
    const nextFounder = post.author.founderNumber || post.founderNumber || 0;
    if (nextName !== post.authorName || nextFounder !== post.founderNumber) {
      await prisma.forumPost.update({
        where: { id: post.id },
        data: {
          authorName: nextName,
          founderNumber: nextFounder,
        },
      });
      postsSynced += 1;
    }
  }

  const commentsMissing = await prisma.forumComment.findMany({
    where: { authorId: null },
    select: { id: true, authorName: true },
  });

  for (const comment of commentsMissing) {
    const userId = resolveUserId(comment.authorName);
    if (!userId) {
      commentsSkipped += 1;
      continue;
    }
    const user = usersById.get(userId);
    const nextName = user.name || comment.authorName;

    await prisma.forumComment.update({
      where: { id: comment.id },
      data: {
        authorId: userId,
        authorName: nextName,
      },
    });

    commentsUpdated += 1;
  }

  const commentsWithAuthor = await prisma.forumComment.findMany({
    where: { authorId: { not: null } },
    select: {
      id: true,
      authorName: true,
      author: { select: { name: true } },
    },
  });

  for (const comment of commentsWithAuthor) {
    if (!comment.author || SYSTEM_AUTHORS.has((comment.authorName || '').toLowerCase())) continue;
    const nextName = comment.author.name || comment.authorName;
    if (nextName !== comment.authorName) {
      await prisma.forumComment.update({
        where: { id: comment.id },
        data: { authorName: nextName },
      });
      commentsSynced += 1;
    }
  }

  console.log('Backfill complete.');
  console.log(`Posts updated (authorId set): ${postsUpdated}`);
  console.log(`Posts skipped (no match): ${postsSkipped}`);
  console.log(`Posts synced (name/founderNumber): ${postsSynced}`);
  console.log(`Comments updated (authorId set): ${commentsUpdated}`);
  console.log(`Comments skipped (no match): ${commentsSkipped}`);
  console.log(`Comments synced (name): ${commentsSynced}`);
}

backfillForumAuthors()
  .catch(error => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
