import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  updateReturnItem,
  WarehouseReturnValidationError,
} from '@/lib/warehouse/returns';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; returnId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, returnId } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const body = await req.json();
    const updated = await updateReturnItem(id, returnId, access.userId, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof WarehouseReturnValidationError) {
      const status =
        error.code === 'RETURN_NOT_FOUND'
          ? 404
          : error.code === 'INVALID_STATUS_TRANSITION'
            ? 409
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to update return item:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
