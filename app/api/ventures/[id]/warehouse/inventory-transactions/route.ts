import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { InventoryTransactionType } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';

function parseType(value: string | null): InventoryTransactionType | undefined {
  if (!value) return undefined;
  return Object.values(InventoryTransactionType).includes(value as InventoryTransactionType)
    ? (value as InventoryTransactionType)
    : undefined;
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

  const { searchParams } = new URL(req.url);
  const type = parseType(searchParams.get('type'));
  const sku = searchParams.get('sku')?.trim();
  const takeParam = Number(searchParams.get('take'));
  const take = Number.isFinite(takeParam) ? Math.max(1, Math.min(200, takeParam)) : 50;

  const events = await prisma.inventoryTransaction.findMany({
    where: {
      ventureId: id,
      ...(type ? { type } : {}),
      ...(sku
        ? {
            item: {
              sku: { equals: sku, mode: 'insensitive' },
            },
          }
        : {}),
    },
    include: {
      item: {
        select: { id: true, sku: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      bin: {
        select: { id: true, code: true, label: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take,
  });

  return NextResponse.json(events);
}
