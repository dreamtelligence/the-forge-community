import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  updatePickList,
  WarehousePickListValidationError,
} from '@/lib/warehouse/picklists';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pickListId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, pickListId } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const body = await req.json();
    const result = await updatePickList(id, pickListId, body);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof WarehousePickListValidationError) {
      const status =
        error.code === 'PICKLIST_NOT_FOUND'
          ? 404
          : error.code === 'INVALID_PICKLIST_TRANSITION'
            ? 409
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Failed to update pick list:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
