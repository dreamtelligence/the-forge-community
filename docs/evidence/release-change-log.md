# Release- & Change-Log

Zweck: Nachweis kontrollierter Aenderungen mit Test- und Rollback-Disziplin.

## Regeln

1. Ein Eintrag pro Deployment oder risikoreicher Konfigurationsaenderung.
2. Jede Aenderung hat mindestens eine Testreferenz.
3. Bei Risiko `H` muss ein klarer Rollback-Schritt dokumentiert sein.

## Change-Uebersicht

| Datum | Release-ID | Commit/Tag | Umgebung | Aenderung (1 Satz) | Risiko (L/M/H) | DB-Migration (Ja/Nein) | Tests ausgefuehrt | Ergebnis | Rollback moeglich (Ja/Nein) | Verantwortlich |
|---|---|---|---|---|---|---|---|---|---|---|
| `2026-02-18` | `REL-QA-20260218-01` | `1a12d1f` | `local` | Baseline-Qualitaetslauf fuer IHK/Jobcenter-Evidenz durchgefuehrt | `M` | `Nein` | `npm run lint`, `npm run build`, `npm run test:smoke:warehouse` | `PARTIAL` | `Ja` | `Codex` |
| `2026-02-18` | `REL-QA-20260218-02` | `1a12d1f` | `localhost` | User-Nachlauf mit gesetzter Venture-ID/Cookie; Auth-Problem reproduziert | `M` | `Nein` | `npm run test:smoke:warehouse` | `FAIL` | `Ja` | `User` |
| `2026-02-18` | `REL-QA-20260218-03` | `1a12d1f` | `localhost` | Re-Run mit frischer Session; Warehouse-Smoke erfolgreich | `M` | `Nein` | `npm run test:smoke:warehouse` | `PASS` | `Ja` | `Codex` |
| `2026-02-18` | `REL-QA-20260218-04` | `1a12d1f` | `production UI` | Screenshot-Evidenz fuer Closed-Beta Login und Stripe Checkout ergänzt | `M` | `Nein` | `ST-01 (UI), ST-04 (UI)` | `PARTIAL` | `Ja` | `User + Codex` |
| `2026-02-18` | `REL-QA-20260218-05` | `1a12d1f` | `localhost` | Neuer Auth/Tenant Smoke fuer ST-02/ST-03 implementiert und ausgefuehrt | `M` | `Nein` | `npm run test:smoke:auth-tenant` | `PARTIAL` | `Ja` | `Codex` |
| `2026-02-18` | `REL-QA-20260218-06` | `17ff787` | `repo + production` | Security-Hardening: Tenant-Guard, Stripe-Webhook-Idempotency, Rate-Limits eingefuehrt | `H` | `Nein` | `npm run lint`, `npm run build` | `PASS` | `Ja` | `Codex` |
| `2026-02-18` | `REL-QA-20260218-07` | `a231e45` | `production` | Forum-Request-Loop behoben (Stabilitaet/Konsolenflut reduziert) | `M` | `Nein` | `npm run build` | `PASS` | `Ja` | `Codex` |
| `2026-02-18` | `REL-QA-20260218-08` | `2a0860c` | `production` | CSP/iframe-Kompatibilitaet verbessert (TikTok IPv6 + fullscreen warning) | `M` | `Nein` | `npm run build` | `PASS` | `Ja` | `Codex` |
| `2026-02-18` | `REL-QA-20260218-09` | `aa3b21b` | `production` | Server-Action-Origin-Freigaben + Permissions-Policy korrigiert | `H` | `Nein` | `npm run lint`, `npx tsc --noEmit`, `npm run build` | `PASS` | `Ja` | `Codex` |
| `2026-02-18` | `REL-QA-20260218-10` | `300efd0` | `production` | Proxy-CORS auf Same-Site-Origin normalisiert; 403 auf Ventures-Workflows geschlossen | `H` | `Nein` | `npm run lint`, `npx tsc --noEmit`, `npm run build`, Produktions-Recheck | `PASS` | `Ja` | `Codex + User` |

## Qualitaetsgates pro Release

| Gate | Soll | Ist | Evidence-Datei/Link | Status |
|---|---|---|---|---|
| Lint | `npm run lint` erfolgreich | `PASS` | `docs/evidence/02_release/2026-02-18_153510_lint.log` | `PASS` |
| Build | `npm run build` erfolgreich | `PASS` | `docs/evidence/02_release/2026-02-18_154027_build.log` | `PASS` |
| Smoke | Kernflow ST-01..ST-05 geprueft | `ST-01 PASS, ST-02 PASS, ST-03 PASS, ST-04 PARTIAL, ST-05 PASS` | `docs/evidence/smoke-test-protokoll.md` | `PARTIAL` |
| Security Quick Check | Keine neuen kritischen Findings | `1 Hardcoded Key gefixt, Rotation offen` | `docs/evidence/security-scan-report.md` | `PARTIAL` |

## Rollback-Protokoll

| Release-ID | Trigger fuer Rollback | Konkrete Schritte | Ergebnis | Dauer | Kommentar |
|---|---|---|---|---|---|
| `REL-001` | | | | | |

## Offene Risiken nach Release

| ID | Risiko | Auswirkung | Massnahme | Zieltermin | Owner | Status |
|---|---|---|---|---|---|---|
| `R-001` | Lint-Fehler in mehreren Modulen | Release-Qualitaet nicht reproduzierbar gruen | Fehler priorisieren und in Batches abbauen | `2026-02-25` | `Team` | `CLOSED (2026-02-18)` |
| `R-002` | Vollstaendiger End-to-End Smoke-Nachweis noch unvollstaendig | ST-04 nur teilbelegt (Checkout sichtbar, Success/Webhook-Beleg offen) | Billing-Success-Seite + verarbeiteter Webhook/Statusaenderung dokumentieren | `2026-02-20` | `Owner` | `OPEN` |
| `R-003` | Frueherer API-Key war im Repo vorhanden | Potenzieller Credential-Missbrauch | Key rotieren, Zugriffslogs pruefen, Historie monitoren | `2026-02-18` | `Owner` | `PARTIAL` |
