import { prisma } from '@/lib/prisma';
import { isConfiguredAdminEmail } from '@/lib/admin-access';

type EnsureSessionUserInput = {
  email: string;
  name?: string | null;
  image?: string | null;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function ensureSessionUser(input: EnsureSessionUserInput) {
  const email = normalizeEmail(input.email);
  const shouldBeAdmin = isConfiguredAdminEmail(email);

  return prisma.user.upsert({
    where: { email },
    update: shouldBeAdmin ? { role: 'ADMIN' } : {},
    create: {
      email,
      name: input.name?.trim() || null,
      image: input.image || null,
      role: shouldBeAdmin ? 'ADMIN' : 'USER',
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
}
