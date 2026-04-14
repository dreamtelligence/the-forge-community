import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getVentureAccessByEmail } from '@/lib/ventures/access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: ventureId, supplierId } = await params;
  const access = await getVentureAccessByEmail(session.user.email, ventureId);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId, ventureId: access.ventureId },
      include: {
        samples: {
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error('Failed to fetch supplier details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: ventureId, supplierId } = await params;
  const access = await getVentureAccessByEmail(session.user.email, ventureId);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }
  
  try {
    const data = await req.json();
    const updated = await prisma.supplier.update({
      where: { id: supplierId, ventureId: access.ventureId },
      data
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update failed:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: ventureId, supplierId } = await params;
  const access = await getVentureAccessByEmail(session.user.email, ventureId);
  if (!access) {
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    await prisma.supplier.delete({
      where: { id: supplierId, ventureId: access.ventureId }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete failed:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
