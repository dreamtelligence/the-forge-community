import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  adjustWarehouseItemStock,
  WarehouseInventoryValidationError,
} from '@/lib/warehouse/inventory';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, itemId } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const body = await req.json();
    const result = await adjustWarehouseItemStock(id, itemId, access.userId, body);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof WarehouseInventoryValidationError) {
      const status =
        error.code === 'ITEM_NOT_FOUND'
          ? 404
          : error.code === 'BIN_NOT_FOUND' || error.code === 'NEGATIVE_STOCK'
            ? 400
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to adjust stock:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
