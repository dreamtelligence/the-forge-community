import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { FORUM_VENTURE_DESCRIPTION, FORUM_VENTURE_NAME } from '@/lib/forum-venture';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const existing = await prisma.venture.findFirst({
    where: {
      ownerId: user.id,
      description: FORUM_VENTURE_DESCRIPTION,
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ id: existing.id });
  }

  const created = await prisma.venture.create({
    data: {
      ownerId: user.id,
      name: FORUM_VENTURE_NAME,
      description: FORUM_VENTURE_DESCRIPTION,
      type: 'OTHER',
      status: 'PAUSED',
      currentPhase: 1,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id });
}
