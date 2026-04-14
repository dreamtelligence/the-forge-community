import { prisma } from '@/lib/database/prisma';
import { renderInvoicePdfBuffer } from '@/lib/billing/invoice-pdf';
import { put } from '@vercel/blob';
import { getOrCreatePlatformTaxProfile } from '@/lib/billing/tax-profile';
import {
  createPlatformLedgerEntry,
  recordFinanceAuditLog,
} from '@/lib/finance/ledger';
import {
  FinanceAuditAction,
  FinanceAuditEntityType,
  PlatformInvoiceStatus,
  Prisma,
} from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Platform Invoicing Helper
 *
 * Creates production-ready invoices for credit purchases
 * with automatic EoR (Einnahmenueberschussrechnung) bookings
 */

type AddressInput = {
  line1?: string | null;
  line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

interface CreateCreditPurchaseInvoiceParams {
  userId: string;
  credits: number;
  amountCents: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  customerEmail: string;
  customerName?: string;
  customerAddress?: AddressInput | null;
  customerCountry?: string | null;
}

const SYSTEM_FINANCE_ACTOR = 'system:platform-finance';

function buildInvoiceAuditState(invoice: {
  id: string;
  profileId: string;
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  serviceDate?: Date | null;
  servicePeriodStart?: Date | null;
  servicePeriodEnd?: Date | null;
  buyerName: string;
  buyerEmail?: string | null;
  buyerCountry?: string | null;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAt?: Date | null;
  pdfUrl?: string | null;
  finalizedAt?: Date | null;
  immutableLockedAt?: Date | null;
}) {
  return {
    id: invoice.id,
    profileId: invoice.profileId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    serviceDate: invoice.serviceDate?.toISOString() ?? null,
    servicePeriodStart: invoice.servicePeriodStart?.toISOString() ?? null,
    servicePeriodEnd: invoice.servicePeriodEnd?.toISOString() ?? null,
    buyerName: invoice.buyerName,
    buyerEmail: invoice.buyerEmail ?? null,
    buyerCountry: invoice.buyerCountry ?? null,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    pdfUrl: invoice.pdfUrl ?? null,
    finalizedAt: invoice.finalizedAt?.toISOString() ?? null,
    immutableLockedAt: invoice.immutableLockedAt?.toISOString() ?? null,
  };
}

function buildCreditPurchaseAuditState(purchase: {
  id: string;
  profileId: string;
  userId: string;
  credits: number;
  currency: string;
  amountNet: number;
  taxAmount: number;
  amountGross: number;
  invoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeInvoiceId?: string | null;
  immutableLockedAt?: Date | null;
  createdAt: Date;
}) {
  return {
    id: purchase.id,
    profileId: purchase.profileId,
    userId: purchase.userId,
    credits: purchase.credits,
    currency: purchase.currency,
    amountNet: purchase.amountNet,
    taxAmount: purchase.taxAmount,
    amountGross: purchase.amountGross,
    invoiceId: purchase.invoiceId ?? null,
    stripePaymentIntentId: purchase.stripePaymentIntentId ?? null,
    stripeChargeId: purchase.stripeChargeId ?? null,
    stripeInvoiceId: purchase.stripeInvoiceId ?? null,
    immutableLockedAt: purchase.immutableLockedAt?.toISOString() ?? null,
    createdAt: purchase.createdAt.toISOString(),
  };
}

function buildDocumentAuditState(document: {
  id: string;
  profileId: string;
  type: string;
  title: string;
  documentUrl: string;
  mimeType?: string | null;
  size?: number | null;
  sha256?: string | null;
  issuedAt?: Date | null;
  retentionUntil?: Date | null;
  invoiceId?: string | null;
  ledgerEntryId?: string | null;
  immutableLockedAt?: Date | null;
  createdAt: Date;
}) {
  return {
    id: document.id,
    profileId: document.profileId,
    type: document.type,
    title: document.title,
    documentUrl: document.documentUrl,
    mimeType: document.mimeType ?? null,
    size: document.size ?? null,
    sha256: document.sha256 ?? null,
    issuedAt: document.issuedAt?.toISOString() ?? null,
    retentionUntil: document.retentionUntil?.toISOString() ?? null,
    invoiceId: document.invoiceId ?? null,
    ledgerEntryId: document.ledgerEntryId ?? null,
    immutableLockedAt: document.immutableLockedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
  };
}

export async function createCreditPurchaseInvoice(params: CreateCreditPurchaseInvoiceParams) {
  const {
    userId,
    credits,
    amountCents,
    currency,
    stripePaymentIntentId,
    stripeChargeId,
    stripeInvoiceId,
    customerEmail,
    customerName,
    customerAddress,
    customerCountry,
  } = params;

  const existingInvoice = await findExistingInvoice({ stripePaymentIntentId, stripeInvoiceId });
  if (existingInvoice) {
    if (!existingInvoice.pdfUrl) {
      await finalizeInvoiceArtifacts({
        invoiceId: existingInvoice.id,
        profileId: existingInvoice.profileId,
      });
    }
    return {
      invoice: existingInvoice,
      purchase: existingInvoice.creditPurchase ?? null,
      ledgerEntry: existingInvoice.ledgerEntry ?? null,
    };
  }

  // Convert cents to euros
  const amountGross = amountCents / 100;

  // Get or create Platform Tax Profile (for founder/admin)
  const profile = await getOrCreatePlatformTaxProfile();
  const financeRequestId = stripePaymentIntentId || stripeInvoiceId || `credit-purchase:${userId}:${amountCents}`;

  // Create invoice, ledger entry, and purchase record in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Invoice
    const invoice = await createInvoiceWithNumber(tx, profile.id, {
      status: PlatformInvoiceStatus.PAID,
      issueDate: new Date(),
      serviceDate: new Date(),
      buyerName: customerName || customerEmail,
      buyerEmail: customerEmail,
      buyerAddress: customerAddress ?? undefined,
      buyerCountry: customerCountry ?? undefined,
      currency: currency.toUpperCase(),
      subtotal: amountGross,
      taxRate: 0, // Kleinunternehmer = no VAT
      taxAmount: 0,
      total: amountGross,
      isSmallBusiness: profile.smallBusiness,
      smallBusinessNote: profile.smallBusiness
        ? '§19 UStG (Kleinunternehmer): Kein Steuerausweis'
        : undefined,
      stripePaymentIntentId,
      stripeChargeId,
      stripeInvoiceId,
      paidAt: new Date(),
    });

    await recordFinanceAuditLog({
      db: tx,
      entityType: FinanceAuditEntityType.PLATFORM_INVOICE,
      entityId: invoice.id,
      action: FinanceAuditAction.CREATED,
      actorEmail: SYSTEM_FINANCE_ACTOR,
      requestId: financeRequestId,
      afterState: buildInvoiceAuditState(invoice),
      metadata: {
        flow: 'credit-purchase',
      },
    });

    // 2. Create Invoice Line Item
    await tx.platformInvoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: `${credits} AI Credits`,
        quantity: 1,
        unitPrice: amountGross,
        netAmount: amountGross,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: amountGross,
      },
    });

    // 3. Create Credit Purchase Record
    const purchase = await tx.platformCreditPurchase.create({
      data: {
        profileId: profile.id,
        userId,
        credits,
        currency: currency.toUpperCase(),
        amountNet: amountGross,
        taxAmount: 0,
        amountGross,
        invoiceId: invoice.id,
        stripePaymentIntentId,
        stripeChargeId,
        stripeInvoiceId,
      },
    });

    await recordFinanceAuditLog({
      db: tx,
      entityType: FinanceAuditEntityType.PLATFORM_CREDIT_PURCHASE,
      entityId: purchase.id,
      action: FinanceAuditAction.CREATED,
      actorEmail: SYSTEM_FINANCE_ACTOR,
      requestId: financeRequestId,
      afterState: buildCreditPurchaseAuditState(purchase),
      metadata: {
        credits,
      },
    });

    // Every money-moving write goes through the append-only ledger helper so
    // later corrections become explicit reversal entries instead of silent edits.
    const ledgerEntry = await createPlatformLedgerEntry({
      db: tx,
      profileId: profile.id,
      direction: 'INCOME',
      source: 'CREDIT_PURCHASE',
      sourceId: purchase.id,
      description: `Credit Purchase: ${credits} Credits`,
      bookedAt: new Date(),
      amountNet: amountGross,
      taxAmount: 0,
      amountGross,
      currency: currency.toUpperCase(),
      invoiceId: invoice.id,
      userId,
      actorEmail: SYSTEM_FINANCE_ACTOR,
      requestId: financeRequestId,
      metadata: {
        credits,
        stripePaymentIntentId,
        stripeChargeId,
      },
    });

    return { invoice, purchase, ledgerEntry };
  });

  await finalizeInvoiceArtifacts({
    invoiceId: result.invoice.id,
    profileId: profile.id,
  });

  console.log(
    `[INVOICING] ✅ Created invoice ${result.invoice.invoiceNumber} for ${credits} credits (€${amountGross})`
  );

  return { invoice: result.invoice, purchase: result.purchase, ledgerEntry: result.ledgerEntry };
}

