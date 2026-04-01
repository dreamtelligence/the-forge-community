import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 40,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              image: true,
              profileSlug: true,
              founderNumber: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      unreadCount,
      notifications: notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        href: notification.href,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        actor: notification.actor
          ? {
              id: notification.actor.id,
              name: notification.actor.name,
              image: notification.actor.image,
              profileSlug: notification.actor.profileSlug,
              founderNumber: notification.actor.founderNumber,
            }
          : null,
      })),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json({ unreadCount: 0, notifications: [] });
    }
    console.error('Notifications fetch failed:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: any) => typeof id === 'string') : null;
    const markAll = body?.all === true;

    if (!markAll && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: 'No notifications selected' }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        ...(markAll ? {} : { id: { in: ids || [] } }),
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json({ success: true, skipped: true });
    }
    console.error('Notifications update failed:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
