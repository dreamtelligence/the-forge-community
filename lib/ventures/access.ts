import { prisma } from '@/lib/database/prisma';

export interface VentureAccess {
  userId: string;
  ventureId: string;
  ownerId: string;
  squadId: string | null;
}

export async function getVentureAccessByEmail(
  email: string,
  ventureId: string
): Promise<VentureAccess | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return null;
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
    select: {
      id: true,
      ownerId: true,
      squadId: true,
    },
  });

  if (!venture) {
    return null;
  }

  return {
    userId: user.id,
    ventureId: venture.id,
    ownerId: venture.ownerId,
    squadId: venture.squadId,
  };
}
