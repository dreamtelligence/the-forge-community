# Repo Boundaries

Stand: 14.04.2026

Dieses Repo bleibt ein modularer Monolith. Die Grenze liegt deshalb im Repository selbst und wird technisch erzwungen.

## Ziele

- Ein Produkt, ein Deployable, aber klare Modulgrenzen.
- Langlaufende AI-/Media-Routen explizit als Node-Runtime markieren.
- Prisma-Migrationen und manuelle SQL-Supplements sauber trennen.
- Verhindern, dass `lib/` weiter als unsortierte Root-Ablage wächst.

## Verzeichnisregeln

### `components/`

- Nur für wiederverwendbare UI-Primitives und integrationsnahe Widgets.
- Keine Venture-/Forum-/Warehouse-/Legal-spezifische Business-Logik.
- Beispiele: `components/ui/*`, `components/notion/*`, `components/slack/*`.

### `app/components/`

- Standard-Ort für app-spezifische zusammengesetzte Komponenten.
- Alles, was an Seiten, Studios, Flows oder konkrete Produktmodule gebunden ist, gehört hierhin.

### `lib/`

- Root `lib/*.ts` ist Legacy-Bestand.
- Neue Domain-Logik gehört in Unterordner wie `lib/warehouse/*`, `lib/integrations/*`, `lib/storage/*`.
- Die Anzahl der Top-Level-Dateien in `lib/` wird per Repo-Check eingefroren.

## API-Regeln

- Langlaufende oder providergebundene Media-Routen müssen explizit `runtime = 'nodejs'` setzen.
- Solche Routen müssen auch `maxDuration` explizit definieren.
- Webhooks mit Blob-/Crypto-/Provider-Verarbeitung werden ebenfalls als Node-Runtime behandelt.

## Migrationsstrategie

### `prisma/migrations/`

- Kanonische, deploybare Schema-Historie.
- `npm run migrate:deploy` läuft über `prisma migrate deploy`.

### `migrations/`

- Manuelle SQL-Supplements für RLS, Policies, Hotfixes oder DBA-nahe Post-Deploy-Schritte.
- Diese Dateien sind nicht die kanonische Prisma-Migrationskette.
- Dateinamen brauchen eindeutige, sortierbare Prefixe. Doppelte Nummern sind verboten.

## Repo-Checks

- `npm run check:architecture` validiert die Guardrails.
- `npm run check:migrations` validiert nur die manuelle SQL-Supplement-Kette.
- `build`, `lint` und `migrate:deploy` laufen nur noch durch, wenn diese Checks grün sind.
