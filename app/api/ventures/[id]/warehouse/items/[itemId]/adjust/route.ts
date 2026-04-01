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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, itemId } = await params;
  const { user, venture } = await getAuthorizedUserAndVenture(id, session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }
  if (!venture) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const delta = Number.isFinite(body?.delta) ? Number(body.delta) : null;
    const newQuantityInput = Number.isFinite(body?.newQuantity) ? Number(body.newQuantity) : null;
    const reason = body?.reason ? String(body.reason) : null;
    const referenceType = body?.referenceType ? String(body.referenceType) : 'MANUAL_ADJUSTMENT';
    const binId = body?.binId ? String(body.binId) : null;

    if (delta === null && newQuantityInput === null) {
      return NextResponse.json({ error: 'delta oder newQuantity ist erforderlich' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (binId) {
        const bin = await tx.storageBin.findFirst({
          where: {
            id: binId,
            ventureId: id,
            isActive: true,
          },
          select: { id: true },
        });
        if (!bin) {
          throw new Error('BIN_NOT_FOUND');
        }
      }

      const item = await tx.warehouseItem.findFirst({
        where: { id: itemId, ventureId: id },
      });

      if (!item) {
        throw new Error('ITEM_NOT_FOUND');
      }

      const previousQty = item.quantityOnHand;
      const newQty = newQuantityInput !== null ? newQuantityInput : previousQty + (delta as number);

      if (newQty < 0) {
        throw new Error('NEGATIVE_STOCK');
      }

      const updatedItem = await tx.warehouseItem.update({
        where: { id: item.id },
        data: { quantityOnHand: newQty },
      });

      let type: 'IN' | 'OUT' | 'ADJUST' = 'ADJUST';
      let qtyForLog = Math.abs(newQty - previousQty);

      if (newQuantityInput === null) {
        if ((delta as number) > 0) type = 'IN';
        if ((delta as number) < 0) type = 'OUT';
        qtyForLog = Math.abs(delta as number);
      }

      await tx.inventoryTransaction.create({
        data: {
          ventureId: id,
          itemId: item.id,
          binId,
          type,
          quantity: qtyForLog,
          previousQty,
          newQty,
          referenceType,
          notes: reason,
          createdById: user.id,
        },
      });

      return updatedItem;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'ITEM_NOT_FOUND') {
      return NextResponse.json({ error: 'Artikel nicht gefunden' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'NEGATIVE_STOCK') {
      return NextResponse.json({ error: 'Bestand kann nicht negativ werden' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'BIN_NOT_FOUND') {
      return NextResponse.json({ error: 'binId ist ungueltig' }, { status: 400 });
    }
    console.error('Failed to adjust stock:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
