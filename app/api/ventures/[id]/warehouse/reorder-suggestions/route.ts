import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getWarehouseReorderSuggestions } from '@/lib/warehouse/automation';
import {
  parseWarehouseBooleanFlag,
  parseWarehouseTake,
} from '@/lib/warehouse/contracts';
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

  try {
    const { searchParams } = new URL(req.url);
    const take = parseWarehouseTake(searchParams.get('take'), { fallback: 20, max: 200 });
    const includeHealthy = parseWarehouseBooleanFlag(searchParams.get('includeHealthy'));

    const result = await getWarehouseReorderSuggestions(id, {
      take,
      includeHealthy,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to compute reorder suggestions:', error);
    return NextResponse.json({ error: 'Bestellvorschlaege konnten nicht berechnet werden' }, { status: 500 });
  }
}
