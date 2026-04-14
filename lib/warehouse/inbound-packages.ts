import { put } from '@vercel/blob';
import {
  CarrierType,
  InboundPackageStatus,
} from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import {
  parseCarrierTypeParam,
  parseInboundPackageStatusParam,
  WarehouseInboundPackageValidationError,
} from '@/lib/warehouse/contracts';
import { notifyWarehouseCustomer } from '@/lib/warehouse/customer-notifications';
import {
  canTransitionInboundStatus,
  inboundStatusTimestampsPatch,
} from '@/lib/warehouse/transitions';

export {
  parseCarrierTypeParam,
  parseInboundPackageStatusParam,
  WarehouseInboundPackageValidationError,
};

export type InboundPackageFilters = {
  status?: unknown;
};

type WarehouseUploadFile = {
  size: number;
  type: string;
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

const DEFAULT_PHOTO_RETENTION_DAYS = 30;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS_PER_PACKAGE = 12;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function normalizeRetentionDays(value: unknown): number {
  const input = Number(value);
  return Number.isFinite(input)
    ? Math.max(1, Math.min(365, Math.trunc(input)))
    : DEFAULT_PHOTO_RETENTION_DAYS;
}

function isWarehouseUploadFile(value: unknown): value is WarehouseUploadFile {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'arrayBuffer' in value &&
      typeof value.arrayBuffer === 'function'
  );
}

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

