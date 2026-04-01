# IT-Notfallplan (1 Seite, operativ)

Zweck: Schneller, nachvollziehbarer Ablauf bei Sicherheits- oder Betriebsvorfaellen.
Stand: `2026-02-18` (Template vorhanden, Kontaktkette offen)

## 1) Ausloeser (wann dieser Plan gilt)

- Verdacht auf Account-Uebernahme oder Credential-Leak
- Ungeplante Nichtverfuegbarkeit kritischer Funktionen
- Datenverlust oder fehlerhafte Datenintegritaet
- Sicherheitsvorfall bei Subdienstleister (Hosting, DB, Payment, Mail, AI)

## 2) Kontaktkette (innerhalb 15 Minuten)

| Rolle | Name | Kontakt | Backup-Kontakt |
|---|---|---|---|
| Incident Owner | | | |
| Tech Owner | | | |
| Hosting Support | | | |
| Datenbank Support | | | |
| Payment Support | | | |
| Mail/Notification Support | | | |
| Domain/DNS Support | | | |

## 3) Sofortmassnahmen (0-30 Minuten)

1. Incident-Channel oeffnen und Zeitstempel setzen (`T0`).
2. Potenziell kompromittierte Keys sofort deaktivieren/rotieren.
3. Schreibende Deployments pausieren.
4. Betroffene Endpunkte/Funktionen eingrenzen (Feature-Flag, WAF, Maintenance).
5. Erste Lageeinschaetzung dokumentieren: Umfang, betroffene Daten, laufende Risiken.

## 4) Beweissicherung (parallel)

| Quelle | Was sichern | Speicherort | Verantwortlich |
|---|---|---|---|
| App-Logs | Fehlermeldungen, Request-Korrelation, Zeitfenster | `docs/evidence/05_operations/` | |
| Provider-Logs | Hosting/DB/Payment/Mail Events | `docs/evidence/05_operations/` | |
| Konfiguration | Relevante ENV-/Deploy-Aenderungen | `docs/evidence/05_operations/` | |
| Betroffene IDs | User/Venture/Order/Request IDs | `docs/evidence/05_operations/` | |

## 5) Wiederherstellung (30-180 Minuten)

1. Letzte stabile Version identifizieren.
2. Rollback oder Hotfix mit kleinstmoeglicher Aenderung ausrollen.
3. Gesundheitschecks: Login, Kern-APIs, Billing, Datenkonsistenz.
4. Falls Daten betroffen: Restore-Strategie nach Prioritaet (kritisch zuerst).
5. Abschlusszeitpunkt `Tclose` dokumentieren.

## 6) Kommunikation

| Zielgruppe | Kanal | Inhalt | Frist |
|---|---|---|---|
| Intern (Team/Owner) | | Kurzlage + naechste Schritte | < 30 min |
| Betroffene Nutzer | | Was passiert ist, was jetzt gilt, was sie tun sollen | schnellstmoeglich |
| Partner/Provider | | technische Incident-Details | nach Bedarf |
| Behoerdlich/Datenschutz (falls noetig) | | formale Meldung nach Rechtslage | fristgerecht |

## 7) Post-Incident (spae. 48h)

1. Root Cause Analyse (technisch + prozessual).
2. Massnahmenplan mit Owner und Datum.
3. Lessons Learned in Runbooks/Checklisten uebernehmen.
4. Evidenz vollstaendig im Ordner `docs/evidence/05_operations/` ablegen.

## 8) Mindest-Evidenz fuer Einreichung

- Incident-Checkliste (ausgefuellt)
- Zeitstrahl (`T0`, Massnahmen, `Tclose`)
- Beleg zu Key-Rotation oder Rollback
- Kurzprotokoll der Nachbereitung
