import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendDirectMessage } from '@/lib/direct-messages';
import { getSquadVisibility } from '@/lib/squad-visibility';

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

    const squad = await prisma.squad.findUnique({
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
      return NextResponse.json(
        { error: 'Squad not found or not accepting members' },
        { status: 404 }
      );
    }

    if (squad.status !== 'forming' && squad.status !== 'building') {
      return NextResponse.json(
        { error: 'Squad not found or not accepting members' },
        { status: 404 }
      );
    }

    const currentMembers = squad.members.length;
    if (currentMembers >= squad.maxMembers) {
      return NextResponse.json(
        { error: 'Squad not found or not accepting members' },
        { status: 404 }
      );
    }

    const visibility = await getSquadVisibility(
      squad.id,
      { is_public: true, is_accepting_members: currentMembers < squad.maxMembers }
    );

    if (!visibility.is_public || !visibility.is_accepting_members) {
      return NextResponse.json(
        { error: 'Squad not found or not accepting members' },
        { status: 404 }
      );
    }

    const existingMember = await prisma.squadMember.findFirst({
      where: {
        squadId,
        userId: user.id,
      },
      select: { id: true, leftAt: true },
    });

    if (existingMember && !existingMember.leftAt) {
      return NextResponse.json(
        { error: 'You are already a member of this squad' },
        { status: 409 }
      );
    }

    const newMemberCount = currentMembers + 1;
    const equityShare = Number((100 / newMemberCount).toFixed(2));

    await prisma.$transaction(async (tx) => {
      if (existingMember) {
        await tx.squadMember.update({
          where: { id: existingMember.id },
          data: {
            leftAt: null,
            role: 'MEMBER',
            equityShare,
          },
        });
      } else {
        await tx.squadMember.create({
          data: {
            squadId,
            userId: user.id,
            role: 'MEMBER',
            equityShare,
          },
        });
      }

      await tx.squadMember.updateMany({
        where: { squadId, leftAt: null },
        data: { equityShare },
      });
    });

    const lead = squad.members.find((member) => member.role === 'LEAD');
    if (lead && lead.userId !== user.id) {
      const dmContent = [
        `Neue Bewerbung für Squad: ${squad.name}`,
        `Bewerber: ${user.name || user.email}`,
        message ? `Nachricht: ${message}` : null,
        `Squad Link: /squads/${squad.id}`,
      ]
        .filter(Boolean)
        .join('\n');

      try {
        await sendDirectMessage({
          senderId: user.id,
          recipientId: lead.userId,
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
    console.error('Error joining squad:', error);
    return NextResponse.json(
      { error: 'Failed to join squad', details: error.message },
      { status: 500 }
    );
  }
}
