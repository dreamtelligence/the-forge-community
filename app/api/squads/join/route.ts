import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendDirectMessage } from '@/lib/direct-messages';
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
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!squadId) {
      return NextResponse.json({ error: 'Missing squad_id' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const membershipResult = await runSerializableTransaction(async (tx) => {
      const squad = await tx.squad.findUnique({
        where: { id: squadId },
        select: {
          id: true,
          name: true,
          mission: true,
          status: true,
          maxMembers: true,
          members: {
            where: { leftAt: null },
            select: { userId: true, role: true },
          },
        },
      });

      if (!squad) {
        throw new Error('SQUAD_NOT_JOINABLE');
      }

      const currentMembers = squad.members.length;
      const visibility = await getSquadVisibility(
        squad.id,
        { is_public: true, is_accepting_members: currentMembers < squad.maxMembers },
        tx
      );

      const isJoinableStatus = squad.status === 'forming' || squad.status === 'building';
      if (
        !isJoinableStatus ||
        currentMembers >= squad.maxMembers ||
        !visibility.is_public ||
        !visibility.is_accepting_members
      ) {
        throw new Error('SQUAD_NOT_JOINABLE');
      }

      const existingMember = await tx.squadMember.findFirst({
        where: {
          squadId,
          userId: user.id,
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
            userId: user.id,
            role: 'MEMBER',
          },
        });
      }

      return {
        squad: {
          id: squad.id,
          name: squad.name,
          mission: squad.mission,
        },
        leadUserId: squad.members.find((member) => member.role === 'LEAD')?.userId ?? null,
      };
    });

    const leadUserId = membershipResult.leadUserId;
    const squad = membershipResult.squad;
    if (leadUserId && leadUserId !== user.id) {
      const dmContent = [
        `Neues Mitglied für Squad: ${squad.name}`,
        `Beitritt: ${user.name || user.email}`,
        message ? `Nachricht: ${message}` : null,
        `Squad Link: /squads/${squad.id}`,
      ]
        .filter(Boolean)
        .join('\n');

      try {
        await sendDirectMessage({
          senderId: user.id,
          recipientId: leadUserId,
          content: dmContent,
        });
      } catch (error) {
        console.error('Failed to send application DM:', error);
      }
    }

    console.log(`✅ User ${user.name || user.email} joined squad ${squad.name}`);

    return NextResponse.json({
      success: true,
      status: 'active',
      message: `Du bist jetzt Mitglied von ${squad.name}.`,
      squad: {
        id: squad.id,
        name: squad.name,
        mission: squad.mission,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'ALREADY_MEMBER') {
      return NextResponse.json(
        { error: 'Du bist bereits Mitglied dieses Squads.' },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === 'SQUAD_NOT_JOINABLE') {
      return NextResponse.json(
        { error: 'Dieser Squad ist aktuell nicht öffentlich beitretbar.' },
        { status: 404 }
      );
    }

    console.error('Error joining squad:', error);
    return NextResponse.json(
      { error: 'Failed to join squad', details: error.message },
      { status: 500 }
    );
  }
}
