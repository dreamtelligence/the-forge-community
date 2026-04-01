# Smoke-Test-Protokoll

Zweck: Nachweis, dass kritische Kernflows in definiertem Zustand funktionieren.

## Testlauf-Metadaten

| Feld | Wert |
|---|---|
| Testlauf-ID | `SMK-20260218-01` |
| Datum | `2026-02-18` |
| Startzeit (lokal) | `10:02` |
| Endzeit (lokal) | `10:04` |
| Umgebung | `local evidence run` |
| Basis-URL | `N/A (CLI preflight)` |
| Git-Commit | `1a12d1f` |
| Tester | `Codex` |
| Review durch | `offen` |
| Gesamturteil | `PARTIAL` |

## Bewertungsregeln

- `PASS`: Erwartetes Ergebnis voll erreicht, Beleg vorhanden.
- `PARTIAL`: Flow laeuft, aber Nebenpunkt offen; Ticket/Restmassnahme dokumentiert.
- `FAIL`: Kritischer Flow nicht lauffaehig.

Regel fuer Einreichung: ST-01 bis ST-05 muessen mindestens `PASS` oder `PARTIAL` mit Massnahme sein.

## Testfaelle (Kernflows)

| Test-ID | Bereich | Vorbedingungen | Schritte (kurz) | Erwartet | Ergebnis | Evidence-Datei/Link | Abweichung / Ticket |
|---|---|---|---|---|---|---|---|
| ST-01 | Login / Closed Beta | Public Login deaktiviert, Allowlist leer | `/login` aufrufen, Login ohne Allowlist testen | Zugriff blockiert, Beta-Hinweis sichtbar | `PASS` | `Chat-Anhang Image #1, Image #2 (18.02.2026)` | Closed-Beta-Hinweis und deaktivierte Login-CTAs sichtbar |
| ST-02 | Venture-Anlage | Testuser eingeloggt | Venture erstellen, Basisdaten speichern, reload | Venture persistiert, Owner korrekt | `PASS` | `docs/evidence/01_smoke/2026-02-18_105232_auth-tenant-smoke_localhost.log` + `Chat-Anhang (aktueller Turn) Image #1` | API create-or-get + Owner-Sicht im Ventures-UI belegt |
| ST-03 | Rechte / Tenant-Trennung | 2 Testuser in getrennten Ventures | User A versucht Zugriff auf Venture B | Zugriff verweigert (API/UI) | `PASS` | `Chat-Anhang (aktueller Turn) Image #1, Image #2` | KDS-Admin sieht eigene Ventures, oezguer-Account sieht diese nicht (nicht public) |
| ST-04 | Billing / Stripe | Stripe-Testmodus + Webhook erreichbar | Test-Checkout ausfuehren, Webhook verarbeiten | Status aktiv, Buchung sichtbar | `PARTIAL` | `Chat-Anhang Image #3 (18.02.2026)` | Checkout-Seite nachweisbar erreichbar; finaler Success/Webhook-Nachweis noch offen |
| ST-05 | Warehouse WMS | `TEST_VENTURE_ID`, `TEST_SESSION_COOKIE` gesetzt | Inbound -> Bin -> Pick -> Shipment | Statuskette konsistent, kein invalid transition | `PASS` | `docs/evidence/01_smoke/2026-02-18_103422_warehouse-smoke_user-session.log` | Optionaler Foto-Flow wurde bewusst nicht aktiviert |

## Optional erweiterte Tests

| Test-ID | Bereich | Ziel | Ergebnis | Evidence |
|---|---|---|---|---|
| ST-06 | File Upload | Upload validiert (Typ, Groesse, Retention) | `OPEN` | `docs/evidence/01_smoke/...` |
| ST-07 | API Error Handling | Fehler liefern sichere, nachvollziehbare Response | `OPEN` | `docs/evidence/01_smoke/...` |
| ST-08 | AI Provider Fallback | Fallback/Fehlermeldung bei Provider-Fehler | `OPEN` | `docs/evidence/01_smoke/...` |

## Laufprotokoll (Zeitstrahl)

