import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createWarehouseImportErrorEntry,
  listWarehouseImportErrors,
  WarehouseImportErrorValidationError,
} from '@/lib/warehouse/import-errors';
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
  const errors = await listWarehouseImportErrors(id, {
    provider: searchParams.get('provider'),
    resolved: searchParams.get('resolved'),
  });

  return NextResponse.json(errors);
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
    const body = await req.json().catch(() => ({}));
    const created = await createWarehouseImportErrorEntry(id, body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof WarehouseImportErrorValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to create warehouse import error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
