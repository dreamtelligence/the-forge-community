import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { CarrierType, InboundPackageStatus } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import { notifyWarehouseCustomer } from '@/lib/warehouse/customer-notifications';
import {
  canTransitionInboundStatus,
  inboundStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';

function parseStatus(value: unknown): InboundPackageStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(InboundPackageStatus).includes(value as InboundPackageStatus)
    ? (value as InboundPackageStatus)
    : undefined;
}

function parseCarrier(value: unknown): CarrierType | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.values(CarrierType).includes(value as CarrierType)
    ? (value as CarrierType)
    : undefined;
}

export async function PATCH(
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

  try {
    const body = await req.json();
    const nextStatus = parseStatus(body?.status);
    const nextCarrier = parseCarrier(body?.carrier);

    const existing = await prisma.inboundPackage.findFirst({
      where: { id: packageId, ventureId: id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Inbound-Paket nicht gefunden' }, { status: 404 });
    }

    if (nextStatus && !canTransitionInboundStatus(existing.status, nextStatus)) {
      return NextResponse.json(
        { error: `Ungueltiger Statuswechsel: ${existing.status} -> ${nextStatus}` },
        { status: 409 }
      );
    }

    let linkedOrderId: string | null | undefined = undefined;
    if (body?.linkedOrderId !== undefined) {
      if (!body?.linkedOrderId) {
        linkedOrderId = null;
      } else {
        const orderId = String(body.linkedOrderId);
        const order = await prisma.fulfillmentOrder.findFirst({
          where: { id: orderId, ventureId: id },
          select: { id: true },
        });
        if (!order) {
          return NextResponse.json({ error: 'linkedOrderId ist ungueltig' }, { status: 400 });
        }
        linkedOrderId = order.id;
      }
    }

    let customerId: string | null | undefined = undefined;
    if (body?.customerId !== undefined) {
      if (!body?.customerId) {
        customerId = null;
      } else {
        const candidate = String(body.customerId);
        const customer = await prisma.customerAccount.findFirst({
          where: { id: candidate, ventureId: id },
          select: { id: true },
        });
        if (!customer) {
          return NextResponse.json({ error: 'customerId ist ungueltig' }, { status: 400 });
        }
        customerId = customer.id;
      }
    }

    const statusPatch = nextStatus
      ? inboundStatusTimestampsPatch(existing.status, nextStatus)
      : {};

    const updated = await prisma.inboundPackage.update({
      where: { id: existing.id },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...statusPatch,
        ...(nextCarrier ? { carrier: nextCarrier } : {}),
        ...(body?.trackingNumber !== undefined
          ? { trackingNumber: body.trackingNumber ? String(body.trackingNumber) : null }
          : {}),
        ...(body?.externalReference !== undefined
          ? { externalReference: body.externalReference ? String(body.externalReference) : null }
          : {}),
        ...(body?.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
        ...(body?.photoUrls !== undefined
          ? {
              photoUrls: Array.isArray(body.photoUrls)
                ? body.photoUrls.map((v: unknown) => String(v)).filter(Boolean)
                : [],
            }
          : {}),
        ...(linkedOrderId !== undefined ? { linkedOrderId } : {}),
        ...(customerId !== undefined ? { customerId } : {}),
        handledById: access.userId,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, companyName: true },
        },
        linkedOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
        handledBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (
      nextStatus &&
      nextStatus !== existing.status &&
      updated.customer?.email
    ) {
      await notifyWarehouseCustomer({
        to: updated.customer.email,
        subject: 'LagerHub: Paketstatus aktualisiert',
        message: 'Der Status Ihres Pakets wurde aktualisiert.',
        trackingNumber: updated.trackingNumber,
        orderNumber: updated.linkedOrder?.orderNumber || null,
        status: updated.status,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update inbound package:', error);
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 });
  }
}