/**
 * Generate unique invoice number
 * Format: YYYY-NNNN (e.g., 2025-0001)
 */
async function generateInvoiceNumber(db: Prisma.TransactionClient | PrismaClient, profileId: string) {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  // Get last invoice number for this year
  const lastInvoice = await db.platformInvoice.findFirst({
    where: {
      profileId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;

  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1], 10);
    nextNumber = lastNumber + 1;
  }

  // Pad with zeros (4 digits)
  const paddedNumber = nextNumber.toString().padStart(4, '0');

  return `${prefix}${paddedNumber}`;
}

type InvoiceBaseData = Omit<Prisma.PlatformInvoiceUncheckedCreateInput, 'invoiceNumber' | 'profileId'>;

async function createInvoiceWithNumber(
  tx: Prisma.TransactionClient,
  profileId: string,
  data: InvoiceBaseData
) {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const invoiceNumber = await generateInvoiceNumber(tx, profileId);

    try {
      return await tx.platformInvoice.create({
        data: {
          ...data,
          profileId,
          invoiceNumber,
        },
      });
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes('invoiceNumber');

      if (!isUniqueViolation || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error('Unable to generate a unique invoice number.');
}

async function findExistingInvoice({
  stripePaymentIntentId,
  stripeInvoiceId,
}: {
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
}) {
  if (!stripePaymentIntentId && !stripeInvoiceId) return null;

  return prisma.platformInvoice.findFirst({
    where: {
      OR: [
        stripePaymentIntentId ? { stripePaymentIntentId } : undefined,
        stripeInvoiceId ? { stripeInvoiceId } : undefined,
      ].filter(Boolean) as Prisma.PlatformInvoiceWhereInput[],
    },
    include: {
      creditPurchase: true,
      ledgerEntry: true,
    },
  });
}

function buildInvoiceSnapshot(invoice: {
  invoice: Awaited<ReturnType<typeof prisma.platformInvoice.findUnique>>;
  profile: Awaited<ReturnType<typeof prisma.platformTaxProfile.findUnique>>;
  lineItems: Awaited<ReturnType<typeof prisma.platformInvoiceLine.findMany>>;
}) {
  if (!invoice.invoice || !invoice.profile) return null;

  return {
    invoice: {
      id: invoice.invoice.id,
      invoiceNumber: invoice.invoice.invoiceNumber,
      issueDate: invoice.invoice.issueDate,
      serviceDate: invoice.invoice.serviceDate,
      servicePeriodStart: invoice.invoice.servicePeriodStart,
      servicePeriodEnd: invoice.invoice.servicePeriodEnd,
      buyerName: invoice.invoice.buyerName,
      buyerEmail: invoice.invoice.buyerEmail,
      buyerAddress: invoice.invoice.buyerAddress,
      buyerCountry: invoice.invoice.buyerCountry,
      currency: invoice.invoice.currency,
      subtotal: invoice.invoice.subtotal,
      taxRate: invoice.invoice.taxRate,
      taxAmount: invoice.invoice.taxAmount,
      total: invoice.invoice.total,
      isSmallBusiness: invoice.invoice.isSmallBusiness,
      smallBusinessNote: invoice.invoice.smallBusinessNote,
      status: invoice.invoice.status,
      paidAt: invoice.invoice.paidAt,
    },
    profile: {
      id: invoice.profile.id,
      businessName: invoice.profile.businessName,
      businessType: invoice.profile.businessType,
      addressStreet: invoice.profile.addressStreet,
      addressZip: invoice.profile.addressZip,
      addressCity: invoice.profile.addressCity,
      addressCountry: invoice.profile.addressCountry,
      taxNumber: invoice.profile.taxNumber,
      vatId: invoice.profile.vatId,
      invoiceEmail: invoice.profile.invoiceEmail,
      bankIban: invoice.profile.bankIban,
      bankBic: invoice.profile.bankBic,
      smallBusiness: invoice.profile.smallBusiness,
      defaultCurrency: invoice.profile.defaultCurrency,
      invoiceNote: invoice.profile.invoiceNote,
    },
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      netAmount: item.netAmount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      totalAmount: item.totalAmount,
    })),
  };
}

