'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  Clock,
  Database,
  PackageCheck,
  PackagePlus,
  RefreshCcw,
  ScanLine,
  Send,
  Truck,
} from 'lucide-react';

type WarehouseItem = {
  id: string;
  sku: string;
  name: string;
  quantityOnHand: number;
  reservedQuantity: number;
  reorderLevel: number;
  unit: string;
  defaultBin?: {
    id: string;
    code: string;
    label: string | null;
  } | null;
};

type ReorderSuggestion = {
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
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  defaultBinCode: string | null;
};

type FulfillmentOrderLine = {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  pickedQuantity: number;
  packedQuantity: number;
  status: string;
};

type FulfillmentOrder = {
  id: string;
  orderNumber: string;
  source: string;
  status: string;
  currency: string;
  totalAmount: number | null;
  importedAt: string;
  customer?: {
    id: string;
    name: string | null;
    email: string | null;
    companyName: string | null;
  } | null;
  lines: FulfillmentOrderLine[];
};

type PickList = {
  id: string;
  status: string;
  generatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
  assignedTo?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  items: Array<{
    id: string;
    targetQty: number;
    pickedQty: number;
    status: string;
    orderLine: {
      id: string;
      sku: string;
      title: string;
      quantity: number;
      pickedQuantity: number;
      packedQuantity: number;
    };
  }>;
};

type Shipment = {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  status: string;
  createdAt: string;
  shippedAt: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    source: string;
  };
};

type InboundPackage = {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  status: string;
  receivedAt: string;
  photoUrls: string[];
  linkedOrder?: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
};

type WarehouseImportError = {
  id: string;
  provider: string;
  sourceEntity: string;
  sourceEntityId: string | null;
  errorMessage: string;
  createdAt: string;
  resolvedAt: string | null;
};

type StorageBin = {
  id: string;
  code: string;
  label: string | null;
  binType: string;
};

type InventoryEvent = {
  id: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  item: {
    id: string;
    sku: string;
    name: string;
  };
  createdBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  bin?: {
    id: string;
    code: string;
    label: string | null;
  } | null;
};

type ReturnItem = {
  id: string;
  status: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
  orderLine?: {
    id: string;
    sku: string;
    title: string;
  } | null;
};

type Props = {
  ventureId: string;
};

const CARRIER_OPTIONS = ['DHL', 'HERMES', 'UPS', 'DPD', 'GLS', 'OTHER'] as const;

function statusChipClass(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'DELIVERED':
    case 'CLOSED':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'CANCELLED':
    case 'LOST':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'SHIPPED':
    case 'IN_TRANSIT':
    case 'PICKING':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    case 'PACKED':
    case 'READY_TO_PICK':
    case 'STORED':
      return 'border-[#FF9900]/40 bg-[#FF9900]/15 text-[#FFB84D]';
    default:
      return 'border-white/20 bg-white/10 text-white/70';
  }
}

function reorderUrgencyClass(urgency: ReorderSuggestion['urgency']) {
  if (urgency === 'CRITICAL') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (urgency === 'HIGH') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
  return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
}

function formatDate(input: string | null | undefined) {
  if (!input) return '-';
  return new Date(input).toLocaleString();
}

