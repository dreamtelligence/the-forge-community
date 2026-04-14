import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';

const DEFAULT_PREFS = {
  forumComments: true,
  forumReplies: true,
  mentions: true,
  system: true
};

const DEFAULT_PRIVACY = {
  profileVisible: true,
  showFollowerCounts: true
};

export async function GET() {
  try {
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

    const [prefs, privacy] = await Promise.all([
      prisma.notificationPreference.findUnique({
        where: { userId: user.id }
      }),
      prisma.privacyPreference.findUnique({
        where: { userId: user.id }
      })
    ]);

    return NextResponse.json({
      notifications: prefs
        ? {
            forumComments: prefs.forumComments,
            forumReplies: prefs.forumReplies,
            mentions: prefs.mentions,
            system: prefs.system
          }
        : DEFAULT_PREFS,
      privacy: privacy
        ? {
            profileVisible: privacy.profileVisible,
            showFollowerCounts: privacy.showFollowerCounts
          }
        : DEFAULT_PRIVACY
    });
  } catch (error) {
    console.error('[SETTINGS GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json().catch(() => ({}));
    const notifications = body?.notifications || {};
    const privacy = body?.privacy || {};

    const nextPrefs = {
      forumComments: typeof notifications.forumComments === 'boolean' ? notifications.forumComments : DEFAULT_PREFS.forumComments,
      forumReplies: typeof notifications.forumReplies === 'boolean' ? notifications.forumReplies : DEFAULT_PREFS.forumReplies,
      mentions: typeof notifications.mentions === 'boolean' ? notifications.mentions : DEFAULT_PREFS.mentions,
      system: typeof notifications.system === 'boolean' ? notifications.system : DEFAULT_PREFS.system
    };

    const nextPrivacy = {
      profileVisible: typeof privacy.profileVisible === 'boolean' ? privacy.profileVisible : DEFAULT_PRIVACY.profileVisible,
      showFollowerCounts: typeof privacy.showFollowerCounts === 'boolean' ? privacy.showFollowerCounts : DEFAULT_PRIVACY.showFollowerCounts
    };

    const [updated, updatedPrivacy] = await Promise.all([
      prisma.notificationPreference.upsert({
        where: { userId: user.id },
        update: nextPrefs,
        create: {
          userId: user.id,
          ...nextPrefs
        }
      }),
      prisma.privacyPreference.upsert({
        where: { userId: user.id },
        update: nextPrivacy,
        create: {
          userId: user.id,
          ...nextPrivacy
        }
      })
    ]);

    return NextResponse.json({
      notifications: {
        forumComments: updated.forumComments,
        forumReplies: updated.forumReplies,
        mentions: updated.mentions,
        system: updated.system
      },
      privacy: {
        profileVisible: updatedPrivacy.profileVisible,
        showFollowerCounts: updatedPrivacy.showFollowerCounts
      }
    });
  } catch (error) {
    console.error('[SETTINGS POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
