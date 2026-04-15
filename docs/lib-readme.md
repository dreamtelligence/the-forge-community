# lib/

`lib/` ist die Service- und Domain-Ebene des Projekts.

## Ab jetzt geltende Regel

- Neue fachliche Logik gehört in Unterordner.
- Root-Dateien in `lib/*.ts` gelten als Legacy-Bestand und werden nicht weiter ausgebaut.
- Die bestehende Root-Allowlist ist eingefroren. Neue Dateien in `lib/*.ts` sind Architekturverletzungen.

## Zielstruktur pro Kernmodul

- `lib/<domain>/domain`: Kernregeln, Value Objects, Policies, Invarianten
- `lib/<domain>/application`: Use-Cases, Orchestrierung, Transaktionsgrenzen
- `lib/<domain>/infrastructure`: Prisma-Repositories, Provider-Clients, Blob/HTTP/SDK-Zugriffe
- `lib/<domain>/contracts`: DTOs, Parser, Input-/Output-Grenzen, stabile Typen fuer andere Schichten

## Bevorzugte Ziele für neue Module

- `lib/integrations/*`
- `lib/warehouse/*`
- `lib/storage/*`
- `lib/ai/*`
- `lib/ventures/*`
- `lib/billing/*`
- weitere klar benannte Domain-Unterordner

## Warum

Die Root von `lib/` ist bereits historisch überladen. Ohne harte Grenze wächst daraus sonst weiter eine unstrukturierte Catch-all-Schicht.
