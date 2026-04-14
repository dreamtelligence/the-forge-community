import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getSquadVisibilityMap, type SquadVisibility } from '@/lib/user/squad-visibility';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SquadFilter = 'all' | 'my-squads' | 'open';

function toUiRole(role: string): string {
  return role.toLowerCase();
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawFilter = searchParams.get('filter');
    const filter: SquadFilter =
      rawFilter === 'my-squads' || rawFilter === 'open' ? rawFilter : 'all';

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pendingInvites = await prisma.squadInvite.findMany({
      where: {
        invitedUserId: user.id,
        status: 'PENDING',
      },
      select: {
        id: true,
        squadId: true,
      },
    });
    const inviteBySquadId = new Map(
      pendingInvites.map((invite) => [invite.squadId, invite.id])
    );

    const squadsRaw = await prisma.squad.findMany({
      where: {
        status: { not: 'archived' },
      },
      select: {
        id: true,
        name: true,
        mission: true,
        status: true,
        squadType: true,
        maxMembers: true,
        createdAt: true,
        members: {
          where: { leftAt: null },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          select: {
            userId: true,
            role: true,
            user: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const defaultsBySquad: Record<string, SquadVisibility> = {};
    for (const squad of squadsRaw) {
      defaultsBySquad[squad.id] = {
        is_public: true,
        is_accepting_members: squad.members.length < squad.maxMembers,
      };
    }

    const visibilityBySquad = await getSquadVisibilityMap(
      squadsRaw.map((squad) => squad.id),
      defaultsBySquad
    );

    const squads = squadsRaw
      .map((squad) => {
        const currentMembers = squad.members.length;
        const slotsAvailable = Math.max(squad.maxMembers - currentMembers, 0);
        const lead = squad.members.find((member) => member.role === 'LEAD') ?? squad.members[0];
        const myMembership = squad.members.find((member) => member.userId === user.id);
        const visibility = visibilityBySquad[squad.id] ?? defaultsBySquad[squad.id];
        const pendingInviteId = inviteBySquadId.get(squad.id) ?? null;

        return {
          id: squad.id,
          name: squad.name,
          mission: squad.mission,
          status: squad.status,
          squad_type: squad.squadType,
          current_members: currentMembers,
          max_members: squad.maxMembers,
          lead_name: lead?.user.name || null,
          created_at: squad.createdAt,
          is_public: visibility.is_public,
          is_accepting_members: visibility.is_accepting_members,
          slots_available: slotsAvailable,
          my_role: myMembership ? toUiRole(myMembership.role) : null,
          is_invited: Boolean(pendingInviteId),
          invite_id: pendingInviteId,
          member_count: currentMembers,
        };
      })
      .filter((squad) => {
        if (filter === 'my-squads') {
          return Boolean(squad.my_role);
        }

        if (filter === 'all') {
          return squad.is_public || Boolean(squad.my_role) || squad.is_invited;
        }

        const openByStatus = squad.status === 'forming' || squad.status === 'building';
        return (
          squad.is_public &&
          squad.is_accepting_members &&
          squad.slots_available > 0 &&
          openByStatus
        );
      });

    return NextResponse.json({
      squads,
      count: squads.length,
      filter,
    });
  } catch (error: any) {
    console.error('Error fetching squads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch squads', details: error.message },
      { status: 500 }
    );
  }
}
