import { FulfillmentOrderStatus, InboundPackageStatus, ReturnStatus } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '@/lib/database/prisma';

const OPEN_ORDER_STATUSES: FulfillmentOrderStatus[] = [
  FulfillmentOrderStatus.IMPORTED,
  FulfillmentOrderStatus.READY_TO_PICK,
  FulfillmentOrderStatus.PICKING,
  FulfillmentOrderStatus.PACKED,
];

const ACTIVE_RETURN_STATUSES: ReturnStatus[] = [
  ReturnStatus.ANNOUNCED,
  ReturnStatus.RECEIVED,
  ReturnStatus.INSPECTED,
];

const INBOUND_AGING_EXCLUDED: InboundPackageStatus[] = [
  InboundPackageStatus.STORED,
  InboundPackageStatus.PICKED_UP,
  InboundPackageStatus.CLOSED,
];

type ReorderSuggestionUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type WarehouseReorderSuggestion = {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  pendingDemand: number;
  projectedAfterDemand: number;
  suggestedOrderQty: number;
  urgency: ReorderSuggestionUrgency;
  defaultBinCode: string | null;
};

export type WarehouseReorderSuggestionResponse = {
  generatedAt: string;
  targetMultiplier: number;
  minimumOrderQty: number;
  totalItemsChecked: number;
  totalActionable: number;
  totalSuggestedOrderQty: number;
  items: WarehouseReorderSuggestion[];
};

