import { prisma } from '@/lib/prisma';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildBaseSlug(name?: string | null, founderNumber?: number | null, userId?: string) {
  const base = slugify(name || '');
  if (base) {
    if (founderNumber && founderNumber > 0) {
      return `${base}-${String(founderNumber).padStart(3, '0')}`;
    }
    return base;
  }
  return userId ? `founder-${userId.slice(0, 6)}` : 'founder';
}

export async function ensureProfileSlug(user: {
  id: string;
  name?: string | null;
  founderNumber?: number | null;
  profileSlug?: string | null;
}) {
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
