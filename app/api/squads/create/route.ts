import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { setSquadVisibility } from '@/lib/squad-visibility';
import type { CreateSquadRequest } from '@/types/database';

function toSlug(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'squad';
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.squad.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: CreateSquadRequest = await request.json();
    const name = String(body.name ?? '').trim();
    const mission = typeof body.mission === 'string' ? body.mission.trim() : '';
    const squadType = typeof body.squad_type === 'string' ? body.squad_type : 'venture';
    const requestedMaxMembers = Number(body.max_members ?? 5);
    const maxMembers = Number.isFinite(requestedMaxMembers)
      ? Math.min(Math.max(Math.floor(requestedMaxMembers), 2), 10)
      : 5;
    const isPublic = body.is_public !== false;

    if (name.length < 3) {
      return NextResponse.json(
        { error: 'Squad name must be at least 3 characters' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please complete your profile first.' },
        { status: 404 }
      );
    }

    const slug = await generateUniqueSlug(name);

    const squad = await prisma.$transaction(async (tx) => {
      const created = await tx.squad.create({
        data: {
          name,
          description: mission || null,
          mission: mission || null,
          slug,
          status: 'forming',
          squadType,
          minMembers: 2,
          maxMembers,
        },
      });

      await tx.squadMember.create({
        data: {
          squadId: created.id,
          userId: user.id,
          role: 'LEAD',
          equityShare: Number((100 / maxMembers).toFixed(2)),
        },
      });

      await tx.squadWallet.create({
        data: { squadId: created.id },
      });

      return created;
    });

    const visibility = await setSquadVisibility(
      squad.id,
      { is_public: isPublic, is_accepting_members: true },
      { is_public: true, is_accepting_members: true }
    );

    console.log(`✅ Squad created: ${squad.name} (${squad.id}) by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      squad: {
        id: squad.id,
        name: squad.name,
        mission: squad.mission,
        status: squad.status,
        squad_type: squad.squadType,
        is_public: visibility.is_public,
        is_accepting_members: visibility.is_accepting_members,
        max_members: squad.maxMembers,
        current_members: 1,
        created_at: squad.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating squad:', error);

    if (error.message?.toLowerCase().includes('unique')) {
      return NextResponse.json(
        { error: 'A squad with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create squad', details: error.message },
      { status: 500 }
    );
  }
}