async function finalizeInvoiceArtifacts({
  invoiceId,
  profileId,
}: {
  invoiceId: string;
  profileId: string;
}) {
  const invoice = await prisma.platformInvoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true },
  });

  if (!invoice) return;

  const profile = await prisma.platformTaxProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) return;

  if (invoice.pdfUrl) return;

  const snapshot = buildInvoiceSnapshot({ invoice, profile, lineItems: invoice.lineItems });

  const pdfBuffer = await renderInvoicePdfBuffer({
    invoice,
    lineItems: invoice.lineItems,
    profile,
  });

  const pdfPayload = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer as ArrayBuffer);
  const blob = await put(`invoices/${invoice.invoiceNumber}.pdf`, pdfPayload, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/pdf',
  });

  const sha256 = createHash('sha256').update(pdfPayload).digest('hex');
  const retentionUntil = new Date(invoice.issueDate);
  retentionUntil.setFullYear(retentionUntil.getFullYear() + 10);
  const financeRequestId =
    invoice.stripeInvoiceId || invoice.stripePaymentIntentId || `invoice-finalize:${invoice.id}`;
  const beforeFinalize = buildInvoiceAuditState(invoice);

  const finalizedInvoice = await prisma.platformInvoice.update({
    where: { id: invoice.id },
    data: {
      pdfUrl: blob.url,
      snapshot: snapshot ?? undefined,
      finalizedAt: new Date(),
      immutableLockedAt: new Date(),
    },
  });

  await recordFinanceAuditLog({
    db: prisma,
    entityType: FinanceAuditEntityType.PLATFORM_INVOICE,
    entityId: invoice.id,
    action: FinanceAuditAction.FINALIZED,
    actorEmail: SYSTEM_FINANCE_ACTOR,
    requestId: financeRequestId,
    beforeState: beforeFinalize,
    afterState: buildInvoiceAuditState(finalizedInvoice),
    metadata: {
      pdfUrl: blob.url,
      sha256,
    },
  });

  const existingDoc = await prisma.platformDocument.findFirst({
    where: {
      invoiceId: invoice.id,
      type: 'INVOICE',
    },
  });

  if (!existingDoc) {
    const document = await prisma.platformDocument.create({
      data: {
        profileId,
        type: 'INVOICE',
        title: `Rechnung ${invoice.invoiceNumber}`,
        documentUrl: blob.url,
        mimeType: 'application/pdf',
        size: pdfPayload.length,
        sha256,
        issuedAt: invoice.issueDate,
        retentionUntil,
        invoiceId: invoice.id,
      },
    });

    await recordFinanceAuditLog({
      db: prisma,
      entityType: FinanceAuditEntityType.PLATFORM_DOCUMENT,
      entityId: document.id,
      action: FinanceAuditAction.STORED,
      actorEmail: SYSTEM_FINANCE_ACTOR,
      requestId: financeRequestId,
      afterState: buildDocumentAuditState(document),
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
      },
    });
  }
}