export default function WarehousePanel({ ventureId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [inboundPackages, setInboundPackages] = useState<InboundPackage[]>([]);
  const [importErrors, setImportErrors] = useState<WarehouseImportError[]>([]);
  const [bins, setBins] = useState<StorageBin[]>([]);
  const [inventoryEvents, setInventoryEvents] = useState<InventoryEvent[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [shopifyImportRunning, setShopifyImportRunning] = useState(false);
  const [wooImportRunning, setWooImportRunning] = useState(false);
  const [inboundSaving, setInboundSaving] = useState(false);
  const [itemSaving, setItemSaving] = useState(false);
  const [inboundPhotoBusyId, setInboundPhotoBusyId] = useState<string | null>(null);
  const [pickupReceiptBusyId, setPickupReceiptBusyId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    reorderLevel: '0',
    quantityOnHand: '0',
    unit: 'pcs',
  });
  const [newInbound, setNewInbound] = useState({
    carrier: 'OTHER',
    trackingNumber: '',
    notes: '',
    status: 'RECEIVED',
  });
  const [scanFocusLock, setScanFocusLock] = useState(true);
  const [scanBusy, setScanBusy] = useState<'INBOUND' | 'OUTBOUND' | null>(null);
  const [scanInboundCarrier, setScanInboundCarrier] =
    useState<(typeof CARRIER_OPTIONS)[number]>('DHL');
  const [scanInboundTracking, setScanInboundTracking] = useState('');
  const [scanInboundBinCode, setScanInboundBinCode] = useState('');
  const [pendingStoreTracking, setPendingStoreTracking] = useState('');
  const [duplicateInbound, setDuplicateInbound] = useState<InboundPackage | null>(null);
  const [duplicateLinkOrderId, setDuplicateLinkOrderId] = useState('');
  const [scanOutboundOrderId, setScanOutboundOrderId] = useState('');
  const [scanOutboundCarrier, setScanOutboundCarrier] =
    useState<(typeof CARRIER_OPTIONS)[number]>('DHL');
  const [scanOutboundTracking, setScanOutboundTracking] = useState('');
  const [scanPickListId, setScanPickListId] = useState('');
  const [scanPickSku, setScanPickSku] = useState('');
  const [trackingLookup, setTrackingLookup] = useState('');
  const [scanReturnTracking, setScanReturnTracking] = useState('');
  const [cutoffCarrier, setCutoffCarrier] = useState<(typeof CARRIER_OPTIONS)[number]>('DHL');
  const [cutoffDate, setCutoffDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scanFeedback, setScanFeedback] = useState<{
    level: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const inboundScanInputRef = useRef<HTMLInputElement | null>(null);
  const inboundBinInputRef = useRef<HTMLInputElement | null>(null);
  const outboundScanInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    const totalOnHand = items.reduce((sum, item) => sum + item.quantityOnHand, 0);
    const lowStock = items.filter(
      (item) => item.reorderLevel > 0 && item.quantityOnHand <= item.reorderLevel
    ).length;
    const openOrders = orders.filter(
      (order) => !['CANCELLED', 'COMPLETED', 'SHIPPED'].includes(order.status)
    ).length;
    const openInbound = inboundPackages.filter((pkg) => pkg.status !== 'CLOSED').length;
    const unresolvedImportErrors = importErrors.filter((entry) => !entry.resolvedAt).length;

    return { totalOnHand, lowStock, openOrders, openInbound, unresolvedImportErrors };
  }, [items, orders, inboundPackages, importErrors]);

  const shippableOrders = useMemo(
    () => orders.filter((order) => ['READY_TO_PICK', 'PICKING', 'PACKED'].includes(order.status)),
    [orders]
  );

  const activePickLists = useMemo(
    () => pickLists.filter((pick) => !['COMPLETED', 'CANCELLED'].includes(pick.status)),
    [pickLists]
  );

  const slaStats = useMemo(() => {
    const now = Date.now();
    const inboundOlderThan24h = inboundPackages.filter((pkg) => {
      if (['STORED', 'CLOSED', 'PICKED_UP'].includes(pkg.status)) return false;
      const ageMs = now - new Date(pkg.receivedAt).getTime();
      return ageMs > 24 * 60 * 60 * 1000;
    }).length;

    const orderAgingOver12h = orders.filter((order) => {
      if (!['READY_TO_PICK', 'PICKING'].includes(order.status)) return false;
      const ageMs = now - new Date(order.importedAt).getTime();
      return ageMs > 12 * 60 * 60 * 1000;
    }).length;

    return { inboundOlderThan24h, orderAgingOver12h };
  }, [inboundPackages, orders]);

  const trackingMatches = useMemo(() => {
    const q = trackingLookup.trim().toLowerCase();
    if (!q) return [];

    const inboundHits = inboundPackages
      .filter((pkg) => (pkg.trackingNumber || '').toLowerCase().includes(q))
      .map((pkg) => ({
        id: `inbound:${pkg.id}`,
        type: 'INBOUND',
        tracking: pkg.trackingNumber || '-',
        status: pkg.status,
        label: pkg.linkedOrder?.orderNumber || 'ohne Order',
      }));

    const shipmentHits = shipments
      .filter((shipment) => (shipment.trackingNumber || '').toLowerCase().includes(q))
      .map((shipment) => ({
        id: `shipment:${shipment.id}`,
        type: 'SHIPMENT',
        tracking: shipment.trackingNumber || '-',
        status: shipment.status,
        label: shipment.order.orderNumber,
      }));

    return [...inboundHits, ...shipmentHits].slice(0, 10);
  }, [trackingLookup, inboundPackages, shipments]);

  const cutoffBatchShipments = useMemo(() => {
    const selectedDay = cutoffDate;
    return shipments.filter((shipment) => {
      const shipmentDay = new Date(shipment.createdAt).toISOString().slice(0, 10);
      return shipment.carrier === cutoffCarrier && shipmentDay === selectedDay;
    });
  }, [shipments, cutoffCarrier, cutoffDate]);

  useEffect(() => {
    if (shippableOrders.length === 0) {
      setScanOutboundOrderId('');
      return;
    }

    if (!shippableOrders.some((order) => order.id === scanOutboundOrderId)) {
      setScanOutboundOrderId(shippableOrders[0].id);
    }
  }, [shippableOrders, scanOutboundOrderId]);

  useEffect(() => {
    if (activePickLists.length === 0) {
      setScanPickListId('');
      return;
    }

    if (!activePickLists.some((pick) => pick.id === scanPickListId)) {
      setScanPickListId(activePickLists[0].id);
    }
  }, [activePickLists, scanPickListId]);

  useEffect(() => {
    if (!duplicateInbound) {
      setDuplicateLinkOrderId('');
      return;
    }
    if (orders.length > 0 && !duplicateLinkOrderId) {
      setDuplicateLinkOrderId(orders[0].id);
    }
  }, [duplicateInbound, orders, duplicateLinkOrderId]);

  useEffect(() => {
    if (!scanFocusLock) return;
    const timer = window.setTimeout(() => {
      inboundScanInputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [scanFocusLock]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          itemsRes,
          ordersRes,
          reorderRes,
          pickRes,
          shipmentRes,
          inboundRes,
          importErrRes,
          binsRes,
          inventoryRes,
          returnsRes,
        ] =
          await Promise.all([
          fetch(`/api/ventures/${ventureId}/warehouse/items`),
          fetch(`/api/ventures/${ventureId}/warehouse/orders`),
          fetch(`/api/ventures/${ventureId}/warehouse/reorder-suggestions?take=12`),
          fetch(`/api/ventures/${ventureId}/warehouse/picklists`),
          fetch(`/api/ventures/${ventureId}/warehouse/shipments`),
          fetch(`/api/ventures/${ventureId}/warehouse/inbound-packages`),
          fetch(`/api/ventures/${ventureId}/warehouse/import-errors?resolved=false`),
          fetch(`/api/ventures/${ventureId}/warehouse/bins?take=100`),
          fetch(`/api/ventures/${ventureId}/warehouse/inventory-transactions?take=50`),
          fetch(`/api/ventures/${ventureId}/warehouse/returns?take=50`),
        ]);

        if (
          !itemsRes.ok ||
          !ordersRes.ok ||
          !reorderRes.ok ||
          !pickRes.ok ||
          !shipmentRes.ok ||
          !inboundRes.ok ||
          !importErrRes.ok ||
          !binsRes.ok ||
          !inventoryRes.ok ||
          !returnsRes.ok
        ) {
          throw new Error('Warehouse API konnte nicht geladen werden.');
        }

        const [
          itemsData,
          ordersData,
          reorderData,
          pickData,
          shipmentData,
          inboundData,
          importErrData,
          binsData,
          inventoryData,
          returnsData,
        ] = await Promise.all([
          itemsRes.json(),
          ordersRes.json(),
          reorderRes.json(),
          pickRes.json(),
          shipmentRes.json(),
          inboundRes.json(),
          importErrRes.json(),
          binsRes.json(),
          inventoryRes.json(),
          returnsRes.json(),
        ]);

        if (!active) return;
        setItems(Array.isArray(itemsData) ? itemsData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setReorderSuggestions(Array.isArray(reorderData?.items) ? reorderData.items : []);
        setPickLists(Array.isArray(pickData) ? pickData : []);
        setShipments(Array.isArray(shipmentData) ? shipmentData : []);
        setInboundPackages(Array.isArray(inboundData) ? inboundData : []);
        setImportErrors(Array.isArray(importErrData) ? importErrData : []);
        setBins(Array.isArray(binsData) ? binsData : []);
        setInventoryEvents(Array.isArray(inventoryData) ? inventoryData : []);
        setReturns(Array.isArray(returnsData) ? returnsData : []);
      } catch (loadError) {
        if (!active) return;
        console.error('Warehouse load failed:', loadError);
        setError('Warehouse-Daten konnten nicht geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [ventureId, refreshTick]);

  const refresh = () => setRefreshTick((v) => v + 1);

  const createItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItem.sku.trim() || !newItem.name.trim()) {
      window.alert('SKU und Name sind erforderlich.');
      return;
    }

    setItemSaving(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newItem.sku.trim(),
          name: newItem.name.trim(),
          reorderLevel: Number(newItem.reorderLevel) || 0,
          quantityOnHand: Number(newItem.quantityOnHand) || 0,
          unit: newItem.unit.trim() || 'pcs',
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(payload?.error || 'Artikel konnte nicht erstellt werden.');
        return;
      }

      setNewItem({ sku: '', name: '', reorderLevel: '0', quantityOnHand: '0', unit: 'pcs' });
      refresh();
    } finally {
      setItemSaving(false);
    }
  };

  const adjustItem = async (item: WarehouseItem, mode: 'in' | 'out') => {
    const quantityInput = window.prompt(
      `${mode === 'in' ? 'Zugang' : 'Abgang'} fuer ${item.sku} (Ganzzahl):`,
      '1'
    );
    if (quantityInput === null) return;
    const quantity = Number(quantityInput);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      window.alert('Bitte eine positive Ganzzahl eingeben.');
      return;
    }

    const reason = window.prompt('Grund / Referenz (optional):', '') || null;
    const delta = mode === 'in' ? quantity : -quantity;

    const res = await fetch(`/api/ventures/${ventureId}/warehouse/items/${item.id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delta,
        reason,
        referenceType: mode === 'in' ? 'MANUAL_INBOUND' : 'MANUAL_OUTBOUND',
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(payload?.error || 'Bestand konnte nicht angepasst werden.');
      return;
    }

    refresh();
  };

  const createInbound = async (event: React.FormEvent) => {
    event.preventDefault();
    setInboundSaving(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/inbound-packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: newInbound.carrier,
          trackingNumber: newInbound.trackingNumber.trim() || null,
          notes: newInbound.notes.trim() || null,
          status: newInbound.status,
          photoUrls: [],
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(payload?.error || 'Inbound-Paket konnte nicht angelegt werden.');
        return;
      }

      setNewInbound({
        carrier: 'OTHER',
        trackingNumber: '',
        notes: '',
        status: 'RECEIVED',
      });
      refresh();
    } finally {
      setInboundSaving(false);
    }
  };

  const updateInboundStatus = async (packageId: string, status: string) => {
    const res = await fetch(`/api/ventures/${ventureId}/warehouse/inbound-packages/${packageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(payload?.error || 'Inbound-Status konnte nicht aktualisiert werden.');
      return;
    }
    refresh();
  };

  const uploadInboundPhoto = async (packageId: string, file: File | null) => {
    if (!file) return;
    setInboundPhotoBusyId(packageId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('retentionDays', '30');

      const res = await fetch(
        `/api/ventures/${ventureId}/warehouse/inbound-packages/${packageId}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScanFeedback({
          level: 'error',
          message: payload?.error || 'Foto-Upload fehlgeschlagen.',
        });
        return;
      }

      setScanFeedback({
        level: 'success',
        message: 'Foto erfolgreich dokumentiert.',
      });
      refresh();
    } finally {
      setInboundPhotoBusyId(null);
    }
  };

  const createPickupReceipt = async (packageId: string) => {
    const recipientName = window.prompt('Name der abholenden Person:', '') || '';
    const recipientDocument = window.prompt('Ausweis-/Dokument-ID (optional):', '') || '';
    setPickupReceiptBusyId(packageId);
    try {
      const res = await fetch(
        `/api/ventures/${ventureId}/warehouse/inbound-packages/${packageId}/pickup-receipt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientName: recipientName.trim() || undefined,
            recipientDocument: recipientDocument.trim() || undefined,
          }),
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScanFeedback({
          level: 'error',
          message: payload?.error || 'Digitale Quittung fehlgeschlagen.',
        });
        return;
      }

      const receipt = payload?.receipt;
      const receiptNumber = receipt?.receiptNumber || 'RECEIPT';
      const receiptText = [
        `receipt_number: ${receiptNumber}`,
        `package_id: ${receipt?.packageId || packageId}`,
        `tracking_number: ${receipt?.trackingNumber || '-'}`,
        `picked_up_at: ${receipt?.pickedUpAt || new Date().toISOString()}`,
        `recipient_name: ${receipt?.recipientName || '-'}`,
        `recipient_document: ${receipt?.recipientDocument || '-'}`,
      ].join('\n');

      const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pickup-receipt-${receiptNumber}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      setScanFeedback({
        level: 'success',
        message: `Digitale Quittung erstellt: ${receiptNumber}`,
      });
      refresh();
    } finally {
      setPickupReceiptBusyId(null);
    }
  };

  const generatePickList = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/picklists/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(payload?.error || 'Pickliste konnte nicht erstellt werden.');
        return;
      }
      refresh();
    } finally {
      setBusyOrderId(null);
    }
  };

  const createShipment = async (orderId: string) => {
    const trackingNumber = window.prompt('Trackingnummer (optional):', '') || null;
    const carrierChoice = window.prompt('Carrier (DHL/HERMES/UPS/DPD/GLS/OTHER):', 'OTHER') || 'OTHER';
    const carrier = CARRIER_OPTIONS.includes(carrierChoice.toUpperCase() as (typeof CARRIER_OPTIONS)[number])
      ? carrierChoice.toUpperCase()
      : 'OTHER';

    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/shipments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          trackingNumber: trackingNumber?.trim() || null,
          carrier,
          markOrderShipped: true,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(payload?.error || 'Shipment konnte nicht erstellt werden.');
        return;
      }
      refresh();
    } finally {
      setBusyOrderId(null);
    }
  };

  const updatePickListStatus = async (pickListId: string, status: string) => {
    const res = await fetch(`/api/ventures/${ventureId}/warehouse/picklists/${pickListId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(payload?.error || 'Picklist-Status konnte nicht aktualisiert werden.');
      return;
    }
    refresh();
  };

  const resolveImportError = async (errorId: string) => {
    const res = await fetch(`/api/ventures/${ventureId}/warehouse/import-errors/${errorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: true }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(payload?.error || 'Import-Fehler konnte nicht als erledigt markiert werden.');
      return;
    }
    refresh();
  };

  const importShopify = async () => {
    setShopifyImportRunning(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/orders/import/shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopifyStatus: 'open', limit: 50 }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(payload?.error || 'Shopify-Import fehlgeschlagen.');
        return;
      }

      const summary =
        `Import abgeschlossen:\n` +
        `Total: ${payload.total ?? 0}\n` +
        `Neu: ${payload.created ?? 0}\n` +
        `Aktualisiert: ${payload.updated ?? 0}\n` +
        `Fehler: ${payload.failed ?? 0}`;
      window.alert(summary);
      refresh();
    } finally {
      setShopifyImportRunning(false);
    }
  };

  const importWooCommerce = async () => {
    const storeUrl = window.prompt('WooCommerce Store URL (z.B. https://shop.de):', '') || '';
    const consumerKey = window.prompt('WooCommerce Consumer Key:', '') || '';
    const consumerSecret = window.prompt('WooCommerce Consumer Secret:', '') || '';

    if (!storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()) {
      setScanFeedback({
        level: 'info',
        message: 'WooCommerce-Import abgebrochen (fehlende Zugangsdaten).',
      });
      return;
    }

    setWooImportRunning(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/orders/import/woocommerce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: storeUrl.trim(),
          consumerKey: consumerKey.trim(),
          consumerSecret: consumerSecret.trim(),
          wooStatus: 'processing',
          limit: 50,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(payload?.error || 'WooCommerce-Import fehlgeschlagen.');
        return;
      }

      const summary =
        `WooCommerce-Import abgeschlossen:\n` +
        `Total: ${payload.total ?? 0}\n` +
        `Neu: ${payload.created ?? 0}\n` +
        `Aktualisiert: ${payload.updated ?? 0}\n` +
        `Fehler: ${payload.failed ?? 0}`;
      window.alert(summary);
      refresh();
    } finally {
      setWooImportRunning(false);
    }
  };

  const reportException = async (
    sourceEntity: string,
    errorMessage: string,
    sourceEntityId?: string | null,
    payload?: Record<string, unknown>
  ) => {
    await fetch(`/api/ventures/${ventureId}/warehouse/import-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'MANUAL',
        sourceEntity,
        sourceEntityId: sourceEntityId || null,
        errorMessage,
        payload,
      }),
    }).catch(() => null);
  };

  const scanInboundPackage = async (event: React.FormEvent) => {
    event.preventDefault();

    const trackingNumber = scanInboundTracking.trim();
    if (!trackingNumber) {
      setScanFeedback({ level: 'error', message: 'Bitte Trackingnummer scannen.' });
      return;
    }

    setScanBusy('INBOUND');
    try {
      const existing = inboundPackages.find(
        (pkg) => pkg.trackingNumber?.trim().toLowerCase() === trackingNumber.toLowerCase()
      );
      if (existing) {
        if (existing.status === 'RECEIVED') {
          const transitionRes = await fetch(
            `/api/ventures/${ventureId}/warehouse/inbound-packages/${existing.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'STORED' }),
            }
          );
          const transitionPayload = await transitionRes.json().catch(() => ({}));
          if (!transitionRes.ok) {
            setScanFeedback({
              level: 'error',
              message:
                transitionPayload?.error ||
                `Inbound erkannt, aber Auto-Store fehlgeschlagen: ${trackingNumber}`,
            });
            setScanInboundTracking('');
            return;
          }

          setScanFeedback({
            level: 'success',
            message: `Inbound automatisch auf STORED gesetzt: ${trackingNumber}`,
          });
          setScanInboundTracking('');
          setPendingStoreTracking('');
          setDuplicateInbound(null);
          refresh();
          return;
        }

        setDuplicateInbound(existing);
        setScanFeedback({
          level: 'info',
          message: `Inbound bereits vorhanden (${existing.status}). Optional mit Order verknuepfen.`,
        });
        setScanInboundTracking('');
        setPendingStoreTracking('');
        return;
      }

      const res = await fetch(`/api/ventures/${ventureId}/warehouse/inbound-packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: scanInboundCarrier,
          trackingNumber,
          status: 'RECEIVED',
          notes: 'Scan Intake (Warehouse Panel)',
          photoUrls: [],
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScanFeedback({
          level: 'error',
          message: payload?.error || 'Inbound-Scan konnte nicht gespeichert werden.',
        });
        return;
      }

      setScanFeedback({
        level: 'success',
        message: `Inbound erfasst: ${trackingNumber}. Jetzt Bin-Code scannen.`,
      });
      setScanInboundTracking('');
      setPendingStoreTracking(trackingNumber);
      setDuplicateInbound(null);
      refresh();
      if (scanFocusLock) {
        setTimeout(() => inboundBinInputRef.current?.focus(), 10);
      }
    } finally {
      setScanBusy(null);
      if (scanFocusLock) {
        setTimeout(() => inboundScanInputRef.current?.focus(), 10);
      }
    }
  };

  const scanStorePendingInbound = async (event: React.FormEvent) => {
    event.preventDefault();
    const trackingNumber = pendingStoreTracking.trim();
    const binCode = scanInboundBinCode.trim();

    if (!trackingNumber || !binCode) {
      setScanFeedback({
        level: 'error',
        message: 'Bitte Tracking und Bin-Code scannen.',
      });
      return;
    }

    setScanBusy('INBOUND');
    try {
      const bin = bins.find((entry) => entry.code.toLowerCase() === binCode.toLowerCase());
      if (!bin) {
        await reportException(
          'SCAN_INBOUND_NEEDS_REVIEW',
          `Unbekannter Bin-Code: ${binCode}`,
          trackingNumber,
          { trackingNumber, binCode }
        );
        setScanFeedback({
          level: 'error',
          message: `Bin-Code nicht gefunden: ${binCode}. Klärfall wurde in Queue gelegt.`,
        });
        return;
      }

      const pkg = inboundPackages.find(
        (entry) => entry.trackingNumber?.trim().toLowerCase() === trackingNumber.toLowerCase()
      );
      if (!pkg) {
        await reportException(
          'SCAN_INBOUND_NEEDS_REVIEW',
          `Tracking nicht gefunden fuer Bin-Store: ${trackingNumber}`,
          trackingNumber,
          { trackingNumber, binCode }
        );
        setScanFeedback({
          level: 'error',
          message: `Tracking nicht gefunden: ${trackingNumber}. Klärfall wurde in Queue gelegt.`,
        });
        return;
      }

      const noteBase = `[BIN:${bin.code}]`;
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/inbound-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'STORED',
          notes: noteBase,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        await reportException(
          'SCAN_INBOUND_NEEDS_REVIEW',
          payload?.error || `Store fehlgeschlagen fuer ${trackingNumber}`,
          trackingNumber,
          { trackingNumber, binCode, packageId: pkg.id }
        );
        setScanFeedback({
          level: 'error',
          message: payload?.error || 'Auto-Store fehlgeschlagen. Klärfall wurde gespeichert.',
        });
        return;
      }

      setScanFeedback({
        level: 'success',
        message: `Inbound STORED in Bin ${bin.code}: ${trackingNumber}`,
      });
      setPendingStoreTracking('');
      setScanInboundBinCode('');
      refresh();
      if (scanFocusLock) {
        setTimeout(() => inboundScanInputRef.current?.focus(), 10);
      }
    } finally {
      setScanBusy(null);
    }
  };

  const resolveDuplicateInboundLink = async () => {
    if (!duplicateInbound || !duplicateLinkOrderId) {
      setScanFeedback({
        level: 'error',
        message: 'Bitte Duplikat und Ziel-Order waehlen.',
      });
      return;
    }

    const res = await fetch(
      `/api/ventures/${ventureId}/warehouse/inbound-packages/${duplicateInbound.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedOrderId: duplicateLinkOrderId,
          status: 'LINKED_TO_ORDER',
        }),
      }
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setScanFeedback({
        level: 'error',
        message: payload?.error || 'Duplikat konnte nicht verknuepft werden.',
      });
      return;
    }

    setScanFeedback({
      level: 'success',
      message: `Duplikat mit Order verknuepft: ${payload?.linkedOrder?.orderNumber || duplicateLinkOrderId}`,
    });
    setDuplicateInbound(null);
    refresh();
  };

  const scanPickListSku = async (event: React.FormEvent) => {
    event.preventDefault();
    const pickListId = scanPickListId.trim();
    const sku = scanPickSku.trim().toLowerCase();
    if (!pickListId || !sku) {
      setScanFeedback({
        level: 'error',
        message: 'Bitte Pickliste und SKU scannen.',
      });
      return;
    }

    const selectedPickList = activePickLists.find((pick) => pick.id === pickListId);
    if (!selectedPickList) {
      setScanFeedback({
        level: 'error',
        message: 'Pickliste nicht gefunden oder nicht aktiv.',
      });
      return;
    }

    const candidate = selectedPickList.items.find(
      (item) =>
        item.orderLine.sku.toLowerCase() === sku &&
        item.pickedQty < item.targetQty &&
        item.status !== 'PICKED'
    );

    if (!candidate) {
      await reportException(
        'PICK_SCAN_NEEDS_REVIEW',
        `SKU ${scanPickSku.trim()} passt auf keine offene Pickline`,
        selectedPickList.id,
        { pickListId: selectedPickList.id, sku: scanPickSku.trim() }
      );
      setScanFeedback({
        level: 'error',
        message: `Keine offene Pickline fuer SKU ${scanPickSku.trim()}. Klärfall erstellt.`,
      });
      return;
    }

    const res = await fetch(`/api/ventures/${ventureId}/warehouse/picklists/${pickListId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        items: [{ id: candidate.id, pickedQty: candidate.targetQty, status: 'PICKED' }],
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setScanFeedback({
        level: 'error',
        message: payload?.error || 'Pick-Scan fehlgeschlagen.',
      });
      return;
    }

    setScanFeedback({
      level: 'success',
      message: `Gepickt: ${candidate.orderLine.sku} (${candidate.targetQty})`,
    });
    setScanPickSku('');
    refresh();
  };

  const scanReturnFromTracking = async (event: React.FormEvent) => {
    event.preventDefault();
    const tracking = scanReturnTracking.trim();
    if (!tracking) {
      setScanFeedback({ level: 'error', message: 'Bitte Return-Tracking scannen.' });
      return;
    }

    const shipment = shipments.find(
      (entry) => entry.trackingNumber?.trim().toLowerCase() === tracking.toLowerCase()
    );

    if (!shipment) {
      await reportException(
        'RETURN_SCAN_NEEDS_REVIEW',
        `Return-Tracking nicht gefunden: ${tracking}`,
        tracking,
        { tracking }
      );
      setScanFeedback({
        level: 'error',
        message: `Tracking unbekannt. Klärfall erstellt: ${tracking}`,
      });
      return;
    }

    const res = await fetch(`/api/ventures/${ventureId}/warehouse/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: shipment.order.id,
        status: 'RECEIVED',
        reason: 'Return scan (warehouse)',
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setScanFeedback({
        level: 'error',
        message: payload?.error || 'Return konnte nicht erstellt werden.',
      });
      return;
    }

    setScanFeedback({
      level: 'success',
      message: `Return angelegt fuer ${shipment.order.orderNumber}`,
    });
    setScanReturnTracking('');
    refresh();
  };

  const updateReturnStatus = async (returnId: string, status: string) => {
    const res = await fetch(`/api/ventures/${ventureId}/warehouse/returns/${returnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(payload?.error || 'Return-Status konnte nicht aktualisiert werden.');
      return;
    }
    refresh();
  };

  const exportCutoffCsv = () => {
    if (cutoffBatchShipments.length === 0) {
      setScanFeedback({
        level: 'info',
        message: 'Keine Shipments im gewaehlten Cutoff-Batch.',
      });
      return;
    }

    const header = ['order_number', 'carrier', 'tracking_number', 'status', 'created_at'];
    const rows = cutoffBatchShipments.map((shipment) => [
      shipment.order.orderNumber,
      shipment.carrier,
      shipment.trackingNumber || '',
      shipment.status,
      new Date(shipment.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handover_${cutoffCarrier}_${cutoffDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scanOutboundPackage = async (event: React.FormEvent) => {
    event.preventDefault();

    const trackingNumber = scanOutboundTracking.trim();
    if (!scanOutboundOrderId) {
      await reportException(
        'SCAN_OUTBOUND_NEEDS_REVIEW',
        'Outbound-Scan ohne ausgewaehlte Order',
        null,
        { trackingNumber }
      );
      setScanFeedback({
        level: 'error',
        message: 'Bitte zuerst eine Fulfillment-Order waehlen.',
      });
      return;
    }
    if (!trackingNumber) {
      setScanFeedback({ level: 'error', message: 'Bitte Trackingnummer scannen.' });
      return;
    }

    setScanBusy('OUTBOUND');
    try {
      const res = await fetch(`/api/ventures/${ventureId}/warehouse/shipments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: scanOutboundOrderId,
          trackingNumber,
          carrier: scanOutboundCarrier,
          markOrderShipped: true,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        await reportException(
          'SCAN_OUTBOUND_NEEDS_REVIEW',
          payload?.error || 'Outbound-Scan konnte nicht verbucht werden',
          scanOutboundOrderId,
          { trackingNumber, orderId: scanOutboundOrderId }
        );
        setScanFeedback({
          level: 'error',
          message: payload?.error || 'Outbound-Scan konnte nicht verbucht werden.',
        });
        return;
      }

      const orderLabel =
        orders.find((order) => order.id === scanOutboundOrderId)?.orderNumber || scanOutboundOrderId;
      setScanFeedback({
        level: payload?.reused ? 'info' : 'success',
        message: payload?.reused
          ? `Shipment bereits vorhanden fuer ${orderLabel} (${trackingNumber}).`
          : `Shipment versendet: ${orderLabel} (${trackingNumber})`,
      });
      setScanOutboundTracking('');
      refresh();
    } finally {
      setScanBusy(null);
      if (scanFocusLock) {
        setTimeout(() => outboundScanInputRef.current?.focus(), 10);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-white/50">
        <RefreshCcw className="mr-2 h-5 w-5 animate-spin" />
        Warehouse wird geladen...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="mb-3 flex items-center justify-between">
            <Database className="h-5 w-5 text-[#FF9900]" />
            <span className="text-xs text-white/40">SKUs</span>
          </div>
          <p className="text-3xl font-instrument-serif text-white">{items.length}</p>
          <p className="text-xs text-white/50">Aktive Artikel im Lager</p>
        </div>
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="mb-3 flex items-center justify-between">
            <Boxes className="h-5 w-5 text-blue-300" />
            <span className="text-xs text-white/40">On Hand</span>
          </div>
          <p className="text-3xl font-instrument-serif text-white">{stats.totalOnHand}</p>
          <p className="text-xs text-white/50">Verfuegbare Einheiten</p>
        </div>
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="mb-3 flex items-center justify-between">
            <ScanLine className="h-5 w-5 text-[#FFB84D]" />
            <span className="text-xs text-white/40">Open Orders</span>
          </div>
          <p className="text-3xl font-instrument-serif text-white">{stats.openOrders}</p>
          <p className="text-xs text-white/50">Noch nicht abgeschlossen</p>
        </div>
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="mb-3 flex items-center justify-between">
            <AlertCircle className="h-5 w-5 text-red-300" />
            <span className="text-xs text-white/40">Low Stock</span>
          </div>
          <p className="text-3xl font-instrument-serif text-white">{stats.lowStock}</p>
          <p className="text-xs text-white/50">
            {stats.openInbound} Inbound offen • {stats.unresolvedImportErrors} Import-Fehler
          </p>
        </div>
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="mb-3 flex items-center justify-between">
            <Clock className="h-5 w-5 text-yellow-300" />
            <span className="text-xs text-white/40">SLA Aging</span>
          </div>
          <p className="text-3xl font-instrument-serif text-white">
            {slaStats.inboundOlderThan24h + slaStats.orderAgingOver12h}
          </p>
          <p className="text-xs text-white/50">
            Inbound &gt;24h: {slaStats.inboundOlderThan24h} • Orders &gt;12h: {slaStats.orderAgingOver12h}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="glass-card rounded-2xl border border-white/10 p-5">
        <div className="mb-4 flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-[#FF9900]" />
          <h3 className="text-lg font-semibold text-white">Scan Modus (Lagerstation)</h3>
        </div>
        <p className="mb-4 text-sm text-white/60">
          Handscanner als Keyboard verbinden, Feld fokussieren, scannen, Enter.
        </p>
        <label className="mb-4 inline-flex items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={scanFocusLock}
            onChange={(event) => setScanFocusLock(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/20"
          />
          Fokus im Scan-Feld halten
        </label>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <form onSubmit={scanInboundPackage}>
              <p className="mb-3 text-sm font-semibold text-white">Ankommende Pakete (Inbound)</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={scanInboundCarrier}
                  onChange={(event) =>
                    setScanInboundCarrier(event.target.value as (typeof CARRIER_OPTIONS)[number])
                  }
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#FF9900]"
                >
                  {CARRIER_OPTIONS.map((carrier) => (
                    <option key={carrier} value={carrier}>
                      {carrier}
                    </option>
                  ))}
                </select>
                <input
                  ref={inboundScanInputRef}
                  value={scanInboundTracking}
                  onChange={(event) => setScanInboundTracking(event.target.value)}
                  onBlur={() => {
                    if (scanFocusLock) setTimeout(() => inboundScanInputRef.current?.focus(), 0);
                  }}
                  placeholder="Tracking scannen"
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900] sm:col-span-2"
                />
              </div>
              <button
                type="submit"
                disabled={scanBusy === 'INBOUND'}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#FF9900] px-3 py-2 text-xs font-bold text-black hover:opacity-90 disabled:opacity-50"
              >
                <PackagePlus className="h-3.5 w-3.5" />
                {scanBusy === 'INBOUND' ? 'Verbuche...' : 'Inbound verbuchen'}
              </button>
            </form>

            <form onSubmit={scanStorePendingInbound} className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                Store-Scan (Tracking + Bin)
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={pendingStoreTracking}
                  onChange={(event) => setPendingStoreTracking(event.target.value)}
                  placeholder="Tracking fuer STORED"
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#FF9900]"
                />
                <input
                  ref={inboundBinInputRef}
                  value={scanInboundBinCode}
                  onChange={(event) => setScanInboundBinCode(event.target.value)}
                  onBlur={() => {
                    if (scanFocusLock) setTimeout(() => inboundBinInputRef.current?.focus(), 0);
                  }}
                  placeholder="Bin-Code scannen (z.B. A-01)"
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#FF9900]"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-white/50">{bins.length} aktive Bins geladen</span>
                <button
                  type="submit"
                  disabled={scanBusy === 'INBOUND'}
                  className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[11px] font-semibold text-green-200 hover:bg-green-500/20 disabled:opacity-50"
                >
                  Auf STORED buchen
                </button>
              </div>
            </form>

            {duplicateInbound ? (
              <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-xs font-semibold text-blue-200">
                  Duplikat erkannt: {duplicateInbound.trackingNumber || duplicateInbound.id}
                </p>
                <p className="mt-1 text-[11px] text-blue-100/80">
                  Status: {duplicateInbound.status}. Optional direkt mit Order verknuepfen.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={duplicateLinkOrderId}
                    onChange={(event) => setDuplicateLinkOrderId(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white outline-none focus:border-[#FF9900]"
                  >
                    <option value="">Order waehlen</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber} ({order.status})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={resolveDuplicateInboundLink}
                    className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-200 hover:bg-green-500/20"
                  >
                    Mit Order verknuepfen
                  </button>
                  <button
                    onClick={() => setDuplicateInbound(null)}
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                  >
                    Ignorieren
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <form onSubmit={scanOutboundPackage}>
              <p className="mb-3 text-sm font-semibold text-white">Ausgehende Pakete (Outbound)</p>
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={scanOutboundOrderId}
                  onChange={(event) => setScanOutboundOrderId(event.target.value)}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#FF9900]"
                >
                  {shippableOrders.length === 0 ? (
                    <option value="">Keine versandbereiten Orders</option>
                  ) : null}
                  {shippableOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNumber} ({order.status})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <select
                    value={scanOutboundCarrier}
                    onChange={(event) =>
                      setScanOutboundCarrier(event.target.value as (typeof CARRIER_OPTIONS)[number])
                    }
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#FF9900]"
                  >
                    {CARRIER_OPTIONS.map((carrier) => (
                      <option key={carrier} value={carrier}>
                        {carrier}
                      </option>
                    ))}
                  </select>
                  <input
                    ref={outboundScanInputRef}
                    value={scanOutboundTracking}
                    onChange={(event) => setScanOutboundTracking(event.target.value)}
                    onBlur={() => {
                      if (scanFocusLock) setTimeout(() => outboundScanInputRef.current?.focus(), 0);
                    }}
                    placeholder="Tracking scannen"
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900] sm:col-span-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={scanBusy === 'OUTBOUND' || shippableOrders.length === 0}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#FF9900]/30 bg-[#FF9900]/10 px-3 py-2 text-xs font-bold text-[#FFB84D] hover:bg-[#FF9900]/20 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {scanBusy === 'OUTBOUND' ? 'Verbuche...' : 'Outbound verbuchen'}
              </button>
            </form>

            <form onSubmit={scanPickListSku} className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                Picklist Scan-Checklist
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={scanPickListId}
                  onChange={(event) => setScanPickListId(event.target.value)}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#FF9900]"
                >
                  {activePickLists.length === 0 ? (
                    <option value="">Keine aktive Pickliste</option>
                  ) : null}
                  {activePickLists.map((pick) => (
                    <option key={pick.id} value={pick.id}>
                      {pick.order?.orderNumber || pick.id} ({pick.status})
                    </option>
                  ))}
                </select>
                <input
                  value={scanPickSku}
                  onChange={(event) => setScanPickSku(event.target.value)}
                  placeholder="SKU scannen"
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#FF9900]"
                />
              </div>
              <button
                type="submit"
                disabled={!scanPickListId}
                className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
              >
                SKU als gepickt buchen
              </button>
            </form>
          </div>
        </div>

        {scanFeedback ? (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
              scanFeedback.level === 'success'
                ? 'border-green-500/40 bg-green-500/10 text-green-200'
                : scanFeedback.level === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-200'
            }`}
          >
            {scanFeedback.message}
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            Tracking Schnellsuche
          </p>
          <input
            value={trackingLookup}
            onChange={(event) => setTrackingLookup(event.target.value)}
            placeholder="Tracking scannen oder eingeben"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
          />
          {trackingLookup.trim() ? (
            <div className="mt-2 space-y-2">
              {trackingMatches.length === 0 ? (
                <p className="text-xs text-white/50">Kein Treffer.</p>
              ) : (
                trackingMatches.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-xs font-semibold text-white">
                      {entry.type} • {entry.tracking}
                    </p>
                    <p className="text-[11px] text-white/60">
                      {entry.label} • {entry.status}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          <RefreshCcw className="h-4 w-4" />
          Aktualisieren
        </button>
        <button
          onClick={importShopify}
          disabled={shopifyImportRunning}
          className="inline-flex items-center gap-2 rounded-lg border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-2 text-sm font-semibold text-[#FFB84D] hover:bg-[#FF9900]/20 disabled:opacity-50"
        >
          <Truck className="h-4 w-4" />
          {shopifyImportRunning ? 'Shopify Import laeuft...' : 'Shopify Orders importieren'}
        </button>
        <button
          onClick={importWooCommerce}
          disabled={wooImportRunning}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
        >
          <Truck className="h-4 w-4" />
          {wooImportRunning ? 'Woo Import laeuft...' : 'WooCommerce Orders importieren'}
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Auto-Bestellvorschlaege</h3>
            <p className="text-xs text-white/55">
              Beruecksichtigt Meldebestand, verfuegbaren Bestand und offene Fulfillment-Demand.
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
            {reorderSuggestions.length} Vorschlaege
          </span>
        </div>

        {reorderSuggestions.length === 0 ? (
          <p className="text-sm text-white/50">Keine aktiven Bestellvorschlaege.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {reorderSuggestions.slice(0, 8).map((entry) => (
              <div key={entry.itemId} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-mono text-xs text-white">{entry.sku}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${reorderUrgencyClass(
                      entry.urgency
                    )}`}
                  >
                    {entry.urgency}
                  </span>
                </div>
                <p className="text-sm text-white">{entry.name}</p>
                <p className="mt-1 text-[11px] text-white/60">
                  Bestand verfuegbar: {entry.availableQuantity} • Meldebestand: {entry.reorderLevel} •
                  Demand offen: {entry.pendingDemand}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#FFB84D]">
                  Vorschlag: {entry.suggestedOrderQty} {entry.unit}
                  {entry.defaultBinCode ? ` • Bin ${entry.defaultBinCode}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass-card rounded-2xl border border-white/10 p-5 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-[#FF9900]" />
            <h3 className="text-lg font-semibold text-white">Inventory</h3>
          </div>

          <form onSubmit={createItem} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              value={newItem.sku}
              onChange={(event) => setNewItem((prev) => ({ ...prev, sku: event.target.value }))}
              placeholder="SKU"
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
            <input
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Artikelname"
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
            <input
              value={newItem.quantityOnHand}
              onChange={(event) =>
                setNewItem((prev) => ({ ...prev, quantityOnHand: event.target.value }))
              }
              placeholder="Startbestand"
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
            <input
              value={newItem.reorderLevel}
              onChange={(event) =>
                setNewItem((prev) => ({ ...prev, reorderLevel: event.target.value }))
              }
              placeholder="Meldebestand"
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
            <button
              type="submit"
              disabled={itemSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF9900] px-3 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              {itemSaving ? 'Speichere...' : 'SKU anlegen'}
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-white/40">
                <tr>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">On Hand</th>
                  <th className="px-2 py-2">Reserviert</th>
                  <th className="px-2 py-2">Meldebestand</th>
                  <th className="px-2 py-2">Bin</th>
                  <th className="px-2 py-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 20).map((item) => {
                  const isLow = item.reorderLevel > 0 && item.quantityOnHand <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="border-t border-white/5 text-white/85">
                      <td className="px-2 py-3 font-mono text-xs">{item.sku}</td>
                      <td className="px-2 py-3">{item.name}</td>
                      <td className={`px-2 py-3 font-semibold ${isLow ? 'text-red-300' : 'text-white'}`}>
                        {item.quantityOnHand}
                      </td>
                      <td className="px-2 py-3">{item.reservedQuantity}</td>
                      <td className="px-2 py-3">{item.reorderLevel}</td>
                      <td className="px-2 py-3">{item.defaultBin?.code || '-'}</td>
                      <td className="px-2 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => adjustItem(item, 'in')}
                            className="rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-200 hover:bg-green-500/20"
                          >
                            + Zugang
                          </button>
                          <button
                            onClick={() => adjustItem(item, 'out')}
                            className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                          >
                            - Abgang
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-8 text-center text-white/50">
                      Noch keine Warehouse-Artikel vorhanden.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="mb-4 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-[#FF9900]" />
            <h3 className="text-lg font-semibold text-white">Inbound Intake</h3>
          </div>

          <form onSubmit={createInbound} className="space-y-3">
            <select
              value={newInbound.carrier}
              onChange={(event) =>
                setNewInbound((prev) => ({ ...prev, carrier: event.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            >
              {CARRIER_OPTIONS.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
            <input
              value={newInbound.trackingNumber}
              onChange={(event) =>
                setNewInbound((prev) => ({ ...prev, trackingNumber: event.target.value }))
              }
              placeholder="Trackingnummer"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
            <textarea
              value={newInbound.notes}
              onChange={(event) => setNewInbound((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notiz (optional)"
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
            <button
              type="submit"
              disabled={inboundSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF9900] px-4 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              {inboundSaving ? 'Speichere...' : 'Inbound speichern'}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {inboundPackages.slice(0, 6).map((pkg) => (
              <div key={pkg.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-white/70">{pkg.carrier}</span>
                  <select
                    value={pkg.status}
                    onChange={(event) => updateInboundStatus(pkg.id, event.target.value)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase outline-none ${statusChipClass(
                      pkg.status
                    )}`}
                  >
                    <option value="RECEIVED">RECEIVED</option>
                    <option value="STORED">STORED</option>
                    <option value="LINKED_TO_ORDER">LINKED_TO_ORDER</option>
                    <option value="PICKED_UP">PICKED_UP</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <p className="text-sm text-white">{pkg.trackingNumber || 'Ohne Trackingnummer'}</p>
                <p className="text-xs text-white/45">{formatDate(pkg.receivedAt)}</p>
                <p className="mt-1 text-[11px] text-white/55">Fotos: {pkg.photoUrls.length}</p>
                {pkg.photoUrls.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {pkg.photoUrls.slice(0, 2).map((photoUrl, index) => (
                      <a
                        key={`${pkg.id}-photo-${index}`}
                        href={photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-200 underline underline-offset-2 hover:text-blue-100"
                      >
                        Foto {index + 1}
                      </a>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/85 hover:bg-white/10">
                    {inboundPhotoBusyId === pkg.id ? 'Upload...' : 'Foto hochladen'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={inboundPhotoBusyId === pkg.id}
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        void uploadInboundPhoto(pkg.id, file);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <button
                    onClick={() => createPickupReceipt(pkg.id)}
                    disabled={pickupReceiptBusyId === pkg.id}
                    className="rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-200 hover:bg-green-500/20 disabled:opacity-50"
                  >
                    {pickupReceiptBusyId === pkg.id ? 'Erstelle Quittung...' : 'Pickup + Quittung'}
                  </button>
                </div>
              </div>
            ))}
            {inboundPackages.length === 0 ? (
              <p className="text-sm text-white/50">Noch keine Inbound-Pakete.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-5">
        <div className="mb-4 flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-[#FF9900]" />
          <h3 className="text-lg font-semibold text-white">Fulfillment Orders</h3>
        </div>
        <div className="space-y-3">
          {orders.slice(0, 12).map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 md:flex md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{order.orderNumber}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusChipClass(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {order.source}
                  </span>
                </div>
                <p className="text-sm text-white/60">
                  {order.customer?.name || order.customer?.email || 'Kein Kunde'} • {order.lines.length}{' '}
                  Positionen
                </p>
                <p className="text-xs text-white/45">
                  Importiert: {formatDate(order.importedAt)} • Wert:{' '}
                  {order.totalAmount !== null ? `${order.totalAmount} ${order.currency}` : '-'}
                </p>
              </div>
              <div className="mt-3 flex gap-2 md:mt-0">
                <button
                  onClick={() => generatePickList(order.id)}
                  disabled={busyOrderId === order.id}
                  className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  Pickliste
                </button>
                <button
                  onClick={() => createShipment(order.id)}
                  disabled={busyOrderId === order.id}
                  className="inline-flex items-center gap-1 rounded-md border border-[#FF9900]/30 bg-[#FF9900]/10 px-3 py-1.5 text-xs font-semibold text-[#FFB84D] hover:bg-[#FF9900]/20 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Versand
                </button>
              </div>
            </div>
          ))}
          {orders.length === 0 ? (
            <p className="py-4 text-sm text-white/50">Noch keine Fulfillment Orders vorhanden.</p>
          ) : null}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">Import Error Queue</h3>
        <div className="space-y-2">
          {importErrors.slice(0, 8).map((entry) => (
            <div key={entry.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-red-100">
                  {entry.provider} • {entry.sourceEntity}
                </p>
                <button
                  onClick={() => resolveImportError(entry.id)}
                  className="rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-200 hover:bg-green-500/20"
                >
                  Resolve
                </button>
              </div>
              <p className="text-xs text-red-100/80">{entry.errorMessage}</p>
              <p className="mt-1 text-[10px] text-red-100/60">
                {entry.sourceEntityId ? `Source: ${entry.sourceEntityId} • ` : ''}
                {formatDate(entry.createdAt)}
              </p>
            </div>
          ))}
          {importErrors.length === 0 ? (
            <p className="text-sm text-white/50">Keine offenen Import-Fehler.</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">Aktive Picklisten</h3>
          <div className="space-y-2">
            {pickLists.slice(0, 8).map((pick) => (
              <div key={pick.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {pick.order?.orderNumber || 'Ohne Order'}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusChipClass(
                      pick.status
                    )}`}
                  >
                    {pick.status}
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  {pick.items.length} Positionen • {pick.assignedTo?.name || 'Unassigned'}
                </p>
                <div className="mt-2 flex gap-2">
                  {pick.status === 'OPEN' ? (
                    <button
                      onClick={() => updatePickListStatus(pick.id, 'IN_PROGRESS')}
                      className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-200 hover:bg-blue-500/20"
                    >
                      Start
                    </button>
                  ) : null}
                  {pick.status !== 'COMPLETED' && pick.status !== 'CANCELLED' ? (
                    <button
                      onClick={() => updatePickListStatus(pick.id, 'COMPLETED')}
                      className="rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-200 hover:bg-green-500/20"
                    >
                      Complete
                    </button>
                  ) : null}
                  {pick.status !== 'COMPLETED' && pick.status !== 'CANCELLED' ? (
                    <button
                      onClick={() => updatePickListStatus(pick.id, 'CANCELLED')}
                      className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/20"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {pickLists.length === 0 ? (
              <p className="text-sm text-white/50">Noch keine Picklisten vorhanden.</p>
            ) : null}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">Letzte Shipments</h3>
          <div className="space-y-2">
            {shipments.slice(0, 8).map((shipment) => (
              <div key={shipment.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{shipment.order.orderNumber}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusChipClass(
                      shipment.status
                    )}`}
                  >
                    {shipment.status}
                  </span>
                </div>
                <p className="text-xs text-white/55">
                  {shipment.carrier} • {shipment.trackingNumber || 'ohne Tracking'}
                </p>
                <p className="text-xs text-white/45">{formatDate(shipment.createdAt)}</p>
              </div>
            ))}
            {shipments.length === 0 ? (
              <p className="text-sm text-white/50">Noch keine Sendungen vorhanden.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">Returns Scan</h3>
          <form onSubmit={scanReturnFromTracking} className="mb-4 flex gap-2">
            <input
              value={scanReturnTracking}
              onChange={(event) => setScanReturnTracking(event.target.value)}
              placeholder="Return-Tracking scannen"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
            <button
              type="submit"
              className="rounded-lg border border-[#FF9900]/30 bg-[#FF9900]/10 px-3 py-2 text-xs font-semibold text-[#FFB84D] hover:bg-[#FF9900]/20"
            >
              Return anlegen
            </button>
          </form>

          <div className="space-y-2">
            {returns.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {entry.order?.orderNumber || 'Ohne Order'}
                  </p>
                  <select
                    value={entry.status}
                    onChange={(event) => updateReturnStatus(entry.id, event.target.value)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase outline-none ${statusChipClass(
                      entry.status
                    )}`}
                  >
                    <option value="ANNOUNCED">ANNOUNCED</option>
                    <option value="RECEIVED">RECEIVED</option>
                    <option value="INSPECTED">INSPECTED</option>
                    <option value="RESTOCKED">RESTOCKED</option>
                    <option value="DISPOSED">DISPOSED</option>
                    <option value="RETURNED_TO_SENDER">RETURNED_TO_SENDER</option>
                  </select>
                </div>
                <p className="text-xs text-white/60">
                  {entry.orderLine?.sku || '-'} • Qty {entry.quantity} • {entry.reason || 'ohne Grund'}
                </p>
                <p className="text-[11px] text-white/40">{formatDate(entry.createdAt)}</p>
              </div>
            ))}
            {returns.length === 0 ? (
              <p className="text-sm text-white/50">Noch keine Retouren.</p>
            ) : null}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">Cutoff Batch + Handover Proof</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={cutoffCarrier}
              onChange={(event) =>
                setCutoffCarrier(event.target.value as (typeof CARRIER_OPTIONS)[number])
              }
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            >
              {CARRIER_OPTIONS.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={cutoffDate}
              onChange={(event) => setCutoffDate(event.target.value)}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9900]"
            />
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            <p>
              Batch: <span className="font-semibold text-white">{cutoffBatchShipments.length}</span> Sendungen
            </p>
            <p className="text-xs text-white/60">
              Missing Tracking:{' '}
              {cutoffBatchShipments.filter((entry) => !entry.trackingNumber).length}
            </p>
          </div>
          <button
            onClick={exportCutoffCsv}
            className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-200 hover:bg-green-500/20"
          >
            Handover CSV exportieren
          </button>

          <div className="mt-3 space-y-2">
            {cutoffBatchShipments.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-xs font-semibold text-white">
                  {entry.order.orderNumber} • {entry.trackingNumber || 'ohne Tracking'}
                </p>
                <p className="text-[11px] text-white/50">{formatDate(entry.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">Audit Ledger (letzte 50 Events)</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="uppercase tracking-widest text-white/40">
              <tr>
                <th className="px-2 py-2">Zeit</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Typ</th>
                <th className="px-2 py-2">Menge</th>
                <th className="px-2 py-2">Vorher</th>
                <th className="px-2 py-2">Neu</th>
                <th className="px-2 py-2">Ref</th>
                <th className="px-2 py-2">User</th>
              </tr>
            </thead>
            <tbody>
              {inventoryEvents.map((event) => (
                <tr key={event.id} className="border-t border-white/5 text-white/85">
                  <td className="px-2 py-2">{formatDate(event.createdAt)}</td>
                  <td className="px-2 py-2 font-mono">{event.item?.sku || '-'}</td>
                  <td className="px-2 py-2">{event.type}</td>
                  <td className="px-2 py-2 font-semibold">{event.quantity}</td>
                  <td className="px-2 py-2">{event.previousQty}</td>
                  <td className="px-2 py-2">{event.newQty}</td>
                  <td className="px-2 py-2">{event.referenceType || event.referenceId || '-'}</td>
                  <td className="px-2 py-2">
                    {event.createdBy?.name || event.createdBy?.email || 'System'}
                  </td>
                </tr>
              ))}
              {inventoryEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-white/50">
                    Noch keine Inventory-Events.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
