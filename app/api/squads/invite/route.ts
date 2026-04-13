import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendDirectMessage } from '@/lib/direct-messages';
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

      const leadMembership = currentSquad.members.find(
        (member) => member.userId === lead.id && member.role === 'LEAD'
      );
      if (!leadMembership) {
        throw new Error('NOT_LEAD');
      }

      if (currentSquad.members.length >= currentSquad.maxMembers) {
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

      if (existingMember) {
        await tx.squadMember.update({
          where: { id: existingMember.id },
          data: {
            leftAt: null,
            role: 'MEMBER',
          },
        });
      } else {
        await tx.squadMember.create({
          data: {
            squadId,
            userId: invitee.id,
            role: 'MEMBER',
          },
        });
      }

      return {
        id: currentSquad.id,
        name: currentSquad.name,
      };
    });

    const dmContent = [
      `Du wurdest in den Squad "${squad.name}" eingeladen.`,
      `Lead: ${lead.email}`,
      `Squad Link: /squads/${squad.id}`,
    ].join('\n');

    try {
      await sendDirectMessage({
        senderId: lead.id,
        recipientId: invitee.id,
        content: dmContent,
      });
    } catch (error) {
      console.error('Failed to send invite DM:', error);
    }

    return NextResponse.json({ success: true });
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
