import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { sendNotification } from '@/lib/forum/notifications';
import { runSerializableTransaction } from '@/lib/utils/transaction-retry';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { inviteId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action === 'decline' ? 'decline' : body?.action === 'accept' ? 'accept' : null;

    if (!action) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'decline') {
      const invite = await prisma.squadInvite.findFirst({
        where: {
          id: inviteId,
          invitedUserId: user.id,
          status: 'PENDING',
        },
        select: {
          id: true,
          invitedById: true,
          squad: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!invite) {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
      }

      await prisma.squadInvite.update({
        where: { id: invite.id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      });

      try {
        await sendNotification({
          recipientId: invite.invitedById,
          actorId: user.id,
          type: 'SYSTEM',
          title: `Einladung abgelehnt: ${invite.squad.name}`,
          message: `${user.name || user.email} hat die Squad-Einladung abgelehnt.`,
          link: `/squads/${invite.squad.id}`,
        });
      } catch (error) {
        console.error('Failed to notify squad lead about declined invite:', error);
      }

      return NextResponse.json({ success: true, status: 'declined' });
    }

    const acceptedInvite = await runSerializableTransaction(async (tx) => {
      const invite = await tx.squadInvite.findFirst({
        where: {
          id: inviteId,
          invitedUserId: user.id,
          status: 'PENDING',
        },
        select: {
          id: true,
          squadId: true,
          invitedById: true,
          squad: {
            select: {
              id: true,
              name: true,
              maxMembers: true,
              members: {
                where: { leftAt: null },
                select: {
                  id: true,
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (!invite) {
        throw new Error('INVITE_NOT_FOUND');
      }

      const alreadyMember = invite.squad.members.find((member) => member.userId === user.id);
      if (alreadyMember) {
        await tx.squadInvite.update({
          where: { id: invite.id },
          data: {
            status: 'ACCEPTED',
            respondedAt: new Date(),
          },
        });

        return {
          squadId: invite.squad.id,
          squadName: invite.squad.name,
          invitedById: invite.invitedById,
        };
      }

      if (invite.squad.members.length >= invite.squad.maxMembers) {
        throw new Error('SQUAD_FULL');
      }

      const existingMembership = await tx.squadMember.findUnique({
        where: {
          userId_squadId: {
            userId: user.id,
            squadId: invite.squadId,
          },
        },
        select: {
          id: true,
          leftAt: true,
        },
      });

      if (existingMembership) {
        await tx.squadMember.update({
          where: { id: existingMembership.id },
          data: {
            leftAt: null,
            role: 'MEMBER',
          },
        });
      } else {
        await tx.squadMember.create({
          data: {
            squadId: invite.squadId,
            userId: user.id,
            role: 'MEMBER',
          },
        });
      }

      await tx.squadInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      return {
        squadId: invite.squad.id,
        squadName: invite.squad.name,
        invitedById: invite.invitedById,
      };
    });

    try {
      await sendNotification({
        recipientId: acceptedInvite.invitedById,
        actorId: user.id,
        type: 'SYSTEM',
        title: `Einladung angenommen: ${acceptedInvite.squadName}`,
        message: `${user.name || user.email} ist dem Squad beigetreten.`,
        link: `/squads/${acceptedInvite.squadId}`,
      });
    } catch (error) {
      console.error('Failed to notify squad lead about accepted invite:', error);
    }

    return NextResponse.json({
      success: true,
      status: 'accepted',
      squad: {
        id: acceptedInvite.squadId,
        name: acceptedInvite.squadName,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'INVITE_NOT_FOUND') {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'SQUAD_FULL') {
      return NextResponse.json({ error: 'Squad ist inzwischen voll.' }, { status: 409 });
    }

    console.error('Error updating squad invitation:', error);
    return NextResponse.json(
      { error: 'Failed to update squad invitation', details: error.message },
      { status: 500 }
    );
  }
}