| Zeit | Schritt | Ergebnis | Evidence |
|---|---|---|---|
| `10:02` | Testlauf gestartet | OK | `docs/evidence/01_smoke/2026-02-18_100236_warehouse-smoke.log` |
| `10:03` | Erstlauf abgebrochen | `EPERM` (Sandbox IPC) | `docs/evidence/01_smoke/2026-02-18_100236_warehouse-smoke.log` |
| `10:04` | Wiederholung ausserhalb Sandbox | Script startet korrekt | `docs/evidence/01_smoke/2026-02-18_100411_warehouse-smoke_escalated.log` |
| `10:04` | ST-05 Vorbedingung geprueft | Blocker erkannt (fehlende ENV) | `docs/evidence/01_smoke/2026-02-18_100411_warehouse-smoke_escalated.log` |
| `10:04` | Testlauf abgeschlossen | `PARTIAL` | `docs/evidence/01_smoke/2026-02-18_100411_warehouse-smoke_escalated.log` |
| `10:34` | Re-Run mit frischer Session | Warehouse-Smoke `PASS` (6/0/2) | `docs/evidence/01_smoke/2026-02-18_103422_warehouse-smoke_user-session.log` |
| `10:43` | Closed-Beta UI Nachweis | ST-01 `PASS` (Hinweis + deaktivierte Login-CTA sichtbar) | `Chat-Anhang Image #1, Image #2` |
| `10:43` | Stripe Checkout Nachweis | ST-04 `PARTIAL` (Checkout-Seite/Payment-Step sichtbar) | `Chat-Anhang Image #3` |
| `10:52` | Auth/Tenant Smoke (localhost) | ST-02 API-Nachweis erfolgreich; ST-03 vorlaeufig `PARTIAL` auf Betreiberbestaetigung | `docs/evidence/01_smoke/2026-02-18_105232_auth-tenant-smoke_localhost.log` |
| `10:58` | Cross-Account UI Nachweis | ST-03 auf `PASS` angehoben; Ventures zwischen Accounts isoliert | `Chat-Anhang (aktueller Turn) Image #1, Image #2` |
| `15:16` | Security Header + Server-Action Origin Fix deployed | `interest-cohort` entfernt, `allowedOrigins` gesetzt | Commit `aa3b21b` |
| `15:24` | Proxy Same-Site Origin Fix deployed | 403 auf `/ventures` und `/ventures/new` durch Origin-Mismatch geschlossen | Commit `300efd0` |
| `15:25` | Produktions-Recheck durch Betreiber | Ventures wieder sichtbar, Venture-Erstellung wieder moeglich, Fehler behoben | Chat-Bestaetigung (aktueller Turn) |

## Nachlauf (User) - 18.02.2026

| Feld | Wert |
|---|---|
| Testlauf-ID | `SMK-20260218-02` |
| Umgebung | `http://localhost:3000` |
| Venture-ID | `cml85md6f0008o2t05mrpwxbh` |
| Ergebnis | `Passed: 2, Failed: 4, Skipped: 2` |
| Hauptfehler | `401 Unauthorized` bei geschuetzten Schritten |
| Session-Check | `GET /api/auth/session` -> `200` mit Body `null` (localhost und production) |
| Interpretation | Session-Cookie ungueltig/abgelaufen oder nicht passend zur Instanz |

## Nachlauf (Codex + frische Session) - 18.02.2026

| Feld | Wert |
|---|---|
| Testlauf-ID | `SMK-20260218-03` |
| Umgebung | `http://localhost:3000` |
| Venture-ID | `cml85md6f0008o2t05mrpwxbh` |
| Ergebnis | `Passed: 6, Failed: 0, Skipped: 2` |
| Receipt | `PU-20260218-XIXG04` |
| Foto-Flow | `deaktiviert` (`TEST_WAREHOUSE_PHOTO_UPLOAD` nicht gesetzt) |
| Evidence | `docs/evidence/01_smoke/2026-02-18_103422_warehouse-smoke_user-session.log` |
| Interpretation | Auth-/Session-Blocker behoben; Warehouse-Kernflow erfolgreich |

## Bildnachweise (User) - 18.02.2026

| Referenz | Zuordnung | Nachweisinhalt |
|---|---|---|
| `Image #1` | ST-01 | Login-Seite mit Closed-Beta-Hinweis und eingeschraenktem Zugang |
| `Image #2` | ST-01 | Landing-CTA zeigt geschlossene Beta / Bewerbungs-Hinweis |
| `Image #3` | ST-04 | Stripe Checkout ist erreichbar und Produktpreis wird korrekt angezeigt |

## Nachlauf (Auth/Tenant API) - 18.02.2026

| Feld | Wert |
|---|---|
| Testlauf-ID | `SMK-20260218-04` |
| Umgebung | `http://localhost:3000` |
| Ergebnis | `Passed: 5, Failed: 0, Skipped: 3` |
| Venture A | `cmksbyg95000d8wt0lw8quxfq` |
| Nachweisdatei | `docs/evidence/01_smoke/2026-02-18_105232_auth-tenant-smoke_localhost.log` |
| Aussage | ST-02 via API + UI belegt, ST-03 via Cross-Account UI-Nachweis auf `PASS` angehoben |

## Freigabe

| Rolle | Name | Datum | Sign-Off |
|---|---|---|---|
| Tester | | | |
| Reviewer (technisch) | | | |
| Freigabe fuer Anlage | | | |