export async function listInboundPackages(
  ventureId: string,
  filters: InboundPackageFilters = {}
) {
  const status = parseInboundPackageStatusParam(filters.status);

  return prisma.inboundPackage.findMany({
    where: {
      ventureId,
      ...(status ? { status } : {}),
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
}

export async function createInboundPackage(
  ventureId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const rawCustomerId = body.customerId ? String(body.customerId).trim() : '';
  const rawLinkedOrderId = body.linkedOrderId ? String(body.linkedOrderId).trim() : '';
  const retentionDays = normalizeRetentionDays(body.photoRetentionDays);
  const parsedCarrier = parseCarrierTypeParam(body.carrier) ?? CarrierType.OTHER;
  const parsedStatus =
    parseInboundPackageStatusParam(body.status) ?? InboundPackageStatus.RECEIVED;

  const photoRetentionUntil = new Date();
  photoRetentionUntil.setDate(photoRetentionUntil.getDate() + retentionDays);

  let customerId: string | null = null;
  let customerEmail: string | null = null;
  if (rawCustomerId) {
    const customer = await prisma.customerAccount.findFirst({
      where: {
        id: rawCustomerId,
        ventureId,
      },
      select: { id: true, email: true },
    });
    if (!customer) {
      throw new WarehouseInboundPackageValidationError(
        'INVALID_CUSTOMER_ID',
        'customerId ist ungueltig'
      );
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
        ventureId,
      },
      select: { id: true, orderNumber: true },
    });
    if (!order) {
      throw new WarehouseInboundPackageValidationError(
        'INVALID_LINKED_ORDER_ID',
        'linkedOrderId ist ungueltig'
      );
    }
    linkedOrderId = order.id;
    linkedOrderNumber = order.orderNumber;
  }

  const created = await prisma.inboundPackage.create({
    data: {
      ventureId,
      customerId,
      linkedOrderId,
      carrier: parsedCarrier,
      trackingNumber: body.trackingNumber ? String(body.trackingNumber) : null,
      externalReference: body.externalReference ? String(body.externalReference) : null,
      status: parsedStatus,
      photoUrls: Array.isArray(body.photoUrls)
        ? body.photoUrls.map((value) => String(value)).filter(Boolean)
        : [],
      photoRetentionUntil,
      notes: body.notes ? String(body.notes) : null,
      handledById: userId,
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

  return created;
}

export async function updateInboundPackage(
  ventureId: string,
  packageId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const nextStatus = parseInboundPackageStatusParam(body.status);
  const nextCarrier = parseCarrierTypeParam(body.carrier);

  const existing = await prisma.inboundPackage.findFirst({
    where: { id: packageId, ventureId },
    select: { id: true, status: true },
  });
  if (!existing) {
    throw new WarehouseInboundPackageValidationError(
      'PACKAGE_NOT_FOUND',
      'Inbound-Paket nicht gefunden'
    );
  }

  if (nextStatus && !canTransitionInboundStatus(existing.status, nextStatus)) {
    throw new WarehouseInboundPackageValidationError(
      'INVALID_STATUS_TRANSITION',
      `Ungueltiger Statuswechsel: ${existing.status} -> ${nextStatus}`
    );
  }

  let linkedOrderId: string | null | undefined = undefined;
  if (body.linkedOrderId !== undefined) {
    if (!body.linkedOrderId) {
      linkedOrderId = null;
    } else {
      const orderId = String(body.linkedOrderId).trim();
      const order = await prisma.fulfillmentOrder.findFirst({
        where: { id: orderId, ventureId },
        select: { id: true },
      });
      if (!order) {
        throw new WarehouseInboundPackageValidationError(
          'INVALID_LINKED_ORDER_ID',
          'linkedOrderId ist ungueltig'
        );
      }
      linkedOrderId = order.id;
    }
  }

  let customerId: string | null | undefined = undefined;
  if (body.customerId !== undefined) {
    if (!body.customerId) {
      customerId = null;
    } else {
      const candidate = String(body.customerId).trim();
      const customer = await prisma.customerAccount.findFirst({
        where: { id: candidate, ventureId },
        select: { id: true },
      });
      if (!customer) {
        throw new WarehouseInboundPackageValidationError(
          'INVALID_CUSTOMER_ID',
          'customerId ist ungueltig'
        );
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
      ...(body.trackingNumber !== undefined
        ? { trackingNumber: body.trackingNumber ? String(body.trackingNumber) : null }
        : {}),
      ...(body.externalReference !== undefined
        ? { externalReference: body.externalReference ? String(body.externalReference) : null }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
      ...(body.photoUrls !== undefined
        ? {
            photoUrls: Array.isArray(body.photoUrls)
              ? body.photoUrls.map((value) => String(value)).filter(Boolean)
              : [],
          }
        : {}),
      ...(linkedOrderId !== undefined ? { linkedOrderId } : {}),
      ...(customerId !== undefined ? { customerId } : {}),
      handledById: userId,
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

  if (nextStatus && nextStatus !== existing.status && updated.customer?.email) {
    await notifyWarehouseCustomer({
      to: updated.customer.email,
      subject: 'LagerHub: Paketstatus aktualisiert',
      message: 'Der Status Ihres Pakets wurde aktualisiert.',
      trackingNumber: updated.trackingNumber,
      orderNumber: updated.linkedOrder?.orderNumber || null,
      status: updated.status,
    });
  }

  return updated;
}

export async function addInboundPackagePhoto(
  ventureId: string,
  packageId: string,
  userId: string,
  input: {
    file: unknown;
    retentionDays?: unknown;
  }
) {
  const existing = await prisma.inboundPackage.findFirst({
    where: {
      id: packageId,
      ventureId,
    },
    select: {
      id: true,
      photoUrls: true,
      photoRetentionUntil: true,
    },
  });
  if (!existing) {
    throw new WarehouseInboundPackageValidationError(
      'PACKAGE_NOT_FOUND',
      'Inbound-Paket nicht gefunden'
    );
  }

  if (existing.photoUrls.length >= MAX_PHOTOS_PER_PACKAGE) {
    throw new WarehouseInboundPackageValidationError(
      'MAX_PHOTOS_REACHED',
      `Maximal ${MAX_PHOTOS_PER_PACKAGE} Fotos pro Paket erlaubt`
    );
  }

  if (!isWarehouseUploadFile(input.file)) {
    throw new WarehouseInboundPackageValidationError(
      'FILE_MISSING',
      'Datei fehlt (FormData key: file)'
    );
  }

  const file = input.file;
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new WarehouseInboundPackageValidationError(
      'FILE_TOO_LARGE',
      'Datei ist zu gross (max. 8MB)'
    );
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new WarehouseInboundPackageValidationError(
      'INVALID_FILE_TYPE',
      'Nur Bilddateien sind erlaubt'
    );
  }

  const retentionDays = normalizeRetentionDays(input.retentionDays);
  const photoRetentionUntil = existing.photoRetentionUntil
    ? existing.photoRetentionUntil
    : (() => {
        const dt = new Date();
        dt.setDate(dt.getDate() + retentionDays);
        return dt;
      })();

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFilename(file.name || 'inbound-photo.jpg');
  const filename = `warehouse/${ventureId}/inbound/${packageId}/${Date.now()}-${safeName}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mime,
  });

  const nextPhotoUrls = Array.from(new Set([...existing.photoUrls, blob.url]));

  return prisma.inboundPackage.update({
    where: { id: existing.id },
    data: {
      photoUrls: nextPhotoUrls,
      photoRetentionUntil,
      handledById: userId,
    },
    select: {
      id: true,
      photoUrls: true,
      photoRetentionUntil: true,
    },
  });
}

export async function removeInboundPackagePhoto(
  ventureId: string,
  packageId: string,
  userId: string,
  url: string
) {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    throw new WarehouseInboundPackageValidationError(
      'PHOTO_URL_REQUIRED',
      'url ist erforderlich'
    );
  }

  const existing = await prisma.inboundPackage.findFirst({
    where: {
      id: packageId,
      ventureId,
    },
    select: {
      id: true,
      photoUrls: true,
    },
  });
  if (!existing) {
    throw new WarehouseInboundPackageValidationError(
      'PACKAGE_NOT_FOUND',
      'Inbound-Paket nicht gefunden'
    );
  }

  if (!existing.photoUrls.includes(normalizedUrl)) {
    throw new WarehouseInboundPackageValidationError(
      'PHOTO_URL_NOT_FOUND',
      'Foto-URL nicht gefunden'
    );
  }

  return prisma.inboundPackage.update({
    where: { id: existing.id },
    data: {
      photoUrls: existing.photoUrls.filter((entry) => entry !== normalizedUrl),
      handledById: userId,
    },
    select: {
      id: true,
      photoUrls: true,
      photoRetentionUntil: true,
    },
  });
}

export async function createInboundPackagePickupReceipt(
  ventureId: string,
  packageId: string,
  userId: string,
  input: unknown
) {
  const body = (input ?? {}) as Record<string, unknown>;
  const recipientName =
    typeof body.recipientName === 'string' && body.recipientName.trim()
      ? body.recipientName.trim()
      : 'Unbekannt';
  const recipientDocument =
    typeof body.recipientDocument === 'string' && body.recipientDocument.trim()
      ? body.recipientDocument.trim()
      : null;

  const existing = await prisma.inboundPackage.findFirst({
    where: { id: packageId, ventureId },
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
    throw new WarehouseInboundPackageValidationError(
      'PACKAGE_NOT_FOUND',
      'Inbound-Paket nicht gefunden'
    );
  }

  if (existing.status === InboundPackageStatus.CLOSED) {
    throw new WarehouseInboundPackageValidationError(
      'PACKAGE_CLOSED',
      'Paket ist bereits geschlossen'
    );
  }

  const currentReceipt = extractReceiptNumber(existing.notes);
  if (existing.status === InboundPackageStatus.PICKED_UP && currentReceipt) {
    return {
      package: existing,
      receipt: {
        receiptNumber: currentReceipt,
        packageId: existing.id,
        trackingNumber: existing.trackingNumber,
        pickedUpAt: existing.pickedUpAt || new Date().toISOString(),
        recipientName,
        recipientDocument,
      },
    };
  }

  if (
    existing.status !== InboundPackageStatus.PICKED_UP &&
    !canTransitionInboundStatus(existing.status, InboundPackageStatus.PICKED_UP)
  ) {
    throw new WarehouseInboundPackageValidationError(
      'INVALID_PICKUP_TRANSITION',
      `Ungueltiger Statuswechsel: ${existing.status} -> PICKED_UP`
    );
  }

  const receiptNumber = createReceiptNumber(existing.id);
  const statusPatch =
    existing.status === InboundPackageStatus.PICKED_UP
      ? {}
      : inboundStatusTimestampsPatch(existing.status, InboundPackageStatus.PICKED_UP);

  const noteLine =
    `[PICKUP_RECEIPT:${receiptNumber}] recipient=${recipientName}` +
    (recipientDocument ? ` doc=${recipientDocument}` : '');

  const updated = await prisma.inboundPackage.update({
    where: { id: existing.id },
    data: {
      status: InboundPackageStatus.PICKED_UP,
      ...statusPatch,
      notes: appendNote(existing.notes, noteLine),
      handledById: userId,
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

  return {
    package: updated,
    receipt: {
      receiptNumber,
      packageId: updated.id,
      trackingNumber: updated.trackingNumber,
      pickedUpAt: updated.pickedUpAt || new Date().toISOString(),
      recipientName,
      recipientDocument,
    },
  };
}
