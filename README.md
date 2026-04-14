# The Forge

The Forge ist ein modularer Monolith für Solo-Founder und kleine Teams, die ein Venture operativ von Idee bis Launch führen wollen.
Der Produktscope ist bewusst breit, aber im Code in vier Hauptdomänen getrennt:

- Founder OS: Ventures, Forum, Squads, Messaging, Profile
- Forge Workspace: Brand, Legal, Marketing, Media, Music
- Commerce Ops: Sourcing, Warehouse, Finance, Billing
- Platform Layer: Auth, Admin, Integrations, Cron, Security

## Architektur in einem Satz

Ein Deployable, aber keine beliebige Suppe:
`app/` für Oberfläche und Routen, `components/` für produktnahe UI, `shared/` für bereichsübergreifende Bausteine, `lib/` für Domain- und Service-Logik, `prisma/` für die kanonische Datenbankhistorie.

## Repo-Guardrails

- `npm run check:architecture` erzwingt Architekturregeln vor `lint` und `build`
- Langlaufende Media-/Provider-Routen brauchen explizit `runtime = 'nodejs'` und `maxDuration`
- `prisma/migrations/` ist die deploybare Prisma-Historie
- `prisma/manual_sql/` enthält nur manuelle SQL-Supplements mit eindeutigen Prefixen
- `scripts/` ist nach Zweck in Unterordner wie `architecture`, `db`, `seed`, `tests` und `ops` gegliedert
- Legacy-Dateien wie `page_old.tsx`, versteckte Finder-Artefakte und chaotische Public-Pfade werden geblockt

## Wichtige Kommandos

```bash
npm run dev
npm run check:architecture
npm run lint
npm run build
npm run test:smoke
```

## Mehr Kontext

- Architekturgrenzen: [docs/architecture/repo-boundaries.md](docs/architecture/repo-boundaries.md)
- Architekturentscheidung: [docs/architecture/modular-monolith.md](docs/architecture/modular-monolith.md)
- Vollere Produktdoku: [docs/README.md](docs/README.md)
