import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { warehouseAccessErrorResponse, resolveWarehouseAccess } from '@/lib/warehouse/http';
import {
  createFulfillmentOrder,
  listFulfillmentOrders,
  parseFulfillmentOrderSourceParam,
  parseFulfillmentOrderStatusParam,
  WarehouseImportValidationError,
} from '@/lib/warehouse/orders';

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
  const orders = await listFulfillmentOrders(id, {
    status: parseFulfillmentOrderStatusParam(searchParams.get('status')),
    source: parseFulfillmentOrderSourceParam(searchParams.get('source')),
    query: searchParams.get('q'),
  });

  return NextResponse.json(orders);
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
    const order = await createFulfillmentOrder(id, access.userId, body);
    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    if (error instanceof WarehouseImportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Order existiert bereits oder Konflikt bei Idempotenz' }, { status: 409 });
    }
    console.error('Failed to create fulfillment order:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
