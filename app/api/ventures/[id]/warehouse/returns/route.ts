import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { parseWarehouseTake } from '@/lib/warehouse/contracts';
import {
  createReturnItem,
  listReturnItems,
  WarehouseReturnValidationError,
} from '@/lib/warehouse/returns';
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
  const entries = await listReturnItems(id, {
    status: searchParams.get('status'),
    orderId: searchParams.get('orderId'),
    take: parseWarehouseTake(searchParams.get('take'), { fallback: 50, max: 100 }),
  });

  return NextResponse.json(entries);
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
    const created = await createReturnItem(id, access.userId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error instanceof WarehouseReturnValidationError) {
      const status = error.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to create return item:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
