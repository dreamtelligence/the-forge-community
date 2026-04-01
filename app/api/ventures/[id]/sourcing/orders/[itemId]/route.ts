import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getVentureAccessByEmail } from '@/lib/venture-access';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { id, itemId } = await params;
  const access = await getVentureAccessByEmail(session.user.email, id);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const data = await req.json();
    const order = await prisma.productionOrder.update({
      where: { id: itemId, ventureId: access.ventureId },
      data
    });

    return NextResponse.json(order);
  } catch (_error) {
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string, itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { id, itemId } = await params;
  const access = await getVentureAccessByEmail(session.user.email, id);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    await prisma.productionOrder.delete({
      where: { id: itemId, ventureId: access.ventureId }
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 });
  }
}
