import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CarrierType, InboundPackageStatus } from '@prisma/client';
import { notifyWarehouseCustomer } from '@/lib/warehouse/customer-notifications';

const DEFAULT_PHOTO_RETENTION_DAYS = 30;

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
  const status = searchParams.get('status');
  const parsedStatus = Object.values(InboundPackageStatus).includes(status as InboundPackageStatus)
    ? (status as InboundPackageStatus)
    : undefined;

  const packages = await prisma.inboundPackage.findMany({
    where: {
      ventureId: id,
      ...(parsedStatus ? { status: parsedStatus } : {}),
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      linkedOrder: {
        select: { id: true, orderNumber: true, status: true },
      },
      handledBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ receivedAt: 'desc' }],
  });

  return NextResponse.json(packages);
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
    const rawCustomerId = body?.customerId ? String(body.customerId).trim() : '';
    const rawLinkedOrderId = body?.linkedOrderId ? String(body.linkedOrderId).trim() : '';
    const retentionDaysInput = Number.isFinite(body?.photoRetentionDays)
      ? Number(body.photoRetentionDays)
      : DEFAULT_PHOTO_RETENTION_DAYS;
    const retentionDays = Math.max(1, Math.min(365, retentionDaysInput));
    const parsedCarrier = Object.values(CarrierType).includes(body?.carrier as CarrierType)
      ? (body.carrier as CarrierType)
      : CarrierType.OTHER;
    const parsedInboundStatus = Object.values(InboundPackageStatus).includes(body?.status as InboundPackageStatus)
      ? (body.status as InboundPackageStatus)
      : InboundPackageStatus.RECEIVED;

    const photoRetentionUntil = new Date();
    photoRetentionUntil.setDate(photoRetentionUntil.getDate() + retentionDays);

    let customerId: string | null = null;
    let customerEmail: string | null = null;
    if (rawCustomerId) {
      const customer = await prisma.customerAccount.findFirst({
        where: {
          id: rawCustomerId,
          ventureId: id,
        },
        select: { id: true, email: true },
      });
      if (!customer) {
        return NextResponse.json({ error: 'customerId ist ungueltig' }, { status: 400 });
      }
      customerId = customer.id;
      customerEmail = customer.email;
    }

    let linkedOrderId: string | null = null;
    let linkedOrderNumber: string | null = null;
    if (rawLinkedOrderId) {
      const order = await prisma.fulfillmentOrder.findFirst({
        where: {
          id: rawLinkedOrderId,
          ventureId: id,
        },
        select: { id: true, orderNumber: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'linkedOrderId ist ungueltig' }, { status: 400 });
      }
      linkedOrderId = order.id;
      linkedOrderNumber = order.orderNumber;
    }

    const created = await prisma.inboundPackage.create({
      data: {
        ventureId: id,
        customerId,
        linkedOrderId,
        carrier: parsedCarrier,
        trackingNumber: body?.trackingNumber ? String(body.trackingNumber) : null,
        externalReference: body?.externalReference ? String(body.externalReference) : null,
        status: parsedInboundStatus,
        photoUrls: Array.isArray(body?.photoUrls)
          ? body.photoUrls.map((v: unknown) => String(v)).filter(Boolean)
          : [],
        photoRetentionUntil,
        notes: body?.notes ? String(body.notes) : null,
        handledById: user.id,
      },
    });

    if (customerEmail) {
      await notifyWarehouseCustomer({
        to: customerEmail,
        subject: 'LagerHub: Paketannahme bestaetigt',
        message: 'Ihr Paket wurde im Lager angenommen und dokumentiert.',
        trackingNumber: created.trackingNumber,
        orderNumber: linkedOrderNumber,
        status: created.status,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create inbound package:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
