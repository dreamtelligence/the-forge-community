import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  deleteFulfillmentOrder,
  updateFulfillmentOrder,
  WarehouseOrderValidationError,
} from '@/lib/warehouse/orders';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, orderId } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const body = await req.json();
    const updated = await updateFulfillmentOrder(id, orderId, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof WarehouseOrderValidationError) {
      const status =
        error.code === 'ORDER_NOT_FOUND'
          ? 404
          : error.code === 'INVALID_STATUS_TRANSITION'
            ? 409
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to update fulfillment order:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, orderId } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    await deleteFulfillmentOrder(id, orderId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof WarehouseOrderValidationError) {
      const status = error.code === 'ORDER_NOT_FOUND' ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to delete fulfillment order:', error);
    return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 });
  }
}
