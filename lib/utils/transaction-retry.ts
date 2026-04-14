import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';

type TransactionCallback<T> = (tx: Prisma.TransactionClient) => Promise<T>;

export async function runSerializableTransaction<T>(
  callback: TransactionCallback<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isSerializationFailure =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

      if (!isSerializationFailure || attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw new Error('Unable to complete transaction.');
}
