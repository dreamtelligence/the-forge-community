# LagerHub in Forge: Technischer Nachweis (MVP)

Hinweis fuer Antrag/Businessplan:
- Dieses Dokument ist der primaere Nachweis-Anhang fuer "IT-Umsetzung / IT-Struktur / Betriebsfaehigkeit".

## Ziel
Integration eines operativ nutzbaren WMS-MVP (Warehouse Management System) in die bestehende Forge-Plattform, um Lagerprozesse digital abzubilden und Personalaufwand zu reduzieren.

## Bereits umgesetzt
- Datenmodell fuer Lager, Fulfillment und Retouren in Prisma inkl. Audit-Trails.
- SQL-Migrations fuer Neon/Postgres:
  - `migrations/016_add_lagerhub_wms.sql`
  - `migrations/017_add_lagerhub_wms_rls.sql`
- Warehouse-APIs fuer Kernprozesse:
  - Inventory: Artikel, Bestandsanpassung, Buchungslog
  - Inbound: Paketannahme, Status, Verknuepfung
  - Orders: manuell + Shopify Import (idempotent)
  - Picklists: Generierung + operatives Update
  - Shipments: Versandanlage + Bestand OUT + Tracking
  - Import Error Queue: Fehlerliste + Resolve
- UI-Integration in Forge/Sourcing mit eigenem `Warehouse`-Tab.

### Update 2026-02-15 (Scan-First Ops)
- Scan-Mode fuer Lagerstation (Scanner als Keyboard-HID) in `WarehousePanel`.
- Auto-Store erweitert:
  - Tracking-Scan + Bin-Scan -> `STORED` (ohne Klickpfad).
- Dedupe + Resolve:
  - Duplikate können direkt mit Order verknuepft oder ignoriert werden.
- Pick-Scan:
  - SKU-Scan bucht Picklist-Positionen auf `PICKED`.
- Outbound-Schutz:
  - Shipment-API blockt Versand, solange Positionen nicht vollstaendig gepickt sind.
- Exception Queue write-path:
  - `POST /api/ventures/[id]/warehouse/import-errors` fuer Klaerfaelle.
- Returns:
  - `GET/POST /api/ventures/[id]/warehouse/returns`
  - `PATCH /api/ventures/[id]/warehouse/returns/[returnId]`
- Ops-/Audit-Ergaenzungen:
  - `GET /api/ventures/[id]/warehouse/bins`
  - `GET /api/ventures/[id]/warehouse/inventory-transactions`
  - Cutoff-Batch + Handover CSV Export im UI.

### Update 2026-02-16 (Professional Hardening + Customer Flow)
- Venture-scope Validierung gehaertet (FK-Referenzen gegen Cross-Venture Mismatch abgesichert):
  - `defaultBinId` bei Item-Create
  - `binId` bei Stock-Adjust
  - `customerId` bei Order-/Inbound-Write
  - `linkedOrderId` bei Inbound-Write
- Kundenbenachrichtigungen (Resend) fuer Lagerereignisse:
  - Paketannahme bestaetigt
  - Statusaenderung von Inbound-Paketen
  - Digitale Abholquittung erstellt
- Foto-Dokumentations-API:
  - `POST /api/ventures/[id]/warehouse/inbound-packages/[packageId]/photos`
  - `DELETE /api/ventures/[id]/warehouse/inbound-packages/[packageId]/photos`
  - Validierung: mime/type, Dateigroesse, Max-Fotoanzahl, Retention-Feld
- Digitale Pickup-Quittung:
  - `POST /api/ventures/[id]/warehouse/inbound-packages/[packageId]/pickup-receipt`
  - Quittungsnummer `PU-YYYYMMDD-XXXXXX`, Notizmarker, Rueckgabe als strukturierte Receipt-Daten
- WooCommerce-Import:
  - `POST /api/ventures/[id]/warehouse/orders/import/woocommerce`
  - Direktimport via `orders[]` oder API-Fetch via Store-Keys
  - Fehlerpfad mit persistenter `WarehouseImportError`-Queue
- Kleiner API-Smoke-Test fuer Kernflow hinzugefuegt:
  - `npm run test:smoke:warehouse`
  - Script: `scripts/smoke-tests/test-warehouse-wms.ts`

## Architektur-Qualitaet
- Klare Trennung zwischen Sourcing und Warehouse/Fulfillment.
- Domain-Statusmaschinen mit gueltigen Uebergaengen:
  - Order, Inbound, Picklist, Return
- Zugriffsschutz ueber Venture/Squad-Berechtigungen.
- Import-Fehler werden nicht verschluckt, sondern persistent gespeichert.
- Build, Lint und Typecheck sind erfolgreich.

## Datenschutz und Compliance (MVP-geeignet)
- Paketfotos als eigene Datenklasse vorgesehen, mit Retention-Feld (`photoRetentionUntil`).
- Datenminimierung im Prozessdesign (nur notwendige Felder).
- Nachvollziehbarkeit durch Inventory Transactions und Zeitstempel.

## Betriebsnutzen und Personalkostenhebel
- Manuelle Listenarbeit wird durch strukturierte Flows ersetzt:
  - Wareneingang erfassen
  - Bestand live buchen
  - Picklisten erzeugen und ausfuehren
  - Versand inkl. Tracking dokumentieren
- Weniger Rueckfragen/Fehler durch einheitliche Status und API-gestuetzte Konsistenz.
- Import-Queue reduziert Debug-Zeit bei Marktplatz-Integrationen erheblich.

## Technischer Nachweis im Code
- UI:
  - `app/forge/[ventureId]/sourcing/page.tsx`
  - `components/sourcing/WarehousePanel.tsx`
- API:
  - `app/api/ventures/[id]/warehouse/*`
  - `app/api/ventures/[id]/warehouse/bins/route.ts`
  - `app/api/ventures/[id]/warehouse/inventory-transactions/route.ts`
  - `app/api/ventures/[id]/warehouse/returns/route.ts`
  - `app/api/ventures/[id]/warehouse/returns/[returnId]/route.ts`
- Domain-Logik:
  - `lib/warehouse/transitions.ts`
  - `lib/warehouse/import.ts`
  - `lib/warehouse/access.ts`
  - `lib/warehouse/customer-notifications.ts`

## Empfehlung fuer den Antrag
- Dieses Dokument als "IT-Umsetzung und Betriebsfaehigkeit" Anhang nutzen.
- Dazu 3 Screenshots beilegen:
  - Scan-Mode (Inbound + Outbound + Pick-Scan)
  - Picklist/Paketstatus + SLA/Aging
  - Shipment/Tracking + Error Queue + Handover CSV
- Zusaetzlich kurz benennen:
  - "MVP livefaehig"
  - "Skalierbar um Carrier-Label-API und Webhooks"
  - "Personalkostenreduktion durch Prozessautomatisierung"
