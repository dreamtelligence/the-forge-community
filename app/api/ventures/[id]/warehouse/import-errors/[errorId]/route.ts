import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  updateWarehouseImportErrorResolution,
  WarehouseImportErrorValidationError,
} from '@/lib/warehouse/import-errors';
import {
  resolveWarehouseAccess,
  warehouseAccessErrorResponse,
} from '@/lib/warehouse/http';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; errorId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, errorId } = await params;
  const access = await resolveWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    return warehouseAccessErrorResponse(access);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const updated = await updateWarehouseImportErrorResolution(id, errorId, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof WarehouseImportErrorValidationError) {
      const status = error.code === 'IMPORT_ERROR_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Failed to update warehouse import error:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