/**
 * Create subscription invoice (monthly recurring)
 */
export async function createSubscriptionInvoice(params: {
  userId: string;
  credits: number;
  amountCents: number;
  currency: string;
  stripeInvoiceId: string;
  customerEmail: string;
  customerName?: string;
  customerAddress?: AddressInput | null;
  customerCountry?: string | null;
}) {
  const {
    userId,
    credits,
    amountCents,
    currency,
    stripeInvoiceId,
    customerEmail,
    customerName,
    customerAddress,
    customerCountry,
  } = params;

  const existingInvoice = await findExistingInvoice({ stripeInvoiceId });
  if (existingInvoice) {
    if (!existingInvoice.pdfUrl) {
      await finalizeInvoiceArtifacts({
        invoiceId: existingInvoice.id,
        profileId: existingInvoice.profileId,
      });
    }
    return {
      invoice: existingInvoice,
      ledgerEntry: existingInvoice.ledgerEntry ?? null,
    };
  }

  const amountGross = amountCents / 100;
  const profile = await getOrCreatePlatformTaxProfile();
  const financeRequestId = stripeInvoiceId || `subscription:${userId}:${amountCents}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Invoice
    const invoice = await createInvoiceWithNumber(tx, profile.id, {
      status: PlatformInvoiceStatus.PAID,
      issueDate: new Date(),
      servicePeriodStart: new Date(),
      servicePeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      buyerName: customerName || customerEmail,
      buyerEmail: customerEmail,
      buyerAddress: customerAddress ?? undefined,
      buyerCountry: customerCountry ?? undefined,
      currency: currency.toUpperCase(),
      subtotal: amountGross,
      taxRate: 0,
      taxAmount: 0,
      total: amountGross,
      isSmallBusiness: profile.smallBusiness,
      smallBusinessNote: profile.smallBusiness
        ? '§19 UStG (Kleinunternehmer): Kein Steuerausweis'
        : undefined,
      stripeInvoiceId,
      paidAt: new Date(),
    });

    await recordFinanceAuditLog({
      db: tx,
      entityType: FinanceAuditEntityType.PLATFORM_INVOICE,
      entityId: invoice.id,
      action: FinanceAuditAction.CREATED,
      actorEmail: SYSTEM_FINANCE_ACTOR,
      requestId: financeRequestId,
      afterState: buildInvoiceAuditState(invoice),
      metadata: {
        flow: 'subscription',
      },
    });

    // 2. Create Invoice Line Item
    await tx.platformInvoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description:
          credits > 0
            ? `Platform Subscription - ${credits} Credits/Monat`
            : 'Platform Subscription (usage-based)',
        quantity: 1,
        unitPrice: amountGross,
        netAmount: amountGross,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: amountGross,
      },
    });

    const ledgerEntry = await createPlatformLedgerEntry({
      db: tx,
      profileId: profile.id,
      direction: 'INCOME',
      source: 'SUBSCRIPTION',
      description:
        credits > 0
          ? `Subscription Revenue: ${credits} Credits`
          : 'Subscription Revenue (usage-based)',
      bookedAt: new Date(),
      amountNet: amountGross,
      taxAmount: 0,
      amountGross,
      currency: currency.toUpperCase(),
      invoiceId: invoice.id,
      userId,
      actorEmail: SYSTEM_FINANCE_ACTOR,
      requestId: financeRequestId,
      metadata: {
        credits,
        stripeInvoiceId,
        subscriptionType: 'monthly',
      },
    });

    return { invoice, ledgerEntry };
  });

  await finalizeInvoiceArtifacts({
    invoiceId: result.invoice.id,
    profileId: profile.id,
  });

  console.log(
    `[INVOICING] ✅ Created subscription invoice ${result.invoice.invoiceNumber} (€${amountGross})`
  );

  return { invoice: result.invoice, ledgerEntry: result.ledgerEntry };
}
