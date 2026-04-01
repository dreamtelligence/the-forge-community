import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import { getWarehouseReorderSuggestions } from '@/lib/warehouse/automation';

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Venture nicht gefunden oder Zugriff verweigert' },
      { status: 404 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const takeRaw = Number(searchParams.get('take'));
    const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(200, Math.trunc(takeRaw))) : 20;
    const includeHealthy = parseBoolean(searchParams.get('includeHealthy'));

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
