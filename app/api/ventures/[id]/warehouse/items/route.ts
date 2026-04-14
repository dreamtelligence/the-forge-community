import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { warehouseAccessErrorResponse, resolveWarehouseAccess } from '@/lib/warehouse/http';
import {
  createWarehouseItem,
  listWarehouseItems,
  WarehouseItemValidationError,
} from '@/lib/warehouse/items';

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
  const items = await listWarehouseItems(id, {
    query: searchParams.get('q'),
  });

  return NextResponse.json(items);
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
    const item = await createWarehouseItem(id, access.userId, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error instanceof WarehouseItemValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'SKU existiert bereits in diesem Venture' }, { status: 409 });
    }
    console.error('Failed to create warehouse item:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
