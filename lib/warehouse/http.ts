import { NextResponse } from 'next/server';
import {
  getWarehouseAccess,
  type WarehouseAccessResult,
} from '@/lib/warehouse/access';

export function warehouseAccessErrorResponse(
  access: Extract<WarehouseAccessResult, { ok: false }>
): NextResponse {
  if (access.reason === 'USER_NOT_FOUND') {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json(
    { error: 'Venture nicht gefunden oder Zugriff verweigert' },
    { status: 404 }
  );
}

export async function resolveWarehouseAccess(email: string, ventureId: string) {
  return getWarehouseAccess(email, ventureId);
}
