import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendDirectMessage } from '@/lib/direct-messages';
import { sendNotification } from '@/lib/notifications';
import { getSquadVisibility } from '@/lib/squad-visibility';
import { runSerializableTransaction } from '@/lib/transaction-retry';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const squadId = String(body.squad_id ?? '');
    const identifier = String(body.identifier ?? '').trim();
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';

    if (!squadId || !identifier) {
      return NextResponse.json({ error: 'Missing squad_id or identifier' }, { status: 400 });
    }

    const lead = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const invitee = await prisma.user.findFirst({
      where: identifier.includes('@')
        ? { email: identifier, accountStatus: 'ACTIVE' }
        : { id: identifier, accountStatus: 'ACTIVE' },
      select: { id: true, name: true, email: true },
    });

    if (!invitee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (invitee.id === lead.id) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
    }

    const squad = await runSerializableTransaction(async (tx) => {
      const currentSquad = await tx.squad.findUnique({
        where: { id: squadId },
        select: {
          id: true,
          name: true,
          status: true,
          maxMembers: true,
          members: {
            where: { leftAt: null },
            select: { userId: true, role: true },
          },
        },
      });

      if (!currentSquad) {
        throw new Error('SQUAD_NOT_FOUND');
      }

      if (currentSquad.status === 'archived') {
        throw new Error('SQUAD_NOT_FOUND');
      }

      const leadMembership = currentSquad.members.find(
        (member) => member.userId === lead.id && member.role === 'LEAD'
      );
      if (!leadMembership) {
        throw new Error('NOT_LEAD');
      }

      const visibility = await getSquadVisibility(
        currentSquad.id,
        {
          is_public: true,
          is_accepting_members: currentSquad.members.length < currentSquad.maxMembers,
        },
        tx
      );

      const pendingInvites = visibility.is_public
        ? 0
        : await tx.squadInvite.count({
            where: {
              squadId,
              status: 'PENDING',
            },
          });

      if (currentSquad.members.length >= currentSquad.maxMembers) {
        throw new Error('SQUAD_FULL');
      }

      if (!visibility.is_public && currentSquad.members.length + pendingInvites >= currentSquad.maxMembers) {
        throw new Error('SQUAD_FULL');
      }

      const existingMember = await tx.squadMember.findFirst({
        where: {
          squadId,
          userId: invitee.id,
        },
        select: { id: true, leftAt: true },
      });

      if (existingMember && !existingMember.leftAt) {
        throw new Error('ALREADY_MEMBER');
      }

      const invite = await tx.squadInvite.upsert({
        where: {
          squadId_invitedUserId: {
            squadId,
            invitedUserId: invitee.id,
          },
        },
        update: {
          invitedById: lead.id,
          status: 'PENDING',
          message: message || null,
          expiresAt: null,
          respondedAt: null,
        },
        create: {
          squadId,
          invitedUserId: invitee.id,
          invitedById: lead.id,
          status: 'PENDING',
          message: message || null,
        },
        select: {
          id: true,
        },
      });

      return {
        id: currentSquad.id,
        name: currentSquad.name,
        inviteId: invite.id,
      };
    });

    const dmContent = [
      `Du hast eine Einladung für den Squad "${squad.name}" erhalten.`,
      `Lead: ${lead.email}`,
      message ? `Nachricht: ${message}` : null,
      `Squad Link: /squads/${squad.id}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await sendDirectMessage({
        senderId: lead.id,
        recipientId: invitee.id,
        content: dmContent,
      });
    } catch (error) {
      console.error('Failed to send invite DM:', error);
    }

    try {
      await sendNotification({
        recipientId: invitee.id,
        actorId: lead.id,
        type: 'SYSTEM',
        title: `Neue Squad-Einladung: ${squad.name}`,
        message: message || `${lead.email} hat dich in einen Squad eingeladen.`,
        link: `/squads/${squad.id}`,
      });
    } catch (error) {
      console.error('Failed to send invite notification:', error);
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      invite: {
        id: squad.inviteId,
        squad_id: squad.id,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'SQUAD_NOT_FOUND') {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'NOT_LEAD') {
      return NextResponse.json({ error: 'Only the squad lead can invite members' }, { status: 403 });
    }

    if (error instanceof Error && error.message === 'SQUAD_FULL') {
      return NextResponse.json({ error: 'Squad is full' }, { status: 409 });
    }

    if (error instanceof Error && error.message === 'ALREADY_MEMBER') {
      return NextResponse.json({ error: 'User is already in this squad' }, { status: 409 });
    }

    console.error('Error inviting to squad:', error);
    return NextResponse.json(
      { error: 'Failed to invite user', details: error.message },
      { status: 500 }
    );
  }
}
