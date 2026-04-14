import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { ReturnStatus } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import { canTransitionReturnStatus, returnStatusTimestampsPatch } from '@/lib/warehouse/transitions';

function parseStatus(value: unknown): ReturnStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(ReturnStatus).includes(value as ReturnStatus)
    ? (value as ReturnStatus)
    : undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; returnId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, returnId } = await params;
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
    const body = await req.json();
    const nextStatus = parseStatus(body?.status);

    const existing = await prisma.returnItem.findFirst({
      where: { id: returnId, ventureId: id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Return nicht gefunden' }, { status: 404 });
    }

    if (nextStatus && !canTransitionReturnStatus(existing.status, nextStatus)) {
      return NextResponse.json({ error: 'Ungueltiger Return-Statuswechsel' }, { status: 409 });
    }

    const updated = await prisma.returnItem.update({
      where: { id: existing.id },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextStatus ? returnStatusTimestampsPatch(existing.status, nextStatus) : {}),
        ...(body?.reason !== undefined ? { reason: body.reason ? String(body.reason) : null } : {}),
        ...(body?.conditionNote !== undefined
          ? { conditionNote: body.conditionNote ? String(body.conditionNote) : null }
          : {}),
        ...(body?.quantity !== undefined && Number.isFinite(body.quantity)
          ? { quantity: Math.max(1, Math.trunc(Number(body.quantity))) }
          : {}),
        handledById: access.userId,
      },
      include: {
        order: { select: { id: true, orderNumber: true, status: true } },
        orderLine: { select: { id: true, sku: true, title: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update return item:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
