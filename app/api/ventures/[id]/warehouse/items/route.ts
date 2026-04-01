import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function getAuthorizedUserAndVenture(ventureId: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) return { user: null, venture: null };

  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      OR: [
        { ownerId: user.id },
        {
          squad: {
            members: {
              some: {
                userId: user.id,
                leftAt: null,
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return { user, venture };
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
  const { user, venture } = await getAuthorizedUserAndVenture(id, session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }
  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();

  const items = await prisma.warehouseItem.findMany({
    where: {
      ventureId: id,
      ...(query
        ? {
            OR: [
              { sku: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { barcode: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      defaultBin: {
        select: { id: true, code: true, label: true },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  return NextResponse.json(items);
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
  const { user, venture } = await getAuthorizedUserAndVenture(id, session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }
  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const sku = String(body?.sku ?? '').trim();
    const name = String(body?.name ?? '').trim();
    const unit = String(body?.unit ?? 'pcs').trim() || 'pcs';
    const quantityOnHand = Number.isFinite(body?.quantityOnHand) ? Number(body.quantityOnHand) : 0;
    const reservedQuantity = Number.isFinite(body?.reservedQuantity) ? Number(body.reservedQuantity) : 0;
    const reorderLevel = Number.isFinite(body?.reorderLevel) ? Number(body.reorderLevel) : 0;
    const defaultBinId = body?.defaultBinId ? String(body.defaultBinId).trim() : null;

    if (!sku || !name) {
      return NextResponse.json({ error: 'sku und name sind erforderlich' }, { status: 400 });
    }
    if (quantityOnHand < 0 || reservedQuantity < 0 || reorderLevel < 0) {
      return NextResponse.json({ error: 'Mengen duerfen nicht negativ sein' }, { status: 400 });
    }

    if (defaultBinId) {
      const bin = await prisma.storageBin.findFirst({
        where: {
          id: defaultBinId,
          ventureId: id,
          isActive: true,
        },
        select: { id: true },
      });
      if (!bin) {
        return NextResponse.json(
          { error: 'defaultBinId ist ungueltig oder gehoert nicht zu diesem Venture' },
          { status: 400 }
        );
      }
    }

    const item = await prisma.warehouseItem.create({
      data: {
        ventureId: id,
        sku,
        name,
        barcode: body?.barcode ? String(body.barcode) : null,
        description: body?.description ? String(body.description) : null,
        unit,
        quantityOnHand,
        reservedQuantity,
        reorderLevel,
        defaultBinId,
        createdById: user.id,
      },
    });

    if (quantityOnHand > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          ventureId: id,
          itemId: item.id,
          type: 'IN',
          quantity: quantityOnHand,
          previousQty: 0,
          newQty: quantityOnHand,
          referenceType: 'INITIAL_STOCK',
          createdById: user.id,
        },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'SKU existiert bereits in diesem Venture' }, { status: 409 });
    }
    console.error('Failed to create warehouse item:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
