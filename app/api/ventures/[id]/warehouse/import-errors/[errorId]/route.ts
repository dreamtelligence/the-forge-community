import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getWarehouseAccess } from '@/lib/warehouse/access';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; errorId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, errorId } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const resolved = body?.resolved !== false;

    const existing = await prisma.warehouseImportError.findFirst({
      where: { id: errorId, ventureId: id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Import-Fehler nicht gefunden' }, { status: 404 });
    }

    const updated = await prisma.warehouseImportError.update({
      where: { id: existing.id },
      data: {
        resolvedAt: resolved ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update warehouse import error:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
