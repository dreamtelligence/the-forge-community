import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const DELETE_CONFIRM = 'DELETE';

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== DELETE_CONFIRM) {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      profileSlug: true,
      accountStatus: true,
      phone: true,
      birthday: true,
      addressStreet: true,
      addressCity: true,
      addressZip: true,
      addressCountry: true,
      instagram: true,
      linkedin: true,
      bio: true,
      goal: true,
      skills: true,
      createdAt: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.accountStatus === 'DELETED') {
    return NextResponse.json({ error: 'Account already deleted' }, { status: 409 });
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent');
  const now = new Date();
  const tombstoneEmail = `deleted+${user.id}@stakeandscale.local`;

  await prisma.$transaction([
    prisma.userDeletion.create({
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        data: {
          ip,
          userAgent,
          createdAt: user.createdAt,
          profileSlug: user.profileSlug,
          image: user.image,
          phone: user.phone,
          birthday: user.birthday,
          addressStreet: user.addressStreet,
          addressCity: user.addressCity,
          addressZip: user.addressZip,
          addressCountry: user.addressCountry,
          instagram: user.instagram,
          linkedin: user.linkedin,
          bio: user.bio,
          goal: user.goal,
          skills: user.skills
        }
      }
    }),
    prisma.notificationPreference.deleteMany({
      where: { userId: user.id }
    }),
    prisma.privacyPreference.deleteMany({
      where: { userId: user.id }
    }),
    prisma.userFollow.deleteMany({
      where: {
        OR: [{ followerId: user.id }, { followingId: user.id }]
      }
    }),
    prisma.session.deleteMany({
      where: { userId: user.id }
    }),
    prisma.account.deleteMany({
      where: { userId: user.id }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        accountStatus: 'DELETED',
        deletedAt: now,
        deletedReason: 'USER_REQUEST',
        name: 'Deleted Founder',
        email: tombstoneEmail,
        profileSlug: null,
        image: null,
        phone: null,
        birthday: null,
        addressStreet: null,
        addressCity: null,
        addressZip: null,
        addressCountry: null,
        instagram: null,
        linkedin: null,
        bio: null,
        goal: null,
        skills: []
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
