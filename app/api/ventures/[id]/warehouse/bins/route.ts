import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { StorageBinType } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';

function parseBinType(value: unknown): StorageBinType {
  if (typeof value !== 'string') return StorageBinType.SHELF;
  return Object.values(StorageBinType).includes(value as StorageBinType)
    ? (value as StorageBinType)
    : StorageBinType.SHELF;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Venture nicht gefunden oder Zugriff verweigert' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim();
  const q = searchParams.get('q')?.trim();
  const takeParam = Number(searchParams.get('take'));
  const take = Number.isFinite(takeParam) ? Math.max(1, Math.min(100, takeParam)) : 30;

  const bins = await prisma.storageBin.findMany({
    where: {
      ventureId: id,
      isActive: true,
      ...(code ? { code: { equals: code, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { label: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      code: true,
      label: true,
      binType: true,
      locationId: true,
      location: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: [{ code: 'asc' }],
    take,
  });

  return NextResponse.json(bins);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Venture nicht gefunden oder Zugriff verweigert' },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return NextResponse.json({ error: 'code ist erforderlich' }, { status: 400 });
    }

    let locationId: string | null = null;
    if (typeof body?.locationId === 'string' && body.locationId.trim()) {
      const location = await prisma.warehouseLocation.findFirst({
        where: { id: body.locationId.trim(), ventureId: id },
        select: { id: true },
      });
      if (!location) {
        return NextResponse.json({ error: 'locationId ist ungueltig' }, { status: 400 });
      }
      locationId = location.id;
    }

    const created = await prisma.storageBin.create({
      data: {
        ventureId: id,
        code,
        label: typeof body?.label === 'string' && body.label.trim() ? body.label.trim() : null,
        binType: parseBinType(body?.binType),
        capacity: Number.isFinite(body?.capacity) ? Number(body.capacity) : null,
        locationId,
      },
      select: {
        id: true,
        code: true,
        label: true,
        binType: true,
        locationId: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bin-Code existiert bereits in diesem Venture' },
        { status: 409 }
      );
    }
    console.error('Failed to create storage bin:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
