# Manual SQL Supplements

Dieser Ordner enthält manuelle SQL-Supplements, nicht die kanonische Prisma-Migrationshistorie.

## Wofür dieser Ordner da ist

- RLS-Policies
- Post-Deploy-SQL
- DBA-nahe Hotfixes
- SQL, das bewusst außerhalb der Prisma-Migrationskette gefahren wird

## Wofür dieser Ordner nicht da ist

- Normale Schema-Entwicklung, die sauber über `prisma/migrations/` versioniert werden kann
- Eine zweite, konkurrierende Primär-Migrationshistorie

## Regeln

- Verwende eindeutige, sortierbare Prefixe im Dateinamen.
- Keine doppelten Sequenzen.
- Dokumentiere bei Bedarf den Ausführungsweg im jeweiligen Change oder Runbook.
- Prüfe Änderungen mit `npm run check:migrations`.

## Kanonischer Deploy-Pfad

1. Prisma-Schemaänderungen über `prisma/migrations/`
2. Deploy mit `npm run migrate:deploy`
3. Manuelle SQL-Supplements aus diesem Ordner nur dann separat anwenden, wenn der Change das ausdrücklich verlangt
