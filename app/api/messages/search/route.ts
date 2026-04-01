import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const MAX_RESULTS = 8;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      accountStatus: 'ACTIVE',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { profileSlug: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      image: true,
      profileSlug: true,
      founderNumber: true
    },
    take: MAX_RESULTS,
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ results });
}
