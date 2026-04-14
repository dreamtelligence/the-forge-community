# lib/

`lib/` ist die Service- und Domain-Ebene des Projekts.

## Ab jetzt geltende Regel

- Neue fachliche Logik gehört in Unterordner.
- Root-Dateien in `lib/*.ts` gelten als Legacy-Bestand und werden nicht weiter ausgebaut.

## Bevorzugte Ziele für neue Module

- `lib/integrations/*`
- `lib/warehouse/*`
- `lib/storage/*`
- `lib/ai/*`
- weitere klar benannte Domain-Unterordner

## Warum

Die Root von `lib/` ist bereits historisch überladen. Ohne harte Grenze wächst daraus sonst weiter eine unstrukturierte Catch-all-Schicht.
