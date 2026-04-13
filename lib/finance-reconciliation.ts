import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const DEFAULT_DAYS_BACK = 120;
const DEFAULT_MAX_ITEMS = 250;
const CREDIT_PURCHASE_GRANT_WINDOW_MS = 15 * 60 * 1000;
const SEVERITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

type JsonRecord = Record<string, unknown>;

export type FinanceReconciliationSeverity = 'high' | 'medium' | 'low';
export type FinanceReconciliationCheckStatus = 'ok' | 'warning' | 'error';

export type FinanceReconciliationIssue = {
  severity: FinanceReconciliationSeverity;
  code: string;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  relatedEntityIds?: string[];
  detectedAt: string;
};

export type FinanceReconciliationCheck = {
  code: string;
  label: string;
  status: FinanceReconciliationCheckStatus;
  detail: string;
};

export type FinanceReconciliationReport = {
  generatedAt: string;
  scope: {
    daysBack: number;
    maxItems: number;
    since: string;
  };
  summary: {
    totalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    processedWebhookEvents: number;
    webhookAudits: number;
    invoicesChecked: number;
    creditPurchasesChecked: number;
    usageRecordsChecked: number;
    ledgerEntriesChecked: number;
    healthyChecks: number;
  };
  checks: FinanceReconciliationCheck[];
  issues: FinanceReconciliationIssue[];
  notes: string[];
};

export type FinanceReconciliationOptions = {
  daysBack?: number;
  maxItems?: number;
};

function clampInteger(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value as number)));
}

function asRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function readString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hasAmountMismatch(left: number, right: number, epsilon = 0.01) {
  return Math.abs(left - right) > epsilon;
}

function parseStripeInvoiceRequestId(requestId: string | null | undefined) {
  if (!requestId?.startsWith('stripe-invoice-')) return null;
  const invoiceId = requestId.slice('stripe-invoice-'.length).trim();
  return invoiceId || null;
}

function groupByUserId<T extends { userId: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const existing = groups.get(row.userId);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(row.userId, [row]);
    }
  }

  return groups;
}

function checkStatus(issues: number): FinanceReconciliationCheckStatus {
  if (issues <= 0) return 'ok';
  if (issues === 1) return 'warning';
  return 'error';
}

