import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createShipment,
  WarehouseShipmentValidationError,
} from '@/lib/warehouse/shipments';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

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
    const result = await createShipment(id, access.userId, body);
    return NextResponse.json(result, { status: result.reused ? 200 : 201 });
  } catch (error: any) {
    if (error instanceof WarehouseShipmentValidationError) {
      const status =
        error.code === 'ORDER_NOT_FOUND'
          ? 404
          : error.code === 'MISSING_ORDER_ID'
            ? 400
            : 409;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Failed to create shipment:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
