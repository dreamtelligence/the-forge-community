import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listInventoryTransactions } from '@/lib/warehouse/inventory';
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
  const takeParam = Number(searchParams.get('take'));
  const events = await listInventoryTransactions(id, {
    type: searchParams.get('type'),
    sku: searchParams.get('sku'),
    take: Number.isFinite(takeParam) ? Math.max(1, Math.min(200, takeParam)) : 50,
  });

  return NextResponse.json(events);
}