export type WarehouseOpsDigest = {
  ventureId: string;
  ventureName: string;
  marker: string;
  dayKey: string;
  openOrders: number;
  orderAgingOver12h: number;
  openInbound: number;
  inboundAgingOver24h: number;
  unresolvedImportErrors: number;
  openReturns: number;
  shipmentsCreatedToday: number;
  lowStockCount: number;
  criticalLowStockCount: number;
  totalSuggestedOrderQty: number;
  topReorderItems: WarehouseReorderSuggestion[];
  actionable: boolean;
  summaryLine: string;
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function parseEnvInt(rawValue: string | undefined, fallbackValue: number, min: number, max: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallbackValue;
  return clampInt(parsed, min, max);
}

function urgencyRank(urgency: ReorderSuggestionUrgency): number {
  if (urgency === 'CRITICAL') return 0;
  if (urgency === 'HIGH') return 1;
  return 2;
}

function dayKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDigestMarker(date: Date): string {
  return `[WAREHOUSE_OPS_DIGEST:${dayKeyFromDate(date)}]`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createFromAddress(): string {
  const fromAddress =
    process.env.WAREHOUSE_RESEND_FROM ||
    process.env.AUTH_RESEND_FROM ||
    'onboarding@resend.dev';
  const senderName = process.env.WAREHOUSE_RESEND_FROM_NAME || 'LagerHub';
  if (fromAddress.includes('<')) return fromAddress;
  return `${senderName} <${fromAddress}>`;
}

type ReorderSuggestionConfig = {
  take?: number;
  includeHealthy?: boolean;
  targetMultiplier?: number;
  minimumOrderQty?: number;
};

export async function getWarehouseReorderSuggestions(
  ventureId: string,
  config: ReorderSuggestionConfig = {}
): Promise<WarehouseReorderSuggestionResponse> {
  const take = clampInt(config.take ?? 20, 1, 200);
  const includeHealthy = config.includeHealthy === true;
  const targetMultiplier =
    config.targetMultiplier ??
    parseEnvInt(process.env.WAREHOUSE_REORDER_TARGET_MULTIPLIER, 2, 1, 6);
  const minimumOrderQty =
    config.minimumOrderQty ??
    parseEnvInt(process.env.WAREHOUSE_REORDER_MIN_ORDER_QTY, 1, 1, 1000);

  const [items, demandLines] = await Promise.all([
    prisma.warehouseItem.findMany({
      where: {
        ventureId,
        isActive: true,
        reorderLevel: { gt: 0 },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        quantityOnHand: true,
        reservedQuantity: true,
        reorderLevel: true,
        defaultBin: {
          select: {
            code: true,
          },
        },
      },
    }),
    prisma.fulfillmentOrderLine.findMany({
      where: {
        order: {
          ventureId,
          status: { in: OPEN_ORDER_STATUSES },
        },
      },
      select: {
        sku: true,
        quantity: true,
      },
    }),
  ]);

  const demandBySku = new Map<string, number>();
  for (const line of demandLines) {
    const sku = line.sku.trim();
    if (!sku) continue;
    demandBySku.set(sku, (demandBySku.get(sku) || 0) + line.quantity);
  }

  const suggestions: WarehouseReorderSuggestion[] = items.map((item) => {
    const pendingDemand = demandBySku.get(item.sku) || 0;
    const availableQuantity = item.quantityOnHand - item.reservedQuantity;
    const projectedAfterDemand = availableQuantity - pendingDemand;
    const targetStock = Math.max(item.reorderLevel * targetMultiplier, item.reorderLevel + pendingDemand);
    const suggestedOrderQty =
      projectedAfterDemand <= item.reorderLevel
        ? Math.max(minimumOrderQty, targetStock - projectedAfterDemand)
        : 0;

    let urgency: ReorderSuggestionUrgency = 'MEDIUM';
    if (projectedAfterDemand <= 0) urgency = 'CRITICAL';
    else if (projectedAfterDemand <= Math.max(1, Math.floor(item.reorderLevel / 2))) urgency = 'HIGH';

    return {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      quantityOnHand: item.quantityOnHand,
      reservedQuantity: item.reservedQuantity,
      availableQuantity,
      reorderLevel: item.reorderLevel,
      pendingDemand,
      projectedAfterDemand,
      suggestedOrderQty,
      urgency,
      defaultBinCode: item.defaultBin?.code || null,
    };
  });

  const actionable = suggestions.filter((entry) => entry.suggestedOrderQty > 0);
  const sortedActionable = actionable.sort((a, b) => {
    if (urgencyRank(a.urgency) !== urgencyRank(b.urgency)) {
      return urgencyRank(a.urgency) - urgencyRank(b.urgency);
    }
    if (b.suggestedOrderQty !== a.suggestedOrderQty) {
      return b.suggestedOrderQty - a.suggestedOrderQty;
    }
    return a.sku.localeCompare(b.sku);
  });
  const responseItems = includeHealthy
    ? suggestions
    : sortedActionable.slice(0, take);

  return {
    generatedAt: new Date().toISOString(),
    targetMultiplier,
    minimumOrderQty,
    totalItemsChecked: items.length,
    totalActionable: actionable.length,
    totalSuggestedOrderQty: actionable.reduce((sum, entry) => sum + entry.suggestedOrderQty, 0),
    items: responseItems,
  };
}

export async function buildWarehouseOpsDigest(
  ventureId: string,
  ventureName: string
): Promise<WarehouseOpsDigest> {
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const marker = createDigestMarker(now);

  const [
    openOrders,
    orderAgingOver12h,
    openInbound,
    inboundAgingOver24h,
    unresolvedImportErrors,
    openReturns,
    shipmentsCreatedToday,
    reorderSuggestions,
  ] = await Promise.all([
    prisma.fulfillmentOrder.count({
      where: {
        ventureId,
        status: { in: OPEN_ORDER_STATUSES },
      },
    }),
    prisma.fulfillmentOrder.count({
      where: {
        ventureId,
        status: { in: [FulfillmentOrderStatus.READY_TO_PICK, FulfillmentOrderStatus.PICKING] },
        importedAt: { lt: twelveHoursAgo },
      },
    }),
    prisma.inboundPackage.count({
      where: {
        ventureId,
        status: { not: InboundPackageStatus.CLOSED },
      },
    }),
    prisma.inboundPackage.count({
      where: {
        ventureId,
        status: { notIn: INBOUND_AGING_EXCLUDED },
        receivedAt: { lt: twentyFourHoursAgo },
      },
    }),
    prisma.warehouseImportError.count({
      where: {
        ventureId,
        resolvedAt: null,
      },
    }),
    prisma.returnItem.count({
      where: {
        ventureId,
        status: { in: ACTIVE_RETURN_STATUSES },
      },
    }),
    prisma.shipment.count({
      where: {
        ventureId,
        createdAt: { gte: startOfToday },
      },
    }),
    getWarehouseReorderSuggestions(ventureId, { take: 5 }),
  ]);

  const criticalLowStockCount = reorderSuggestions.items.filter(
    (entry) => entry.urgency === 'CRITICAL'
  ).length;
  const lowStockCount = reorderSuggestions.totalActionable;
  const totalSuggestedOrderQty = reorderSuggestions.totalSuggestedOrderQty;
  const actionable =
    lowStockCount > 0 ||
    openOrders > 0 ||
    orderAgingOver12h > 0 ||
    openInbound > 0 ||
    inboundAgingOver24h > 0 ||
    unresolvedImportErrors > 0 ||
    openReturns > 0;

  const summaryLine =
    `LowStock ${lowStockCount} (kritisch ${criticalLowStockCount}) • ` +
    `OpenOrders ${openOrders} • InboundOpen ${openInbound} • ` +
    `Aging ${orderAgingOver12h + inboundAgingOver24h} • Errors ${unresolvedImportErrors} • ` +
    `Returns ${openReturns}`;

  return {
    ventureId,
    ventureName,
    marker,
    dayKey: dayKeyFromDate(now),
    openOrders,
    orderAgingOver12h,
    openInbound,
    inboundAgingOver24h,
    unresolvedImportErrors,
    openReturns,
    shipmentsCreatedToday,
    lowStockCount,
    criticalLowStockCount,
    totalSuggestedOrderQty,
    topReorderItems: reorderSuggestions.items,
    actionable,
    summaryLine,
  };
}

export function buildWarehouseOpsDigestNotification(summary: WarehouseOpsDigest): {
  title: string;
  message: string;
  href: string;
} {
  const previewItems = summary.topReorderItems
    .slice(0, 3)
    .map((entry) => `${entry.sku}:${entry.suggestedOrderQty}`)
    .join(', ');

  const messageParts = [
    summary.marker,
    summary.summaryLine,
    previewItems ? `Bestellung: ${previewItems}` : null,
  ].filter(Boolean);

  return {
    title: `LagerHub Ops Digest (${summary.dayKey})`,
    message: messageParts.join(' | '),
    href: `/forge/${summary.ventureId}/sourcing`,
  };
}

export async function sendWarehouseOpsDigestEmail(params: {
  to: string;
  digest: WarehouseOpsDigest;
}): Promise<{ sent: boolean; reason?: string }> {
  const rawTo = params.to.trim().toLowerCase();
  if (!rawTo) return { sent: false, reason: 'MISSING_RECIPIENT' };

  const apiKey = process.env.RESEND_API_KEY || process.env.AUTH_RESEND_KEY;
  if (!apiKey) return { sent: false, reason: 'RESEND_NOT_CONFIGURED' };

  const digest = params.digest;
  const subject = `LagerHub Ops Digest • ${digest.ventureName} • ${digest.dayKey}`;

  const topItemsHtml = digest.topReorderItems.length
    ? `<ul>${digest.topReorderItems
        .map(
          (entry) =>
            `<li>${escapeHtml(entry.sku)} - Vorschlag ${entry.suggestedOrderQty} ${escapeHtml(entry.unit)} (Bestand ${entry.availableQuantity})</li>`
        )
        .join('')}</ul>`
    : '<p>Keine aktiven Bestellvorschlaege.</p>';

  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.5;">` +
    `<p>${escapeHtml(digest.marker)}</p>` +
    `<p><strong>${escapeHtml(digest.ventureName)}</strong></p>` +
    `<p>${escapeHtml(digest.summaryLine)}</p>` +
    `<p><strong>Top-Bestellvorschlaege:</strong></p>` +
    topItemsHtml +
    `<p style="color:#666;font-size:12px;">Automatischer LagerHub Ops Digest.</p>` +
    `</div>`;

  const textLines = [
    digest.marker,
    digest.ventureName,
    digest.summaryLine,
    '',
    'Top-Bestellvorschlaege:',
    ...digest.topReorderItems.map(
      (entry) =>
        `- ${entry.sku}: ${entry.suggestedOrderQty} ${entry.unit} (Bestand ${entry.availableQuantity})`
    ),
    '',
    'Automatischer LagerHub Ops Digest.',
  ];

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: createFromAddress(),
      to: rawTo,
      subject,
      html,
      text: textLines.join('\n'),
    });
    return { sent: true };
  } catch (error) {
    console.error('Warehouse ops digest email failed:', error);
    return { sent: false, reason: 'SEND_FAILED' };
  }
}
