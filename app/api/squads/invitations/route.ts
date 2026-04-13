import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

    const invites = await prisma.squadInvite.findMany({
      where: {
        invitedUserId: user.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        message: true,
        squad: {
          select: {
            id: true,
            name: true,
            mission: true,
            status: true,
            squadType: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      invitations: invites.map((invite) => ({
        id: invite.id,
        created_at: invite.createdAt,
        message: invite.message,
        squad: {
          id: invite.squad.id,
          name: invite.squad.name,
          mission: invite.squad.mission,
          status: invite.squad.status,
          squad_type: invite.squad.squadType,
        },
        invited_by: {
          id: invite.invitedBy.id,
          name: invite.invitedBy.name,
          email: invite.invitedBy.email,
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching squad invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch squad invitations', details: error.message },
      { status: 500 }
    );
  }
}
