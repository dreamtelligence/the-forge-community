import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function getTargetId(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get('targetId');
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetId = getTargetId(request);
  if (!targetId) {
    return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
  }

  const viewer = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!viewer) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [followersCount, followingCount, followRecord] = await prisma.$transaction([
    prisma.userFollow.count({ where: { followingId: targetId } }),
    prisma.userFollow.count({ where: { followerId: targetId } }),
    prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId: viewer.id, followingId: targetId } },
      select: { id: true }
    })
  ]);

  return NextResponse.json({
    followersCount,
    followingCount,
    isFollowing: Boolean(followRecord)
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const targetId = body?.targetId;
  if (!targetId) {
    return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
  }

  const viewer = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!viewer) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (viewer.id === targetId) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true }
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
  }

  await prisma.userFollow.upsert({
    where: { followerId_followingId: { followerId: viewer.id, followingId: targetId } },
    update: {},
    create: { followerId: viewer.id, followingId: targetId }
  });

  const [followersCount, followingCount] = await prisma.$transaction([
    prisma.userFollow.count({ where: { followingId: targetId } }),
    prisma.userFollow.count({ where: { followerId: targetId } })
  ]);

  return NextResponse.json({
    followersCount,
    followingCount,
    isFollowing: true
  });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const targetId = body?.targetId;
  if (!targetId) {
    return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
  }

  const viewer = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!viewer) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.userFollow.deleteMany({
    where: { followerId: viewer.id, followingId: targetId }
  });

  const [followersCount, followingCount] = await prisma.$transaction([
    prisma.userFollow.count({ where: { followingId: targetId } }),
    prisma.userFollow.count({ where: { followerId: targetId } })
  ]);

  return NextResponse.json({
    followersCount,
    followingCount,
    isFollowing: false
  });
}
