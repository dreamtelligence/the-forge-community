import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getSquadVisibility } from '@/lib/squad-visibility';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: squadId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
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
        squadType: true,
        maxMembers: true,
        createdAt: true,
        members: {
          where: { leftAt: null },
          select: {
            id: true,
            userId: true,
            role: true,
            equityShare: true,
            joinedAt: true,
            user: {
              select: { name: true },
            },
          },
          orderBy: [
            { role: 'asc' }, // Simplified ordering for now
            { joinedAt: 'asc' }
          ],
        },
        ventures: {
          take: 1,
        },
      },
    });

    if (!squad) {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
    }

    const venture = squad.ventures[0] || null;
    const currentMembers = squad.members.length;
    const defaults = {
      is_public: true,
      is_accepting_members: currentMembers < squad.maxMembers,
    };
    const visibility = await getSquadVisibility(squad.id, defaults);
    const isMember = squad.members.some(m => m.userId === user.id);

    if (!visibility.is_public && !isMember) {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
    }

    let phases: any[] = [];
    if (venture) {
      phases = await prisma.venturePhase.findMany({
        where: { ventureId: venture.id },
        orderBy: { phaseNumber: 'asc' }
      }).then((items) =>
        items.map((item) => ({
          id: item.id,
          phase_number: item.phaseNumber,
          phase_name: item.name,
          status: item.status,
          total_tasks: item.totalTasks,
          completed_tasks: item.completedTasks,
        }))
      );
    }

    const leadMember = squad.members.find((member) => member.role === 'LEAD') ?? squad.members[0];
    const userMember = squad.members.find(m => m.userId === user.id);
    const wallet = isMember
      ? await prisma.squadWallet.findUnique({
          where: { squadId: squad.id },
          include: {
            transactions: {
              take: 10,
              orderBy: { createdAt: 'desc' },
              include: {
                createdBy: { select: { name: true } },
              },
            },
          },
        })
      : null;

    return NextResponse.json({
      squad: {
        members: squad.members.map(m => ({
          id: m.id,
          user_id: m.userId,
          user_name: m.user.name,
          role: m.role.toLowerCase(),
          equity_share: m.equityShare,
          hours_contributed: 0,
          tasks_completed: 0,
          joined_at: m.joinedAt,
        })),
        id: squad.id,
        name: squad.name,
        mission: squad.mission,
        status: squad.status,
        squadType: squad.squadType,
        currentMembers,
        maxMembers: squad.maxMembers,
        lead_id: leadMember?.userId || null,
        lead_name: leadMember?.user.name || null,
        createdAt: squad.createdAt,
        is_public: visibility.is_public,
        is_accepting_members: visibility.is_accepting_members,
        member_count: currentMembers,
        is_member: isMember,
        user_role: userMember?.role?.toLowerCase() || null,
      },
      venture: venture
        ? {
            id: venture.id,
            name: venture.name,
            tagline: venture.description,
            status: venture.status,
            current_phase: venture.currentPhase,
            phase_completed: 0,
          }
        : null,
      phases,
      wallet,
      recent_transactions: isMember ? (wallet?.transactions || []).map((tx) => ({
        id: tx.id,
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        description: tx.description,
        createdAt: tx.createdAt,
        createdBy: {
          name: tx.createdBy?.name || 'System',
        },
      })) : [],
    });

  } catch (error: any) {
    console.error('Error fetching squad details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch squad details', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: squadId } = await params;
    const updates = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify Lead
    const squadMember = await prisma.squadMember.findFirst({
      where: {
        squadId,
        userId: user.id,
        role: 'LEAD',
        leftAt: null,
      },
    });

    if (!squadMember) {
      return NextResponse.json({ error: 'Only the squad lead can update settings' }, { status: 403 });
    }

    const updatedSquad = await prisma.squad.update({
      where: { id: squadId },
      data: {
        name: updates.name,
        mission: updates.mission,
        description: updates.description,
        status: updates.status
      }
    });

    return NextResponse.json({ success: true, squad: updatedSquad });

  } catch (error: any) {
    console.error('Error updating squad:', error);
    return NextResponse.json({ error: 'Failed to update squad' }, { status: 500 });
  }
}
