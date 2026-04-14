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
- Die Anzahl der Top-Level-Dateien in `lib/` wird per Repo-Check eingefroren.

### `shared/`

- Explizite Shared-Module für UI-Primitives, Integrationswidgets und andere bereichsübergreifende Bausteine.
- `app/**` soll Shared-Imports für Cross-Cutting-Module nutzen.
- Keine Fachlogik; nur stabile Brücken für wiederverwendbare Bausteine.

### `public/`

- Top-Level-Ordner müssen lowercase-kebab-case sein.
- Demo-Assets liegen unter `public/media-demos/**`.
- Dokumentationsscreenshots liegen unter `public/docs/screenshots/**`.
- Vendor-Assets werden explizit unter `public/vendor/**` abgelegt statt als ungepflegte Paket-Dumps im Root.

### `scripts/`

- Skripte sind Betriebswerkzeuge, keine versteckte Produktlogik.
- Python gehört unter `scripts/python/**`.
- Neue Einmal-Migrations- oder Refactor-Helfer bleiben nicht dauerhaft als ungepflegte Root-Skripte liegen.
- Öffentliche Build-/Check-Pfade werden über `package.json` und die Architektur-Checks dokumentiert.

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

## Hygiene-Regeln

- Keine Legacy-Dateien wie `page_old.tsx`, `*_old.ts`, `*.bak`, `*.backup`.
- Keine Finder-Artefakte wie `.DS_Store` im Repo.
- Python-Skripte gehören unter `scripts/python/**`, nicht in den Repo-Root oder beliebige Fachordner.
- Das Repo braucht eine gepflegte `README.md` im Root mit Pitch und Betriebsgrenzen.

## Repo-Checks

- `npm run check:architecture` validiert die Guardrails.
- `npm run check:migrations` validiert nur die manuelle SQL-Supplement-Kette.
- `build`, `lint` und `migrate:deploy` laufen nur noch durch, wenn diese Checks grün sind.
