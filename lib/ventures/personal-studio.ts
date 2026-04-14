import { Prisma, VentureType, VentureStatus } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';

export const PERSONAL_STUDIO_VENTURE_NAME = 'Personal Studio';
export const PERSONAL_STUDIO_VENTURE_DESCRIPTION = '[system] personal studio';

type PersonalStudioCandidate = {
  isPersonalStudio?: boolean | null;
  description?: string | null;
};

export const isPersonalStudioVenture = (venture: PersonalStudioCandidate) =>
  Boolean(venture?.isPersonalStudio) || venture?.description === PERSONAL_STUDIO_VENTURE_DESCRIPTION;

export async function getOrCreatePersonalStudioVentureByUserId(userId: string) {
  const existing = await prisma.venture.findFirst({
    where: {
      ownerId: userId,
      isPersonalStudio: true,
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  // Legacy fallback: existing rows created before isPersonalStudio flag was introduced.
  const legacy = await prisma.venture.findFirst({
    where: {
      ownerId: userId,
      description: PERSONAL_STUDIO_VENTURE_DESCRIPTION,
    },
    select: { id: true },
  });

  if (legacy) {
    const upgraded = await prisma.venture.update({
      where: { id: legacy.id },
      data: { isPersonalStudio: true },
      select: { id: true },
    });
    return upgraded;
  }

  try {
    const created = await prisma.venture.create({
      data: {
        ownerId: userId,
        name: PERSONAL_STUDIO_VENTURE_NAME,
        description: PERSONAL_STUDIO_VENTURE_DESCRIPTION,
        isPersonalStudio: true,
        type: VentureType.INFLUENCER,
        status: VentureStatus.IN_PROGRESS,
        currentPhase: 3,
      },
      select: { id: true },
    });

    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await prisma.venture.findFirst({
        where: {
          ownerId: userId,
          isPersonalStudio: true,
        },
        select: { id: true },
      });

      if (concurrent) {
        return concurrent;
      }
    }

    throw error;
  }
}

export async function getOrCreatePersonalStudioVentureByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return getOrCreatePersonalStudioVentureByUserId(user.id);
}
