import type { Prisma } from '@prisma/client';

const KARMA_EXPONENT = 0.8;

export function scoreToKarma(score: number) {
  if (score === 0) return 0;
  const sign = Math.sign(score);
  const magnitude = Math.pow(Math.abs(score), KARMA_EXPONENT);
  return sign * Math.round(magnitude);
}

export function karmaDeltaFromScores(prevScore: number, nextScore: number) {
  return scoreToKarma(nextScore) - scoreToKarma(prevScore);
}

export async function applyKarmaDelta(
  tx: Prisma.TransactionClient,
  {
    userId,
    points,
    reason,
    squadId
  }: {
    userId: string;
    points: number;
    reason: string;
    squadId?: string | null;
  }
) {
  if (!points) return;
  await tx.karma.create({
    data: {
      userId,
      points,
      reason,
      squadId: squadId || null,
    }
  });
  await tx.user.update({
    where: { id: userId },
    data: { karmaScore: { increment: points } }
  });
}
