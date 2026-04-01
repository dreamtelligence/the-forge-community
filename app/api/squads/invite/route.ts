import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendDirectMessage } from '@/lib/direct-messages';

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

    const squad = await prisma.squad.findUnique({
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

    if (!squad) {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
    }

    const leadMembership = squad.members.find(
      (member) => member.userId === lead.id && member.role === 'LEAD'
    );
    if (!leadMembership) {
      return NextResponse.json({ error: 'Only the squad lead can invite members' }, { status: 403 });
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

    const existingMember = await prisma.squadMember.findFirst({
      where: {
        squadId,
        userId: invitee.id,
        leftAt: null,
      },
      select: { id: true },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already in this squad or pending' }, { status: 409 });
    }

    if (squad.members.length >= squad.maxMembers) {
      return NextResponse.json({ error: 'Squad is full' }, { status: 409 });
    }

    const equityShare = Number((100 / (squad.members.length + 1)).toFixed(2));

    await prisma.$transaction(async (tx) => {
      await tx.squadMember.create({
        data: {
          squadId,
          userId: invitee.id,
          role: 'MEMBER',
          equityShare,
        },
      });

      await tx.squadMember.updateMany({
        where: { squadId, leftAt: null },
        data: { equityShare },
      });
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
    console.error('Error inviting to squad:', error);
    return NextResponse.json(
      { error: 'Failed to invite user', details: error.message },
      { status: 500 }
    );
  }
}
