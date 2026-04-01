import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const MAX_RETRIES = 3;

export async function assignFounderNumberIfMissing(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { founderNumber: true },
  });

  if (!existing) {
    throw new Error('User not found');
  }

  if ((existing.founderNumber || 0) > 0) {
    return existing.founderNumber || 0;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const number = await prisma.$transaction(
        async (tx) => {
          const latest = await tx.user.findUnique({
            where: { id: userId },
            select: { founderNumber: true },
          });

          if (!latest) {
            throw new Error('User not found');
          }

          if ((latest.founderNumber || 0) > 0) {
            return latest.founderNumber || 0;
          }

          const max = await tx.user.aggregate({
            _max: { founderNumber: true },
          });

          const nextNumber = (max._max.founderNumber || 0) + 1;
          const updated = await tx.user.update({
            where: { id: userId },
            data: { founderNumber: nextNumber },
            select: { founderNumber: true },
          });

          return updated.founderNumber || 0;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return number;
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }
    }
  }

  return 0;
}
