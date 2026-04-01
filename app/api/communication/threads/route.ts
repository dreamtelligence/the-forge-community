import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const createTitle = (value: string) => {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Neuer Chat';
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
};

export async function GET() {
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

  const threads = await prisma.aiChatThread.findMany({
    where: { userId: user.id },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      lastMessageAt: true,
      createdAt: true
    }
  });

  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
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

  const payload = await request.json().catch(() => ({}));
  const rawTitle = typeof payload?.title === 'string' ? payload.title : '';
  const title = createTitle(rawTitle);

  const thread = await prisma.aiChatThread.create({
    data: {
      userId: user.id,
      title,
      lastMessageAt: null
    },
    select: {
      id: true,
      title: true,
      lastMessageAt: true,
      createdAt: true
    }
  });

  return NextResponse.json({ thread });
}