export async function getFinanceReconciliationReport(
  options: FinanceReconciliationOptions = {}
): Promise<FinanceReconciliationReport> {
  const daysBack = clampInteger(options.daysBack, DEFAULT_DAYS_BACK, 7, 365);
  const maxItems = clampInteger(options.maxItems, DEFAULT_MAX_ITEMS, 25, 1000);
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [
    webhookEvents,
    webhookAudits,
    invoices,
    creditPurchases,
    usageRecords,
    energyGrants,
    ledgerEntries,
  ] = await Promise.all([
    prisma.webhookEvent.findMany({
      where: {
        processedAt: {
          not: null,
        },
      },
      orderBy: { processedAt: 'desc' },
      take: maxItems,
      select: {
        eventId: true,
        processedAt: true,
      },
    }),
    prisma.financeAuditLog.findMany({
      where: {
        entityType: 'STRIPE_WEBHOOK',
        action: 'PROCESSED',
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems,
      select: {
        entityId: true,
        requestId: true,
        createdAt: true,
        metadata: true,
        afterState: true,
      },
    }),
    prisma.platformInvoice.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        currency: true,
        pdfUrl: true,
        finalizedAt: true,
        immutableLockedAt: true,
        stripePaymentIntentId: true,
        stripeInvoiceId: true,
        createdAt: true,
        documents: {
          select: {
            id: true,
            type: true,
          },
        },
        ledgerEntry: {
          select: {
            id: true,
            source: true,
            amountGross: true,
            currency: true,
            metadata: true,
            reversesEntryId: true,
          },
        },
        creditPurchase: {
          select: {
            id: true,
            userId: true,
            credits: true,
          },
        },
      },
    }),
    prisma.platformCreditPurchase.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems,
      select: {
        id: true,
        userId: true,
        credits: true,
        amountGross: true,
        currency: true,
        invoiceId: true,
        stripePaymentIntentId: true,
        stripeInvoiceId: true,
        createdAt: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
            pdfUrl: true,
            ledgerEntry: {
              select: {
                id: true,
                source: true,
                amountGross: true,
                currency: true,
              },
            },
          },
        },
      },
    }),
    prisma.platformCreditUsage.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems,
      select: {
        id: true,
        userId: true,
        energyTransactionId: true,
        credits: true,
        feature: true,
        provider: true,
        model: true,
        costAmount: true,
        currency: true,
        metadata: true,
        createdAt: true,
        ledgerEntryId: true,
        ledgerEntry: {
          select: {
            id: true,
            source: true,
            amountGross: true,
            currency: true,
          },
        },
        energyTransaction: {
          select: {
            id: true,
            status: true,
            requestId: true,
          },
        },
      },
    }),
    prisma.energyTransaction.findMany({
      where: {
        createdAt: {
          gte: since,
        },
        type: 'GRANT',
        feature: {
          in: ['credit-purchase', 'monthly-subscription-credits'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems * 2,
      select: {
        id: true,
        userId: true,
        delta: true,
        feature: true,
        status: true,
        requestId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.platformLedgerEntry.findMany({
      where: {
        createdAt: {
          gte: since,
        },
        OR: [
          {
            invoiceId: {
              not: null,
            },
          },
          {
            source: {
              in: ['CREDIT_PURCHASE', 'CREDIT_USAGE', 'SUBSCRIPTION', 'REVERSAL'],
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems * 2,
      select: {
        id: true,
        source: true,
        sourceId: true,
        invoiceId: true,
        userId: true,
        amountGross: true,
        currency: true,
        metadata: true,
        reversesEntryId: true,
        createdAt: true,
      },
    }),
  ]);

  const issues: FinanceReconciliationIssue[] = [];
  const seenIssues = new Set<string>();

  const addIssue = (issue: Omit<FinanceReconciliationIssue, 'detectedAt'>) => {
    const key = `${issue.code}:${issue.entityType}:${issue.entityId}`;
    if (seenIssues.has(key)) return;
    seenIssues.add(key);

    issues.push({
      ...issue,
      detectedAt: new Date().toISOString(),
    });
  };

  const webhookAuditByEventId = new Map<string, (typeof webhookAudits)[number]>();
  for (const audit of webhookAudits) {
    const eventId = audit.entityId || audit.requestId;
    if (eventId) webhookAuditByEventId.set(eventId, audit);
  }

  const invoicesByStripeInvoiceId = new Map<string, (typeof invoices)[number]>();
  for (const invoice of invoices) {
    if (invoice.stripeInvoiceId) {
      invoicesByStripeInvoiceId.set(invoice.stripeInvoiceId, invoice);
    }
  }

  const purchasesByStripePaymentIntentId = new Map<string, (typeof creditPurchases)[number]>();
  const purchasesByStripeInvoiceId = new Map<string, (typeof creditPurchases)[number]>();
  for (const purchase of creditPurchases) {
    if (purchase.stripePaymentIntentId) {
      purchasesByStripePaymentIntentId.set(purchase.stripePaymentIntentId, purchase);
    }
    if (purchase.stripeInvoiceId) {
      purchasesByStripeInvoiceId.set(purchase.stripeInvoiceId, purchase);
    }
  }

  const grantsByUserId = groupByUserId(energyGrants);
  const grantsByRequestId = new Map<string, (typeof energyGrants)[number]>();
  const grantsByStripeInvoiceId = new Map<string, (typeof energyGrants)[number]>();
  const grantsByStripePaymentIntentId = new Map<string, (typeof energyGrants)[number]>();

  for (const grant of energyGrants) {
    if (grant.requestId) {
      grantsByRequestId.set(grant.requestId, grant);
    }

    const metadata = asRecord(grant.metadata);
    const stripeInvoiceId = readString(metadata, 'stripeInvoiceId');
    const stripePaymentIntentId = readString(metadata, 'stripePaymentIntentId');

    if (stripeInvoiceId) {
      grantsByStripeInvoiceId.set(stripeInvoiceId, grant);
    }
    if (stripePaymentIntentId) {
      grantsByStripePaymentIntentId.set(stripePaymentIntentId, grant);
    }
  }

  const purchaseLedgerBySourceId = new Map<string, (typeof ledgerEntries)[number]>();
  const usageLedgerBySourceId = new Map<string, (typeof ledgerEntries)[number]>();

  for (const entry of ledgerEntries) {
    if (entry.source === 'CREDIT_PURCHASE' && entry.sourceId) {
      purchaseLedgerBySourceId.set(entry.sourceId, entry);
    }
    if (entry.source === 'CREDIT_USAGE' && entry.sourceId) {
      usageLedgerBySourceId.set(entry.sourceId, entry);
    }
  }

  const findGrantForCreditPurchase = (purchase: (typeof creditPurchases)[number]) => {
    if (purchase.stripePaymentIntentId) {
      const exactPaymentIntentGrant = grantsByStripePaymentIntentId.get(purchase.stripePaymentIntentId);
      if (exactPaymentIntentGrant) return exactPaymentIntentGrant;
    }

    if (purchase.stripeInvoiceId) {
      const exactInvoiceGrant = grantsByStripeInvoiceId.get(purchase.stripeInvoiceId);
      if (exactInvoiceGrant) return exactInvoiceGrant;
    }

    const userGrants = grantsByUserId.get(purchase.userId) ?? [];
    return (
      userGrants.find(
        (grant) =>
          grant.feature === 'credit-purchase' &&
          grant.delta === purchase.credits &&
          Math.abs(grant.createdAt.getTime() - purchase.createdAt.getTime()) <=
            CREDIT_PURCHASE_GRANT_WINDOW_MS
      ) ?? null
    );
  };

  const findCreditPurchaseForGrant = (grant: (typeof energyGrants)[number]) => {
    const metadata = asRecord(grant.metadata);
    const stripePaymentIntentId = readString(metadata, 'stripePaymentIntentId');
    const stripeInvoiceId = readString(metadata, 'stripeInvoiceId');

    if (stripePaymentIntentId) {
      const exactPurchase = purchasesByStripePaymentIntentId.get(stripePaymentIntentId);
      if (exactPurchase) return exactPurchase;
    }

    if (stripeInvoiceId) {
      const exactPurchase = purchasesByStripeInvoiceId.get(stripeInvoiceId);
      if (exactPurchase) return exactPurchase;
    }

    const userPurchases = creditPurchases.filter((purchase) => purchase.userId === grant.userId);
    return (
      userPurchases.find(
        (purchase) =>
          purchase.credits === grant.delta &&
          Math.abs(purchase.createdAt.getTime() - grant.createdAt.getTime()) <=
            CREDIT_PURCHASE_GRANT_WINDOW_MS
      ) ?? null
    );
  };

  let healthyWebhookCoverage = 0;
  for (const event of webhookEvents) {
    const audit = webhookAuditByEventId.get(event.eventId);
    if (!audit) {
      addIssue({
        severity: 'medium',
        code: 'WEBHOOK_MISSING_AUDIT',
        title: 'Verarbeiteter Stripe-Webhook ohne Finance-Audit',
        description: `Webhook ${event.eventId} ist als verarbeitet markiert, aber im Finance-Audit fehlt das PROCESSED-Event.`,
        entityType: 'STRIPE_WEBHOOK',
        entityId: event.eventId,
      });
      continue;
    }

    healthyWebhookCoverage += 1;
  }

  for (const audit of webhookAudits) {
    const eventId = audit.entityId || audit.requestId;
    if (!eventId) continue;
    if (webhookEvents.some((event) => event.eventId === eventId)) continue;

    addIssue({
      severity: 'medium',
      code: 'AUDIT_MISSING_WEBHOOK_EVENT',
      title: 'Finance-Audit ohne Webhook-Idempotenzdatensatz',
      description: `Für den Webhook ${eventId} existiert ein Finance-Audit-Eintrag, aber kein korrespondierender Eintrag in webhook_events.`,
      entityType: 'STRIPE_WEBHOOK',
      entityId: eventId,
    });
  }

  let healthyInvoices = 0;
  for (const invoice of invoices) {
    let hasInvoiceIssue = false;
    const archivedPdf = invoice.documents.some((document) => document.type === 'INVOICE');
    const ledgerEntry = invoice.ledgerEntry;

    if (!ledgerEntry) {
      hasInvoiceIssue = true;
      addIssue({
        severity: 'high',
        code: 'INVOICE_MISSING_LEDGER_ENTRY',
        title: 'Rechnung ohne Ledger-Eintrag',
        description: `Rechnung ${invoice.invoiceNumber} hat keinen verknüpften Ledger-Eintrag.`,
        entityType: 'PLATFORM_INVOICE',
        entityId: invoice.id,
      });
    } else {
      if (hasAmountMismatch(invoice.total, ledgerEntry.amountGross)) {
        hasInvoiceIssue = true;
        addIssue({
          severity: 'high',
          code: 'INVOICE_LEDGER_AMOUNT_MISMATCH',
          title: 'Rechnungsbetrag stimmt nicht mit Ledger überein',
          description: `Rechnung ${invoice.invoiceNumber} hat ${invoice.total} ${invoice.currency}, der Ledger-Eintrag dagegen ${ledgerEntry.amountGross} ${ledgerEntry.currency}.`,
          entityType: 'PLATFORM_INVOICE',
          entityId: invoice.id,
          relatedEntityIds: [ledgerEntry.id],
        });
      }

      if (invoice.creditPurchase && ledgerEntry.source !== 'CREDIT_PURCHASE') {
        hasInvoiceIssue = true;
        addIssue({
          severity: 'medium',
          code: 'INVOICE_WRONG_LEDGER_SOURCE',
          title: 'Credit-Purchase-Rechnung mit falscher Ledger-Quelle',
          description: `Rechnung ${invoice.invoiceNumber} hängt an einem Ledger-Eintrag mit Source ${ledgerEntry.source} statt CREDIT_PURCHASE.`,
          entityType: 'PLATFORM_INVOICE',
          entityId: invoice.id,
          relatedEntityIds: [ledgerEntry.id, invoice.creditPurchase.id],
        });
      }
    }

    if (invoice.status === 'PAID' && !invoice.pdfUrl) {
      hasInvoiceIssue = true;
      addIssue({
        severity: 'high',
        code: 'INVOICE_MISSING_PDF',
        title: 'Bezahlte Rechnung ohne PDF',
        description: `Rechnung ${invoice.invoiceNumber} ist als bezahlt markiert, aber es gibt keine PDF-URL.`,
        entityType: 'PLATFORM_INVOICE',
        entityId: invoice.id,
      });
    }

    if (invoice.pdfUrl && !archivedPdf) {
      hasInvoiceIssue = true;
      addIssue({
        severity: 'medium',
        code: 'INVOICE_PDF_NOT_ARCHIVED',
        title: 'Rechnung mit PDF ohne archivierten Beleg',
        description: `Rechnung ${invoice.invoiceNumber} hat eine PDF-URL, aber keinen PlatformDocument-Eintrag vom Typ INVOICE.`,
        entityType: 'PLATFORM_INVOICE',
        entityId: invoice.id,
      });
    }

    if (invoice.status === 'PAID' && (!invoice.finalizedAt || !invoice.immutableLockedAt)) {
      hasInvoiceIssue = true;
      addIssue({
        severity: 'medium',
        code: 'INVOICE_NOT_FINALIZED',
        title: 'Bezahlte Rechnung nicht final gesperrt',
        description: `Rechnung ${invoice.invoiceNumber} ist bezahlt, aber finalizedAt oder immutableLockedAt fehlt.`,
        entityType: 'PLATFORM_INVOICE',
        entityId: invoice.id,
      });
    }

    if (!hasInvoiceIssue) {
      healthyInvoices += 1;
    }
  }

  let healthyPurchases = 0;
  for (const purchase of creditPurchases) {
    let hasPurchaseIssue = false;
    const invoice = purchase.invoice;
    const ledgerEntry = invoice?.ledgerEntry ?? purchaseLedgerBySourceId.get(purchase.id) ?? null;
    const energyGrant = findGrantForCreditPurchase(purchase);

    if (!invoice || !purchase.invoiceId) {
      hasPurchaseIssue = true;
      addIssue({
        severity: 'high',
        code: 'PURCHASE_MISSING_INVOICE',
        title: 'Credit Purchase ohne Rechnung',
        description: `Credit Purchase ${purchase.id} hat keine verknüpfte Rechnung.`,
        entityType: 'PLATFORM_CREDIT_PURCHASE',
        entityId: purchase.id,
      });
    }

    if (!ledgerEntry) {
      hasPurchaseIssue = true;
      addIssue({
        severity: 'high',
        code: 'PURCHASE_MISSING_LEDGER_ENTRY',
        title: 'Credit Purchase ohne Ledger-Eintrag',
        description: `Credit Purchase ${purchase.id} hat keinen nachvollziehbaren Ledger-Eintrag.`,
        entityType: 'PLATFORM_CREDIT_PURCHASE',
        entityId: purchase.id,
        relatedEntityIds: purchase.invoiceId ? [purchase.invoiceId] : undefined,
      });
    } else if (ledgerEntry.source !== 'CREDIT_PURCHASE') {
      hasPurchaseIssue = true;
      addIssue({
        severity: 'medium',
        code: 'PURCHASE_WRONG_LEDGER_SOURCE',
        title: 'Credit Purchase mit falscher Ledger-Quelle',
        description: `Credit Purchase ${purchase.id} zeigt auf einen Ledger-Eintrag mit Source ${ledgerEntry.source} statt CREDIT_PURCHASE.`,
        entityType: 'PLATFORM_CREDIT_PURCHASE',
        entityId: purchase.id,
        relatedEntityIds: [ledgerEntry.id],
      });
    }

    if (!energyGrant) {
      hasPurchaseIssue = true;
      addIssue({
        severity: 'high',
        code: 'PURCHASE_MISSING_ENERGY_GRANT',
        title: 'Credit Purchase ohne Energy-Grant',
        description: `Credit Purchase ${purchase.id} hat keinen passenden EnergyTransaction-GRANT.`,
        entityType: 'PLATFORM_CREDIT_PURCHASE',
        entityId: purchase.id,
      });
    } else if (energyGrant.delta !== purchase.credits) {
      hasPurchaseIssue = true;
      addIssue({
        severity: 'high',
        code: 'PURCHASE_GRANT_AMOUNT_MISMATCH',
        title: 'Credit Purchase und Energy-Grant weichen ab',
        description: `Credit Purchase ${purchase.id} erwartet ${purchase.credits} Credits, der zugeordnete Grant hat ${energyGrant.delta}.`,
        entityType: 'PLATFORM_CREDIT_PURCHASE',
        entityId: purchase.id,
        relatedEntityIds: [energyGrant.id],
      });
    }

    if (!hasPurchaseIssue) {
      healthyPurchases += 1;
    }
  }

  let healthyUsageRecords = 0;
  for (const usage of usageRecords) {
    let hasUsageIssue = false;
    const metadata = asRecord(usage.metadata);
    const providerCostEur = readNumber(metadata, 'providerCostEur');
    const requiresExpenseLedger =
      providerCostEur !== null ? providerCostEur > 0 : (usage.costAmount ?? 0) > 0;
    const ledgerEntry = usage.ledgerEntry ?? usageLedgerBySourceId.get(usage.id) ?? null;

    if (!usage.energyTransactionId || !usage.energyTransaction) {
      hasUsageIssue = true;
      addIssue({
        severity: 'medium',
        code: 'USAGE_MISSING_SETTLEMENT',
        title: 'Usage-Datensatz ohne Settlement-Transaktion',
        description: `PlatformCreditUsage ${usage.id} ist nicht mit einer EnergyTransaction verknüpft.`,
        entityType: 'PLATFORM_CREDIT_USAGE',
        entityId: usage.id,
      });
    } else if (usage.energyTransaction.status !== 'SETTLED') {
      hasUsageIssue = true;
      addIssue({
        severity: 'medium',
        code: 'USAGE_SETTLEMENT_NOT_FINAL',
        title: 'Usage-Datensatz mit nicht finalem Settlement',
        description: `PlatformCreditUsage ${usage.id} verweist auf eine EnergyTransaction mit Status ${usage.energyTransaction.status}.`,
        entityType: 'PLATFORM_CREDIT_USAGE',
        entityId: usage.id,
        relatedEntityIds: [usage.energyTransaction.id],
      });
    }

    if (requiresExpenseLedger && !ledgerEntry) {
      hasUsageIssue = true;
      addIssue({
        severity: 'high',
        code: 'USAGE_MISSING_EXPENSE_LEDGER',
        title: 'Providerkosten ohne Expense-Ledger',
        description: `PlatformCreditUsage ${usage.id} enthält Providerkosten, aber keinen Expense-Ledger-Eintrag.`,
        entityType: 'PLATFORM_CREDIT_USAGE',
        entityId: usage.id,
      });
    } else if (requiresExpenseLedger && ledgerEntry?.source !== 'CREDIT_USAGE') {
      hasUsageIssue = true;
      addIssue({
        severity: 'medium',
        code: 'USAGE_WRONG_LEDGER_SOURCE',
        title: 'Usage-Expense mit falscher Ledger-Quelle',
        description: `PlatformCreditUsage ${usage.id} zeigt auf einen Ledger-Eintrag mit Source ${ledgerEntry?.source} statt CREDIT_USAGE.`,
        entityType: 'PLATFORM_CREDIT_USAGE',
        entityId: usage.id,
        relatedEntityIds: ledgerEntry ? [ledgerEntry.id] : undefined,
      });
    } else if (
      requiresExpenseLedger &&
      ledgerEntry &&
      providerCostEur !== null &&
      hasAmountMismatch(providerCostEur, ledgerEntry.amountGross)
    ) {
      hasUsageIssue = true;
      addIssue({
        severity: 'medium',
        code: 'USAGE_LEDGER_AMOUNT_MISMATCH',
        title: 'Providerkosten und Expense-Ledger weichen ab',
        description: `PlatformCreditUsage ${usage.id} hat Providerkosten von ${providerCostEur} EUR, der Ledger-Eintrag aber ${ledgerEntry.amountGross} ${ledgerEntry.currency}.`,
        entityType: 'PLATFORM_CREDIT_USAGE',
        entityId: usage.id,
        relatedEntityIds: [ledgerEntry.id],
      });
    }

    if (!hasUsageIssue) {
      healthyUsageRecords += 1;
    }
  }

  let healthyReversalEntries = 0;
  for (const entry of ledgerEntries) {
    if (entry.source !== 'REVERSAL') continue;

    if (!entry.reversesEntryId) {
      addIssue({
        severity: 'high',
        code: 'REVERSAL_MISSING_ORIGINAL_ENTRY',
        title: 'Storno-Buchung ohne Originalreferenz',
        description: `Reversal-Ledger-Eintrag ${entry.id} hat kein reversesEntryId.`,
        entityType: 'PLATFORM_LEDGER_ENTRY',
        entityId: entry.id,
      });
      continue;
    }

    healthyReversalEntries += 1;
  }

  for (const grant of energyGrants) {
    if (grant.feature === 'monthly-subscription-credits') {
      const metadata = asRecord(grant.metadata);
      const stripeInvoiceId =
        readString(metadata, 'stripeInvoiceId') ?? parseStripeInvoiceRequestId(grant.requestId);

      if (!stripeInvoiceId || !invoicesByStripeInvoiceId.has(stripeInvoiceId)) {
        addIssue({
          severity: 'high',
          code: 'GRANT_MISSING_SUBSCRIPTION_INVOICE',
          title: 'Subscription-Grant ohne Rechnung',
          description: `EnergyTransaction ${grant.id} vergibt monatliche Credits, aber es gibt keine passende PlatformInvoice für Stripe-Invoice ${stripeInvoiceId ?? 'unbekannt'}.`,
          entityType: 'ENERGY_TRANSACTION',
          entityId: grant.id,
        });
      }
      continue;
    }

    if (grant.feature === 'credit-purchase' && !findCreditPurchaseForGrant(grant)) {
      addIssue({
        severity: 'medium',
        code: 'GRANT_MISSING_CREDIT_PURCHASE',
        title: 'Credit-Grant ohne Kaufdatensatz',
        description: `EnergyTransaction ${grant.id} vergibt Credits, aber es wurde kein passender PlatformCreditPurchase gefunden.`,
        entityType: 'ENERGY_TRANSACTION',
        entityId: grant.id,
      });
    }
  }

  for (const invoice of invoices) {
    const ledgerMetadata = asRecord(invoice.ledgerEntry?.metadata);
    const subscriptionCredits = readNumber(ledgerMetadata, 'credits');

    if (
      invoice.ledgerEntry?.source === 'SUBSCRIPTION' &&
      invoice.stripeInvoiceId &&
      subscriptionCredits !== null &&
      subscriptionCredits > 0
    ) {
      const grant =
        grantsByStripeInvoiceId.get(invoice.stripeInvoiceId) ??
        grantsByRequestId.get(`stripe-invoice-${invoice.stripeInvoiceId}`) ??
        null;

      if (!grant) {
        addIssue({
          severity: 'high',
          code: 'SUBSCRIPTION_INVOICE_MISSING_GRANT',
          title: 'Subscription-Rechnung ohne Credit-Grant',
          description: `Rechnung ${invoice.invoiceNumber} verbucht Subscription-Umsatz, aber der monatliche Credit-Grant fehlt.`,
          entityType: 'PLATFORM_INVOICE',
          entityId: invoice.id,
          relatedEntityIds: [invoice.ledgerEntry.id],
        });
      } else if (grant.delta !== subscriptionCredits) {
        addIssue({
          severity: 'high',
          code: 'SUBSCRIPTION_GRANT_AMOUNT_MISMATCH',
          title: 'Subscription-Credits stimmen nicht mit dem Grant überein',
          description: `Rechnung ${invoice.invoiceNumber} erwartet ${subscriptionCredits} Credits, der zugehörige Grant hat ${grant.delta}.`,
          entityType: 'PLATFORM_INVOICE',
          entityId: invoice.id,
          relatedEntityIds: [grant.id, invoice.ledgerEntry.id],
        });
      }
    }
  }

  issues.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    if (severityDelta !== 0) return severityDelta;
    return left.title.localeCompare(right.title, 'de-DE');
  });

  const highIssues = issues.filter((issue) => issue.severity === 'high').length;
  const mediumIssues = issues.filter((issue) => issue.severity === 'medium').length;
  const lowIssues = issues.filter((issue) => issue.severity === 'low').length;

  const checks: FinanceReconciliationCheck[] = [
    {
      code: 'WEBHOOK_AUDIT_COVERAGE',
      label: 'Stripe Webhooks → Audit',
      status: checkStatus(
        issues.filter((issue) =>
          ['WEBHOOK_MISSING_AUDIT', 'AUDIT_MISSING_WEBHOOK_EVENT'].includes(issue.code)
        ).length
      ),
      detail: `${healthyWebhookCoverage}/${webhookEvents.length} verarbeitete Webhooks haben ein korrespondierendes Finance-Audit.`,
    },
    {
      code: 'INVOICE_FINANCE_CHAIN',
      label: 'Invoice → PDF → Ledger',
      status: checkStatus(
        issues.filter((issue) => issue.entityType === 'PLATFORM_INVOICE').length
      ),
      detail: `${healthyInvoices}/${invoices.length} Rechnungen sind ohne erkannte Inkonsistenz finalisiert und im Ledger abgebildet.`,
    },
    {
      code: 'CREDIT_PURCHASE_CHAIN',
      label: 'Purchase → Grant → Ledger',
      status: checkStatus(
        issues.filter((issue) => issue.entityType === 'PLATFORM_CREDIT_PURCHASE').length
      ),
      detail: `${healthyPurchases}/${creditPurchases.length} Credit Purchases haben Rechnung, Grant und Ledger-Zuordnung.`,
    },
    {
      code: 'USAGE_EXPENSE_CHAIN',
      label: 'Usage → Expense Ledger',
      status: checkStatus(
        issues.filter((issue) => issue.entityType === 'PLATFORM_CREDIT_USAGE').length
      ),
      detail: `${healthyUsageRecords}/${usageRecords.length} Usage-Datensätze haben ein konsistentes Settlement und Expense-Ledger.`,
    },
    {
      code: 'REVERSAL_CHAIN',
      label: 'Ledger Reversals',
      status: checkStatus(
        issues.filter((issue) => issue.code === 'REVERSAL_MISSING_ORIGINAL_ENTRY').length
      ),
      detail: `${healthyReversalEntries}/${ledgerEntries.filter((entry) => entry.source === 'REVERSAL').length} Reversal-Einträge besitzen eine Originalreferenz.`,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      daysBack,
      maxItems,
      since: since.toISOString(),
    },
    summary: {
      totalIssues: issues.length,
      highIssues,
      mediumIssues,
      lowIssues,
      processedWebhookEvents: webhookEvents.length,
      webhookAudits: webhookAudits.length,
      invoicesChecked: invoices.length,
      creditPurchasesChecked: creditPurchases.length,
      usageRecordsChecked: usageRecords.length,
      ledgerEntriesChecked: ledgerEntries.length,
      healthyChecks: checks.filter((check) => check.status === 'ok').length,
    },
    checks,
    issues,
    notes: [
      'Credit-Purchase-Grants werden zuerst über Stripe-Metadaten gematcht und fallen für ältere Datensätze auf ein Zeitfenster-Heuristik-Matching zurück.',
      'Der Report ist read-only und eignet sich für Admin-Checks, API-Health-Exports oder spätere periodische Integrity-Jobs.',
    ],
  };
}
