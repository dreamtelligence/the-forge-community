import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureSessionUser } from '@/lib/session-user';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await ensureSessionUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });

  const rows = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*)::bigint AS total
    FROM "DirectMessage" dm
    JOIN "DirectParticipant" dp ON dp."threadId" = dm."threadId"
    WHERE dp."userId" = ${user.id}
      AND dm."senderId" <> ${user.id}
      AND (dp."lastReadAt" IS NULL OR dm."createdAt" > dp."lastReadAt")
  `;

  const total = Number(rows?.[0]?.total ?? 0);
  return NextResponse.json({ total });
}
