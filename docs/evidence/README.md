# Evidence Hub (IHK/Prüfstelle)

Stand: 18.02.2026  
Projekt: THE FORGE / Stake & Scale

## Zweck
Diese Struktur sammelt technische Nachweise in einer Form, die auch fuer Nicht-Entwickler pruefbar ist.
Jeder Nachweis soll 3 Dinge enthalten:

1. `Was wurde geprueft?`
2. `Wie wurde geprueft?`
3. `Was ist das Ergebnis mit Beleg?`

## Struktur

- `docs/evidence/01_smoke/`
  - Rohbelege (Screenshots, Konsolenlogs, Exporte) fuer Smoke-Tests
- `docs/evidence/02_release/`
  - Build/Lint/Test-Logs pro Release, Rollback-Hinweise
- `docs/evidence/03_security/`
  - Security-Scans, Findings, Nachverfolgung
- `docs/evidence/04_dsgvo/`
  - DSGVO-Nachweise, DPA/AVV-Status, Retention
- `docs/evidence/05_operations/`
  - Notfallplan, Betriebsrunbooks, Backup/Restore-Belege

## Kernvorlagen

- `docs/evidence/smoke-test-protokoll.md`
- `docs/evidence/release-change-log.md`
- `docs/evidence/security-baseline-checklist.md`
- `docs/evidence/dsgvo-nachweise.md`

## Benennungskonvention fuer Belege

Format:

`YYYY-MM-DD_<bereich>_<kurzname>_<env>.<ext>`

Beispiele:

- `2026-02-18_smoke_st01-login-block_prod.png`
- `2026-02-18_release_build-log_staging.txt`
- `2026-02-18_security_dependency-audit_prod.txt`

## Statusmodell

- `PASS`: Anforderung vollstaendig erfuellt, Beleg vorhanden
- `PARTIAL`: Teilweise erfuellt, Restmassnahme dokumentiert
- `OPEN`: Noch nicht erfuellt
- `N/A`: Nicht anwendbar (mit Begruendung)

## Mindestpaket fuer Einreichung

1. Vollstaendiges Smoke-Test-Protokoll (mind. ST-01 bis ST-05)
2. Release-/Change-Log mit mindestens einem aktuellen Lauf
3. Security-Baseline-Checkliste mit offenem Risikoteil
4. DSGVO-Nachweisliste inkl. Anbieterstatus (DPA/AVV)
5. Einseitiger Notfallplan mit Kontaktkette
