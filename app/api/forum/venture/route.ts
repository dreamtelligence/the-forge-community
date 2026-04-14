import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { FORUM_VENTURE_DESCRIPTION, FORUM_VENTURE_NAME } from '@/lib/forum/venture';
import { NextResponse } from 'next/server';

async function getAuthenticatedUserId() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

async function findForumVentureId(userId: string) {
  const existing = await prisma.venture.findFirst({
    where: {
      ownerId: userId,
      description: FORUM_VENTURE_DESCRIPTION,
    },
    select: { id: true },
  });

  return existing?.id ?? null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingId = await findForumVentureId(userId);
  if (!existingId) {
    return NextResponse.json({ error: 'Forum venture not found' }, { status: 404 });
  }

  return NextResponse.json({ id: existingId });
}

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingId = await findForumVentureId(userId);
  if (existingId) {
    return NextResponse.json({ id: existingId });
  }

  const created = await prisma.venture.create({
    data: {
      ownerId: userId,
      name: FORUM_VENTURE_NAME,
      description: FORUM_VENTURE_DESCRIPTION,
      type: 'OTHER',
      status: 'PAUSED',
      currentPhase: 1,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
