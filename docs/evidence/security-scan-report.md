# Security Scan Report

Stand: 2026-02-18  
Commit: `300efd0`  
Scope: Repository scan, secret hygiene, dependency check (best effort) + production hardening recheck

## Ziel
Nachweis eines reproduzierbaren Security-Baseline-Scans fuer die technische Anlage.

## Durchgefuehrte Pruefungen

1. Secret Pattern Scan (broad)
2. Literal Credential Scan (string literals)
3. Spotcheck auf hartkodierte Credentials in Scripts
4. Dependency Audit (`npm audit --omit=dev --json`)

## Ergebnisse (priorisiert)

| ID | Schwere | Befund | Status | Beleg |
|---|---|---|---|---|
| SEC-F-01 | Hoch | Hardcoded Resend API Key in `scripts/tests/test-email.js` | `FIXED (Code)` / `OPEN (Rotation)` | `scripts/tests/test-email.js`, `docs/evidence/03_security/2026-02-18_100549_literal-credential-scan.log` |
| SEC-F-02 | Mittel | Dependency-Audit nicht ausfuehrbar wegen DNS-Fehler (`registry.npmjs.org`) | `OPEN` | `docs/evidence/03_security/2026-02-18_100531_npm-audit-prod.json` |
| SEC-F-03 | Mittel | Lint-Gate war nicht gruen (17 Fehler) als Qualitaets-/Security-Risiko | `CLOSED (2026-02-18)` | `docs/evidence/02_release/2026-02-18_153510_lint.log` |
| SEC-F-04 | Hoch | Server-Action/Origin-Mismatch fuehrte zu 403 auf Kernflows (`/ventures`, `/ventures/new`) | `CLOSED (2026-02-18)` | `next.config.ts`, `proxy.ts`, Commits `aa3b21b`, `300efd0` |

## Durchgefuehrte Sofortmassnahmen

1. `scripts/tests/test-email.js` umgestellt auf ENV-only:
   - `RESEND_API_KEY` ist nun Pflicht.
   - Empfaenger/Absender ueber `TEST_EMAIL_TO` und `TEST_EMAIL_FROM` konfigurierbar.
2. Erneuter Literal-Credential-Scan nach Fix zeigte keine Treffer.

## Offene Massnahmen

1. Resend API Key rotieren und unnoetige alte Keys deaktivieren.
2. `npm audit` in Umgebung mit Registry-Zugriff wiederholen und Findings dokumentieren.
3. Security-Regressionen nach Hardening immer mit Produktions-Recheck bestaetigen (insb. Origin/CORS/Server Actions).

## Evidence-Dateien

- `docs/evidence/03_security/2026-02-18_100531_secret-scan.log`
- `docs/evidence/03_security/2026-02-18_100549_literal-credential-scan.log`
- `docs/evidence/03_security/2026-02-18_100531_npm-audit-prod.json`
- `docs/evidence/02_release/2026-02-18_153510_lint.log`
- `docs/evidence/02_release/2026-02-18_154027_build.log`
