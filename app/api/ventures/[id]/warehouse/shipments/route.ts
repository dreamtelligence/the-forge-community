import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { ShipmentStatus } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';

function parseStatus(value: string | null): ShipmentStatus | undefined {
  if (!value) return undefined;
  return Object.values(ShipmentStatus).includes(value as ShipmentStatus)
    ? (value as ShipmentStatus)
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
  const status = parseStatus(searchParams.get('status'));
  const orderId = searchParams.get('orderId')?.trim();

  const shipments = await prisma.shipment.findMany({
    where: {
      ventureId: id,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
    },
    include: {
      order: {
        select: { id: true, orderNumber: true, status: true, source: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return NextResponse.json(shipments);
}
