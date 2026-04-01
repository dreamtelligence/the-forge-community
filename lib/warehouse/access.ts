import { prisma } from '@/lib/prisma';

export type WarehouseAccessResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'USER_NOT_FOUND' | 'FORBIDDEN' };

export async function getWarehouseAccess(
  email: string,
  ventureId: string
): Promise<WarehouseAccessResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { ok: false, reason: 'USER_NOT_FOUND' };
  }

  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      OR: [
        { ownerId: user.id },
        {
          squad: {
            members: {
              some: {
                userId: user.id,
                leftAt: null,
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!venture) {
    return { ok: false, reason: 'FORBIDDEN' };
  }

  return { ok: true, userId: user.id };
}

export async function isAssignableWarehouseOperator(
  ventureId: string,
  candidateUserId: string
): Promise<boolean> {
  const venture = await prisma.venture.findFirst({
    where: { id: ventureId },
    select: { ownerId: true, squadId: true },
  });

  if (!venture) return false;
  if (venture.ownerId === candidateUserId) return true;
  if (!venture.squadId) return false;

  const membership = await prisma.squadMember.findFirst({
    where: {
      squadId: venture.squadId,
      userId: candidateUserId,
      leftAt: null,
    },
    select: { id: true },
  });

  return Boolean(membership);
}
