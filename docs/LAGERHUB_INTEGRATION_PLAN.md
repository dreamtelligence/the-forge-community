# LagerHub IT Integration Plan (The Forge)

## 1) Kurzfazit

Die Integration ist **umsetzbar** und passt gut in die bestehende Architektur von The Forge:
- Next.js App Router + Prisma + Postgres sind fuer ein WMS-MVP geeignet.
- Es gibt bereits passende Grundlagen in `Sourcing Studio` (Lieferanten, Samples, Orders).
- Die Integrations-Infrastruktur ist vorhanden (`IntegrationConnection`, inkl. `SHOPIFY` Enum).

## 2) Anforderungen aus dem Businessplan (relevant fuer MVP)

Aus dem LagerHub-Plan ergeben sich fuer die IT-Integration diese Kernfaehigkeiten:
- Bestandsverwaltung mit Lagerplatz + Menge
- Pakettracking mit Zeitstempel/Foto
- Bestellimport (Shopify, WooCommerce, manuell)
- Picklisten-Generierung
- Versandabwicklung (Label + Tracking-ID)
- Kundenverwaltung + einfache Abrechnung

## 3) Soll-Architektur im bestehenden Projekt

### 3.1 Datenmodell (neu, venture-gebunden)

Empfohlene neue Prisma-Modelle:
- `WarehouseLocation` (Standort, Oeffnungszeiten, aktiv)
- `StorageBin` (Regal/Box/Fach, Kapazitaet, Status)
- `WarehouseItem` (SKU, Name, Bestand, Mindestbestand, Venture)
- `InventoryTransaction` (IN/OUT/ADJUST, Menge, Referenz, User)
- `InboundPackage` (Paketannahme, Foto-URLs, Carrier, Status)
- `CustomerAccount` (B2B/B2C Kunde, Kontakt, Vertragsdaten)
- `FulfillmentOrder` (importierte Bestellung, Status)
- `FulfillmentOrderLine` (SKU, Menge, Pick-Status)
- `PickList` (Kommissionierlauf, Positionen, Bearbeiter)
- `Shipment` (Label-URL, Tracking-Nummer, Carrier, Versandstatus)
- `ReturnItem` (Retoure, Pruefung, Wiedereinlagerung)

Hinweis:
- Bestehende `Supplier`, `Sample`, `ProductionOrder` bleiben fuer Beschaffung bestehen.
- Neue WMS-Modelle decken Operative Lagerprozesse ab (Wareneingang bis Versand/Retoure).

### 3.2 API-Design (parallel zum bestehenden Pattern)

Neue Route-Gruppe:
- `app/api/ventures/[id]/warehouse/*`

MVP-Endpunkte:
- `GET/POST /warehouse/items`
- `POST /warehouse/items/[itemId]/adjust`
- `GET/POST /warehouse/inbound-packages`
- `GET/POST /warehouse/orders`
- `POST /warehouse/orders/import/shopify`
- `POST /warehouse/orders/import/manual`
- `POST /warehouse/picklists/generate`
- `POST /warehouse/shipments/create`
- `POST /warehouse/returns`

Auth/Access analog zu bestehenden Sourcing-Routen (Owner + Squad-Mitglieder).

### 3.3 UI-Integration

Bestehende Seite erweitern:
- `app/forge/[ventureId]/sourcing/page.tsx`

Neue Tabs:
- `Inventory`
- `Inbound`
- `Fulfillment`
- `Returns`
- `Customers`

Wichtige Masken:
- Bestand + Lagerplaetze
- Paketannahme (Foto-Upload + Zeitstempel)
- Order Queue + Pickliste
- Versandabschluss (Tracking speichern)
- Retourenpruefung + Restock

## 4) Integrationen

### 4.1 Shopify (MVP zuerst)

Reuse von vorhandener Integrationsbasis:
- `IntegrationProvider.SHOPIFY` ist schon im Schema vorhanden.
- In `lib/integrations/types.ts` ist `SHOPIFY` bisher Placeholder -> konkret ausbauen.

MVP-Flows:
- OAuth-Connect
- Initialer Pull von offenen Bestellungen
- Optional: Webhook fuer neue Bestellungen

### 4.2 WooCommerce

Phase 2:
- API-Key-basierte Verbindung (kein OAuth-Zwang)
- Polling oder Webhooks fuer neue Bestellungen

## 5) Sicherheit / Compliance

Pflichtpunkte fuer die Umsetzung:
- RLS-Policies fuer alle neuen WMS-Tabellen (wie bestehende Venture-Tabellen)
- Datenminimierung bei Kunden/Paketdaten
- Rollenrechte (lesen vs schreiben) innerhalb Squad
- Audit-Trail ueber `InventoryTransaction` + Statushistorien

