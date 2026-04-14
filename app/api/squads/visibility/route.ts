import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { setSquadVisibility } from '@/lib/user/squad-visibility';

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const squadId = String(body.squad_id ?? '');
    const hasPublic = typeof body.is_public === 'boolean';
    const hasAccepting = typeof body.is_accepting_members === 'boolean';

    if (!squadId) {
      return NextResponse.json({ error: 'Missing squad_id' }, { status: 400 });
    }

    if (!hasPublic && !hasAccepting) {
      return NextResponse.json({ error: 'No visibility fields provided' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      select: {
        id: true,
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

    const isLead = squad.members.some(
      (member) => member.userId === user.id && member.role === 'LEAD'
    );
    if (!isLead) {
      return NextResponse.json({ error: 'Only the squad lead can update visibility' }, { status: 403 });
    }

    const currentMembers = squad.members.length;
    const defaults = {
      is_public: true,
      is_accepting_members: currentMembers < squad.maxMembers,
    };

    const next = await setSquadVisibility(
      squadId,
      {
        is_public: hasPublic ? body.is_public : undefined,
        is_accepting_members: hasAccepting ? body.is_accepting_members : undefined,
      },
      defaults
    );

    return NextResponse.json({
      success: true,
      squad: {
        id: squadId,
        is_public: next.is_public,
        is_accepting_members: next.is_accepting_members,
      },
    });
  } catch (error: any) {
    console.error('Error updating squad visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update squad visibility', details: error.message },
      { status: 500 }
    );
  }
}
