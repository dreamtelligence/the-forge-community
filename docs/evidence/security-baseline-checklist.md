# Security-Baseline-Checkliste

Zweck: Nachweis einer praxistauglichen Sicherheits-Baseline fuer ein fruehes SaaS-Produkt.
Referenz: OWASP Top 10 (Awareness), betriebliche Mindestkontrollen.

## Metadaten

| Feld | Wert |
|---|---|
| Check-ID | `SEC-BASE-20260218` |
| Datum | `2026-02-18` |
| Umgebung | `repo + production hardening` |
| Commit | `300efd0` |
| Pruefer | `Codex` |
| Gesamtstatus | `PARTIAL` |

## Statusregeln

- `PASS`: Kontrolle umgesetzt, Beleg vorhanden.
- `PARTIAL`: Teilweise umgesetzt, Restplan vorhanden.
- `OPEN`: Nicht umgesetzt oder nicht belegt.
- `N/A`: Nicht anwendbar, Begruendung pflichtig.

## A) Zugriff & Identitaet

| ID | Kontrolle | Nachweis (Artefakt) | Status | Owner | Zieltermin | Kommentar |
|---|---|---|---|---|---|---|
| SEC-01 | Login/Session serverseitig abgesichert | `auth.ts`, Testbeleg ST-01 | `PASS` | `Owner` | `2026-02-20` | ST-01 und produktive Session-Flows validiert |
| SEC-02 | Rollen/Berechtigungen serverseitig enforced | API-Belege, Codepfad | `PASS` | `Owner` | `2026-02-20` | Venture-Zugriffspruefung vereinheitlicht (`lib/venture-access.ts`) |
| SEC-03 | Tenant-Trennung (keine fremden Daten) | ST-03 + RLS/Policy-Nachweis | `PASS` | `Owner` | `2026-02-20` | ST-03 auf `PASS` (Cross-Account-UI Nachweis) |
| SEC-04 | Admin-Rechte klar begrenzt und dokumentiert | Admin-Policy, ENV-Regeln | `OPEN` | `Owner` | `2026-02-21` | Admin-Policy-Nachweis als Evidence fehlt |

## B) App- und API-Sicherheit

| ID | Kontrolle | Nachweis (Artefakt) | Status | Owner | Zieltermin | Kommentar |
|---|---|---|---|---|---|---|
| SEC-05 | Eingaben serverseitig validiert | API-Validatoren, Testfaelle | `PARTIAL` | `Owner` | `2026-02-24` | Validierung vorhanden, formaler Nachweislauf offen |
| SEC-06 | Fehlerantworten ohne Secrets/PII | API-Error-Belege | `PARTIAL` | `Owner` | `2026-02-24` | Spotcheck ok, systematischer Log-Review offen |
| SEC-07 | Rate-Limits fuer kritische Endpunkte | Rate-Limit-Konfig + Log | `PASS` | `Owner` | `2026-02-24` | Auth/Public-Limits aktiv (`lib/rate-limit.ts`, `app/api/auth/[...nextauth]/route.ts`) |
| SEC-08 | Webhook-Signaturpruefung aktiv | Stripe/Webhook-Code + Test | `PARTIAL` | `Owner` | `2026-02-24` | Code vorhanden, Testnachweis fehlt |

## C) Secrets, Dependencies, Supply Chain

| ID | Kontrolle | Nachweis (Artefakt) | Status | Owner | Zieltermin | Kommentar |
|---|---|---|---|---|---|---|
| SEC-09 | Keine produktiven Secrets im Repo | `docs/evidence/security-scan-report.md` | `PARTIAL` | `Owner` | `2026-02-18` | Hardcoded Resend-Key entfernt; Rotation noch ausstehend |
| SEC-10 | Secrets nur ueber ENV/Secret-Store | `scripts/tests/test-email.js`, Deployment-Doku | `PARTIAL` | `Owner` | `2026-02-19` | Testscript auf ENV umgestellt |
| SEC-11 | Dependency-Hygiene (audit/update) | Audit-Report | `OPEN` | `Owner` | `2026-02-19` | `npm audit` im Sandbox-Netz nicht erreichbar |
| SEC-12 | Lockfile + reproduzierbarer Build | `package-lock.json`, Build-Log | `PASS` | `Codex` | `2026-02-18` | Build erfolgreich mit Logbeleg |

## D) Daten- und Betriebssicherheit

| ID | Kontrolle | Nachweis (Artefakt) | Status | Owner | Zieltermin | Kommentar |
|---|---|---|---|---|---|---|
| SEC-13 | Backups/Snapshots vorhanden | Anbieter-Nachweis | `OPEN` | `Owner` | `2026-02-25` | Nachweise von Host/DB Anbieter fehlen |
| SEC-14 | Mindestens ein Restore-Test dokumentiert | Restore-Protokoll | `OPEN` | `Owner` | `2026-02-25` | Noch kein evidenzierter Restore-Lauf |
| SEC-15 | Logging aktiv, ohne sensible Leaks | Logbeispiel + Policy | `PARTIAL` | `Owner` | `2026-02-24` | Logging aktiv, strukturierte Policy noch offen |
| SEC-16 | Incident-Runbook vorhanden | `it-notfallplan.md` | `PARTIAL` | `Owner` | `2026-02-21` | Runbook-Template vorhanden, Kontaktkette/Freigabe offen |

## E) Offene Findings und Behandlung

| Finding-ID | Kurzbeschreibung | Schwere (L/M/H) | Risiko | Massnahme | Zieltermin | Status |
|---|---|---|---|---|---|---|
| `F-001` | Hardcoded Resend API Key in `scripts/tests/test-email.js` gefunden | `H` | Credential-Missbrauch | Key aus Code entfernt, ENV-Pflicht eingebaut, Key-Rotation anstossen | `2026-02-18` | `PARTIAL` |
| `F-002` | `npm audit` nicht erreichbar (DNS/Netzrestriktion) | `M` | Keine aktuelle CVE-Bewertung moeglich | Audit in Netzwerk mit Registry-Zugriff wiederholen | `2026-02-19` | `OPEN` |
| `F-003` | Lint-Gate rot (17 Fehler) | `M` | Schwankende Release-Qualitaet | Fehlerabbau priorisieren, Gate wieder gruen machen | `2026-02-25` | `CLOSED (2026-02-18)` |
| `F-004` | Server-Action/Origin-Blockierung (403 auf Ventures) | `H` | Kritische Kernflows nicht nutzbar | `allowedOrigins` und Proxy Same-Site-Origin-Freigabe deployed (`aa3b21b`, `300efd0`) | `2026-02-18` | `CLOSED` |

## Go/No-Go fuer Einreichung

- `SEC-01`, `SEC-02`, `SEC-03`, `SEC-09`, `SEC-13`, `SEC-16` duerfen nicht `OPEN` bleiben.
- Alle `H`-Findings brauchen Massnahme + Termin + Owner.
