import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { FulfillmentOrderSource, FulfillmentOrderStatus, Prisma as PrismaNs } from '@prisma/client';
import { getWarehouseAccess } from '@/lib/warehouse/access';
import {
  recordWarehouseImportError,
  upsertImportedOrder,
  WarehouseImportValidationError,
} from '@/lib/warehouse/import';

function parseStatus(value: unknown): FulfillmentOrderStatus {
  if (typeof value !== 'string') return FulfillmentOrderStatus.IMPORTED;
  return Object.values(FulfillmentOrderStatus).includes(value as FulfillmentOrderStatus)
    ? (value as FulfillmentOrderStatus)
    : FulfillmentOrderStatus.IMPORTED;
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
  const access = await getWarehouseAccess(session.user.email, id);
  if (!access.ok) {
    if (access.reason === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const inputOrders = Array.isArray(body?.orders) ? body.orders : [];
    if (!inputOrders.length) {
      return NextResponse.json({ error: 'orders[] ist erforderlich' }, { status: 400 });
    }

    const summary = {
      total: inputOrders.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ index: number; orderNumber?: string; error: string }>,
    };

    for (let index = 0; index < inputOrders.length; index += 1) {
      const raw = inputOrders[index];
      const orderNumber =
        (typeof raw?.orderNumber === 'string' && raw.orderNumber.trim()) ||
        (typeof raw?.sourceOrderId === 'string' && raw.sourceOrderId.trim()) ||
        undefined;

      try {
        const result = await prisma.$transaction(async (tx) => {
          return upsertImportedOrder(tx, id, access.userId, {
            orderNumber: String(raw?.orderNumber ?? raw?.sourceOrderId ?? '').trim(),
            sourceOrderId: raw?.sourceOrderId ? String(raw.sourceOrderId) : null,
            source:
              (typeof raw?.source === 'string' &&
              Object.values(FulfillmentOrderSource).includes(raw.source as FulfillmentOrderSource)
                ? (raw.source as FulfillmentOrderSource)
                : FulfillmentOrderSource.MANUAL),
            status: parseStatus(raw?.status),
            currency: raw?.currency ? String(raw.currency) : 'EUR',
            subtotal: Number.isFinite(raw?.subtotal) ? Number(raw.subtotal) : null,
            shippingCost: Number.isFinite(raw?.shippingCost) ? Number(raw.shippingCost) : null,
            totalAmount: Number.isFinite(raw?.totalAmount) ? Number(raw.totalAmount) : null,
            notes: raw?.notes ? String(raw.notes) : null,
            importPayload: raw as PrismaNs.InputJsonValue,
            customer: raw?.customer ?? null,
            lines: Array.isArray(raw?.lines) ? raw.lines : [],
          });
        });

        if (result.created) summary.created += 1;
        else summary.updated += 1;
      } catch (error: any) {
        summary.failed += 1;
        const message =
          error instanceof WarehouseImportValidationError
            ? error.message
            : error?.message || 'Unbekannter Importfehler';

        summary.errors.push({ index, orderNumber, error: message });

        await prisma.$transaction(async (tx) => {
          await recordWarehouseImportError(tx, {
            ventureId: id,
            provider: FulfillmentOrderSource.MANUAL,
            sourceEntity: 'order',
            sourceEntityId: raw?.sourceOrderId ? String(raw.sourceOrderId) : null,
            payload: raw as PrismaNs.InputJsonValue,
            errorMessage: message,
          });
        });
      }
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error('Failed to import manual orders:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
