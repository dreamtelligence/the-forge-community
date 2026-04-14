import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createStorageBin,
  listStorageBins,
  WarehouseBinValidationError,
} from '@/lib/warehouse/bins';
import { parseWarehouseTake } from '@/lib/warehouse/contracts';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  const { searchParams } = new URL(req.url);
  const bins = await listStorageBins(id, {
    code: searchParams.get('code'),
    query: searchParams.get('q'),
    take: parseWarehouseTake(searchParams.get('take'), { fallback: 30, max: 100 }),
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
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const body = await req.json();
    const created = await createStorageBin(id, body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error instanceof WarehouseBinValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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
