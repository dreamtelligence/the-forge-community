# Repo Boundaries

Stand: 14.04.2026

Dieses Repo bleibt ein modularer Monolith. Die Grenze liegt deshalb im Repository selbst und wird technisch erzwungen.

## Ziele

- Ein Produkt, ein Deployable, aber klare Modulgrenzen.
- Langlaufende AI-/Media-Routen explizit als Node-Runtime markieren.
- Prisma-Migrationen und manuelle SQL-Supplements sauber trennen.
- Verhindern, dass `lib/` weiter als unsortierte Root-Ablage wächst.
- Legacy-Artefakte, Backup-Dateien und chaotische Asset-Namen aktiv unterbinden.

## Verzeichnisregeln

### `components/`

- Standard-Ort für app-spezifische zusammengesetzte Komponenten.
- Alles, was an Seiten, Studios, Flows oder konkrete Produktmodule gebunden ist, gehört hierhin.
- `app/components/` ist verboten. Es gibt genau eine produktnahe Komponenten-Quelle.

### `lib/`

- Root `lib/*.ts` ist Legacy-Bestand.
- Neue Domain-Logik gehört in Unterordner wie `lib/warehouse/*`, `lib/integrations/*`, `lib/storage/*`.
- Root `lib/*.ts` ist auf die aktuelle Allowlist eingefroren und darf nicht durch neue Dateien wachsen.
- Kernmodule arbeiten auf die Struktur `lib/<domain>/{domain,application,infrastructure,contracts}` hin.
- `domain/` enthaelt Regeln und Modelle, `application/` Use-Cases und Orchestrierung, `infrastructure/` Provider/Prisma/IO, `contracts/` stabile DTOs, Parser und Modulgrenzen.

### `shared/`

- Explizite Shared-Module für UI-Primitives, Integrationswidgets und andere bereichsübergreifende Bausteine.
- `app/**` soll Shared-Imports für Cross-Cutting-Module nutzen.
- Keine Fachlogik; nur stabile Brücken für wiederverwendbare Bausteine.
- `shared/**` importiert weder Prisma noch Domain-Module wie `lib/warehouse`, `lib/finance`, `lib/ai`, `lib/ventures` oder ähnliche Fachschichten.

### `public/`

- Top-Level-Ordner müssen lowercase-kebab-case sein.
- Demo-Assets liegen unter `public/media-demos/**`.
- Dokumentationsscreenshots liegen unter `public/docs/screenshots/**`.
- Vendor-Assets werden explizit unter `public/vendor/**` abgelegt statt als ungepflegte Paket-Dumps im Root.

### `scripts/`

- Skripte sind Betriebswerkzeuge, keine versteckte Produktlogik.
- Root `scripts/` enthält nur klar benannte Unterordner wie `architecture/`, `db/`, `seed/`, `tests/`, `ops/`.
- Python gehört unter `scripts/python/**`.
- Neue Einmal-Migrations- oder Refactor-Helfer bleiben nicht dauerhaft als ungepflegte Root-Skripte liegen.
- Öffentliche Build-/Check-Pfade werden über `package.json` und die Architektur-Checks dokumentiert.

### `lib/warehouse/`

- Warehouse-Kernlogik lebt im eigenen Modul unter `lib/warehouse/**`.
- Kernrouten wie `bins`, `items`, `inventory-transactions`, `orders`, `orders/import/*`, `picklists`, `inbound-packages`, `import-errors`, `shipments`, `shipments/create`, `returns`, `returns/[returnId]` und `reorder-suggestions` dürfen Prisma nicht direkt importieren.
- Diese Routen sprechen HTTP; die Fachlogik und Persistenz leben in der Warehouse-Boundary.
- Das gilt auch für untergeordnete Warehouse-Endpunkte wie `picklists/generate`, `inbound-packages/[packageId]/photos` und `inbound-packages/[packageId]/pickup-receipt`.
- Boundary-Code wird separat über `npm run test:warehouse:boundary` auf Contract-/Parsing-Ebene getestet.

### `lib/ai/`

- Providergebundene Media-Flows werden in `contracts`, `domain`, `application` und `infrastructure` geschnitten.
- `app/api/ventures/[id]/marketing/media/route.ts` bleibt dünn und delegiert an benannte Use Cases wie `startMarketingMediaGeneration` und `getMarketingMediaGenerationStatus`.
- Prisma, Blob-Upload, Replicate-Orchestrierung sowie Credit-Settlement gehören nicht direkt in diesen Handler.
- `app/api/webhooks/replicate/route.ts` bleibt ebenfalls dünn und delegiert an Verifikation plus `handleReplicateWebhookReceipt`.
- Delivery-Idempotenz für Webhooks läuft über ein separates Receipt-Modell auf `WebhookEvent`; Job-Zustand bleibt im Job-Receipt (`SystemCache`).
- Legacy-Replicate-Familien wie `faceswap` und `motion-transfer` teilen ihre Completion-/Fail-Logik zwischen Webhook und Polling über gemeinsame Application-Use-Cases statt über doppelte Route-spezifische Implementierungen.
- Status-Polling für diese Legacy-Familien läuft ebenfalls über einen eigenen Application-Schnitt; die Route mappt nur Auth, Query-Parsing und HTTP-Response.

## API-Regeln

- Langlaufende oder providergebundene Media-Routen müssen explizit `runtime = 'nodejs'` setzen.
- Solche Routen müssen auch `maxDuration` explizit definieren.
- Webhooks mit Blob-/Crypto-/Provider-Verarbeitung werden ebenfalls als Node-Runtime behandelt.

## Migrationsstrategie

### `prisma/migrations/`

- Kanonische, deploybare Schema-Historie.
- `npm run migrate:deploy` läuft über `prisma migrate deploy`.

### `prisma/manual_sql/`

- Manuelle SQL-Supplements für RLS, Policies, Hotfixes oder DBA-nahe Post-Deploy-Schritte.
- Diese Dateien sind nicht die kanonische Prisma-Migrationskette.
- Dateinamen brauchen eindeutige, sortierbare Prefixe. Doppelte Nummern sind verboten.
- Historische SQL-Snapshots oder Altdateien gehören nicht unter `prisma/manual_sql/manual`, sondern höchstens ins Archiv unter `docs/archive/db/`.

## Hygiene-Regeln

- Keine Legacy-Dateien wie `page_old.tsx`, `*_old.ts`, `*.bak`, `*.backup`.
- Keine Finder-Artefakte wie `.DS_Store` im Repo.
- Python-Skripte gehören unter `scripts/python/**`, nicht in den Repo-Root oder beliebige Fachordner.
- Das Repo braucht eine gepflegte `README.md` im Root mit Pitch und Betriebsgrenzen.

## Repo-Checks

- `npm run check:architecture` validiert die Guardrails.
- `npm run check:migrations` validiert nur die manuelle SQL-Supplement-Kette.
- Die Architektur-Checks pruefen explizit Root-`lib`-Freeze, Zielstruktur in Kernmodulen, `shared/` ohne Prisma/Fachlogik und Warehouse-Boundaries fuer API-Routen.
- `build`, `lint` und `migrate:deploy` laufen nur noch durch, wenn diese Checks grün sind.
