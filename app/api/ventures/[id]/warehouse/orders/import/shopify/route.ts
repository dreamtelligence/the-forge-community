import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  importShopifyOrders,
  WarehouseImportValidationError,
} from '@/lib/warehouse/import';
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
    const summary = await importShopifyOrders(id, access.userId, body);
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof WarehouseImportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to import Shopify orders:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
