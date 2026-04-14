import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listShipments } from '@/lib/warehouse/shipments';
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
  const shipments = await listShipments(id, {
    status: searchParams.get('status'),
    orderId: searchParams.get('orderId'),
  });

  return NextResponse.json(shipments);
}
