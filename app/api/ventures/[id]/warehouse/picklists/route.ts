import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PickListStatus } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';

function parseStatus(value: string | null): PickListStatus | undefined {
  if (!value) return undefined;
  return Object.values(PickListStatus).includes(value as PickListStatus)
    ? (value as PickListStatus)
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
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId')?.trim();
  const status = parseStatus(searchParams.get('status'));

  const pickLists = await prisma.pickList.findMany({
    where: {
      ventureId: id,
      ...(orderId ? { orderId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      order: {
        select: { id: true, orderNumber: true, status: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      items: {
        include: {
          orderLine: {
            select: {
              id: true,
              sku: true,
              title: true,
              quantity: true,
              pickedQuantity: true,
              packedQuantity: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ generatedAt: 'desc' }],
  });

  return NextResponse.json(pickLists);
}
