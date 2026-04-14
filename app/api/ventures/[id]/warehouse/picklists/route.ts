import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  listPickLists,
  parsePickListStatusParam,
} from '@/lib/warehouse/picklists';
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
  const orderId = searchParams.get('orderId')?.trim();
  const pickLists = await listPickLists(id, {
    orderId,
    status: parsePickListStatusParam(searchParams.get('status')),
  });

  return NextResponse.json(pickLists);
}
