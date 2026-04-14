# shared/

Hier liegen explizite Shared-Module für bereichsübergreifende UI- und Integrationsbausteine.

## Zweck

- stabile Importpfade für wiederverwendbare UI- und Integrationsbausteine
- klare Abgrenzung zwischen `app/**` und bereichsübergreifenden Bausteinen
- schrittweise Migration weg von direkten Root-Imports

## Regel

- `app/**` soll Shared-Imports bevorzugen, wenn ein Baustein mehrfach oder bereichsübergreifend genutzt wird.
- Neue app-spezifische Komponenten gehören weiterhin nach `components/**`.