## 6) Umsetzungsplan (realistisch)

### Phase A - Foundation (3-4 Tage)
- DB-Schema (Prisma + SQL Migration + RLS)
- Basis-Types + Repository/Service Layer
- Grundendpunkte Inventory + Inbound

### Phase B - Fulfillment Core (4-6 Tage)
- Ordermodell + Import-Endpoints (manuell + Shopify Pull)
- Picklisten-Generierung
- Shipment + Tracking Speicherung

### Phase C - UI MVP (4-6 Tage)
- Neue Sourcing-Tabs + Listen/Detailansichten
- Operator-Flow: Eingang -> Pick -> Versand
- Quick actions fuer Bestand/Status

### Phase D - Hardening (2-3 Tage)
- Validierung, Error Handling, Rate Limits
- Smoke Tests fuer Kernprozesse
- Baseline Monitoring + Logs

Gesamt fuer ein belastbares MVP: **ca. 3 Wochen**.

## 7) Risiken und Gegenmassnahmen

- Risiko: Scope wird zu gross (WMS + Billing + Carrier APIs gleichzeitig)
  - Massnahme: Billing/Carrier nur als Stub im MVP, Fokus auf Prozesskern.
- Risiko: Datenqualitaet beim Bestellimport
  - Massnahme: Mapping-Layer + Import-Fehlerqueue.
- Risiko: Rollenmodell in Squads unscharf
  - Massnahme: zuerst owner/admin write, member read.

## 8) Betriebskritische Nachschaerfungen (eingearbeitet)

- Paketfotos/PII:
  - `InboundPackage.photoRetentionUntil` ist Pflichtfeld im Prozess.
  - Standard-Retention: 30 Tage (konfigurierbar), danach Loeschjob.
  - Keine oeffentliche Auslieferung von Foto-URLs.
- Statusmaschinen:
  - Inbound: `RECEIVED -> STORED -> LINKED_TO_ORDER -> PICKED_UP/CLOSED`
  - Fulfillment: `IMPORTED -> READY_TO_PICK -> PICKING -> PACKED -> SHIPPED -> COMPLETED/CANCELLED`
  - Returns: `ANNOUNCED -> RECEIVED -> INSPECTED -> RESTOCKED/DISPOSED/RETURNED_TO_SENDER`
- Identifikation:
  - SKU eindeutig pro Venture (`@@unique([ventureId, sku])`)
  - Bin-Code eindeutig pro Venture (`@@unique([ventureId, code])`)
- Import-Idempotency:
  - `@@unique([ventureId, source, sourceOrderId])` bei Fulfillment Orders.
  - Verhindert Dubletten bei Shopify/WooCommerce Re-Syncs.

## 9) Empfehlung fuer Start

Start mit einem klaren MVP-Schnitt:
1. Inventory + Inbound + Fulfillment (ohne automatische Carrier-Buchung)
2. Shopify-Import + manuelle Orders
3. Tracking speichern und an Haendler rueckgeben

Danach Phase 2:
- WooCommerce
- echte Label-APIs (DHL/DPD/GLS)
- erweiterte Abrechnung/Invoice-Automation

## 10) Umsetzungsstand Update (2026-02-15)

Seit dem initialen Plan wurde der operative Lagerflow scan-orientiert erweitert.

Neu umgesetzt:
- Scan-First Warehouse UI in `components/sourcing/WarehousePanel.tsx`
  - Inbound Scan: Tracking -> `RECEIVED`
  - Auto-Store Flow: zweiter Scan / Bin-Scan -> `STORED`
  - Dedupe-Handling mit direkter Option fuer "verknuepfen" oder "ignorieren"
  - Outbound Scan mit Shipment-Erstellung
  - Picklist Scan-Checklist (SKU-Scan auf offene Pick-Position)
  - Tracking-Schnellsuche
  - SLA/Aging Kennzahlen
  - Audit Ledger (letzte Inventory-Events)
- Returns Scan + Return Lifecycle
  - API: `GET/POST /warehouse/returns`
  - API: `PATCH /warehouse/returns/[returnId]`
- Neue Hilfs-APIs fuer Betrieb:
  - `GET/POST /warehouse/bins`
  - `GET /warehouse/inventory-transactions`
  - `POST /warehouse/import-errors` (Exception Queue write)
- Versand-Schutz:
  - `POST /warehouse/shipments/create` blockt Standard-Shipping, wenn Positionen nicht voll gepickt sind.

Zusatz fuer Betrieb:
- Cutoff-Batching im UI (Carrier + Datum)
- Proof of Handover als CSV-Export

Stabilitaet:
- `migrations/016_add_lagerhub_wms.sql` und `migrations/017_add_lagerhub_wms_rls.sql` sind idempotent gemacht (re-run sicher).
