import { prisma } from '@/lib/prisma';
import { renderInvoicePdfBuffer } from '@/lib/invoice-pdf';
import { put } from '@vercel/blob';
import { getOrCreatePlatformTaxProfile } from '@/lib/platform-tax-profile';
import {
  PlatformInvoiceStatus,
  PlatformLedgerDirection,
  PlatformLedgerSource,
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

    // 2. Create Invoice Line Item
    const lineItem = await tx.platformInvoiceLine.create({
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

    // 4. Create Ledger Entry (EoR Booking)
    const ledgerEntry = await tx.platformLedgerEntry.create({
      data: {
        profileId: profile.id,
        direction: PlatformLedgerDirection.INCOME,
        source: PlatformLedgerSource.CREDIT_PURCHASE,
        sourceId: purchase.id,
        description: `Credit Purchase: ${credits} Credits`,
        bookedAt: new Date(),
        amountNet: amountGross,
        taxAmount: 0,
        amountGross,
        currency: currency.toUpperCase(),
        invoiceId: invoice.id,
        userId,
        metadata: {
          credits,
          stripePaymentIntentId,
          stripeChargeId,
        },
      },
    });

    return { invoice, lineItem, purchase, ledgerEntry };
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

  await prisma.platformInvoice.update({
    where: { id: invoice.id },
    data: {
      pdfUrl: blob.url,
      snapshot: snapshot ?? undefined,
    },
  });

  const existingDoc = await prisma.platformDocument.findFirst({
    where: {
      invoiceId: invoice.id,
      type: 'INVOICE',
    },
  });

  if (!existingDoc) {
    await prisma.platformDocument.create({
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

    // 2. Create Invoice Line Item
    const lineItem = await tx.platformInvoiceLine.create({
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

    // 3. Create Ledger Entry (EoR Booking)
    const ledgerEntry = await tx.platformLedgerEntry.create({
      data: {
        profileId: profile.id,
        direction: PlatformLedgerDirection.INCOME,
        source: PlatformLedgerSource.SUBSCRIPTION,
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
        metadata: {
          credits,
          stripeInvoiceId,
          subscriptionType: 'monthly',
        },
      },
    });

    return { invoice, lineItem, ledgerEntry };
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
