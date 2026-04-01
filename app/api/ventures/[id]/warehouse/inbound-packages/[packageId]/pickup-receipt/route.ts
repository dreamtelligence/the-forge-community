import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import {
  canTransitionInboundStatus,
  inboundStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';
import { notifyWarehouseCustomer } from '@/lib/warehouse/customer-notifications';

function createReceiptNumber(packageId: string): string {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `PU-${stamp}-${packageId.slice(-6).toUpperCase()}`;
}

function extractReceiptNumber(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[PICKUP_RECEIPT:([A-Z0-9-]+)\]/);
  return match?.[1] || null;
}

function appendNote(base: string | null, note: string): string {
  if (!base) return note;
  return `${base}\n${note}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id, packageId } = await params;
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const recipientName =
    typeof body?.recipientName === 'string' && body.recipientName.trim()
      ? body.recipientName.trim()
      : 'Unbekannt';
  const recipientDocument =
    typeof body?.recipientDocument === 'string' && body.recipientDocument.trim()
      ? body.recipientDocument.trim()
      : null;

  try {
    const existing = await prisma.inboundPackage.findFirst({
      where: { id: packageId, ventureId: id },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        linkedOrder: {
          select: { id: true, orderNumber: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Inbound-Paket nicht gefunden' }, { status: 404 });
    }

    if (existing.status === 'CLOSED') {
      return NextResponse.json({ error: 'Paket ist bereits geschlossen' }, { status: 409 });
    }

    const currentReceipt = extractReceiptNumber(existing.notes);
    if (existing.status === 'PICKED_UP' && currentReceipt) {
      return NextResponse.json({
        package: existing,
        receipt: {
          receiptNumber: currentReceipt,
          packageId: existing.id,
          trackingNumber: existing.trackingNumber,
          pickedUpAt: existing.pickedUpAt || new Date().toISOString(),
          recipientName,
          recipientDocument,
        },
      });
    }

    if (
      existing.status !== 'PICKED_UP' &&
      !canTransitionInboundStatus(existing.status, 'PICKED_UP')
    ) {
      return NextResponse.json(
        { error: `Ungueltiger Statuswechsel: ${existing.status} -> PICKED_UP` },
        { status: 409 }
      );
    }

    const receiptNumber = createReceiptNumber(existing.id);
    const statusPatch =
      existing.status === 'PICKED_UP'
        ? {}
        : inboundStatusTimestampsPatch(existing.status, 'PICKED_UP');

    const noteLine =
      `[PICKUP_RECEIPT:${receiptNumber}] recipient=${recipientName}` +
      (recipientDocument ? ` doc=${recipientDocument}` : '');

    const updated = await prisma.inboundPackage.update({
      where: { id: existing.id },
      data: {
        status: 'PICKED_UP',
        ...statusPatch,
        notes: appendNote(existing.notes, noteLine),
        handledById: access.userId,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        linkedOrder: {
          select: { id: true, orderNumber: true },
        },
      },
    });

    if (updated.customer?.email) {
      await notifyWarehouseCustomer({
        to: updated.customer.email,
        subject: 'LagerHub: Paketabholung quittiert',
        message: 'Die Abholung Ihres Pakets wurde digital quittiert.',
        trackingNumber: updated.trackingNumber,
        orderNumber: updated.linkedOrder?.orderNumber || null,
        status: updated.status,
        receiptNumber,
      });
    }

    return NextResponse.json({
      package: updated,
      receipt: {
        receiptNumber,
        packageId: updated.id,
        trackingNumber: updated.trackingNumber,
        pickedUpAt: updated.pickedUpAt || new Date().toISOString(),
        recipientName,
        recipientDocument,
      },
    });
  } catch (error) {
    console.error('Failed to create pickup receipt:', error);
    return NextResponse.json({ error: 'Quittung konnte nicht erstellt werden' }, { status: 500 });
  }
}

