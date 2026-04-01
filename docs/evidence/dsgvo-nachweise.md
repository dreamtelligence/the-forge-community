# DSGVO-Nachweise (Arbeitsstand)

Zweck: Nachweisfaehige Uebersicht zu Datenverarbeitung, Schutzmassnahmen und Anbieterverhaeltnissen.

## Metadaten

| Feld | Wert |
|---|---|
| Dokumentstand | `2026-02-18` |
| Verantwortlich | `Owner (THE FORGE)` |
| Geprueft am | `2026-02-18` |
| Gesamtstatus | `PARTIAL` |

## 1) Verzeichnis von Verarbeitungstaetigkeiten (VVT, Kurzform)

| VVT-ID | Prozess | Zweck | Datenkategorien | Rechtsgrundlage | Speicherort | Aufbewahrung | Status |
|---|---|---|---|---|---|---|---|
| VVT-01 | Account & Auth | Zugang zur Plattform | E-Mail, Login-Metadaten | | | | `OPEN` |
| VVT-02 | Venture/Squad Betrieb | Kernfunktion SaaS | Workspace-, Task-, Kommunikationsdaten | | | | `OPEN` |
| VVT-03 | Billing | Abrechnung | Abo-/Zahlungsmetadaten | | | | `OPEN` |
| VVT-04 | Transactional Mail | System- und Nutzerkommunikation | E-Mail, Event-Metadaten | | | | `OPEN` |
| VVT-05 | AI Workflows | Content-/Analysefunktionen | Prompts, ggf. Medien-URLs | | | | `OPEN` |

## 2) TOMs (Technische und Organisatorische Massnahmen)

| TOM-ID | Massnahme | Kategorie | Nachweis | Status | Owner |
|---|---|---|---|---|---|
| TOM-01 | Zugriffsschutz per Rollen/Permissions | Zugriffskontrolle | Security-Checklist SEC-02 | `PARTIAL` | Owner |
| TOM-02 | Tenant-Trennung / RLS wo sinnvoll | Trennungskontrolle | Migration/Policy-Nachweis | `PARTIAL` | Owner |
| TOM-03 | Secret-Management ausserhalb Repo | Vertraulichkeit | Secret-Scan + ENV-Policy | `PARTIAL` | Owner |
| TOM-04 | Logging ohne sensible Leaks | Integritaet/Nachvollziehbarkeit | Logbeispiele | `PARTIAL` | Owner |
| TOM-05 | Backup/Restore-Prozess | Verfuegbarkeit | Restore-Protokoll | `OPEN` | |

## 3) Subdienstleister (DPA/AVV-Status)

| Anbieter | Zweck | Datenbezug | Region | DPA/AVV vorhanden | URL/Beleg | Status |
|---|---|---|---|---|---|---|
| Vercel | Hosting/Deployment | App- und Logdaten | | `OPEN` | | |
| Neon/Postgres | Datenbank | Produktivdaten | | `OPEN` | | |
| Stripe | Payments/Billing | Zahlungsmetadaten | | `OPEN` | | |
| Resend | Transaktionsmails | E-Mail-Daten | | `OPEN` | | |
| Google Gemini / weitere AI-Provider | AI-Funktionen | Prompts/ggf. Medienbezug | | `OPEN` | | |
| Cloudflare (geplant) | Video Storage/CDN | Medienobjekte + Zugriffslogs | | `OPEN` | | |

## 4) Loesch- und Retention-Konzept

| Datenklasse | Retention | Loeschtrigger | Technische Umsetzung | Status |
|---|---|---|---|---|
| Accountdaten | | Account-Loeschung / Zweckende | | `OPEN` |
| Workspace-/Venture-Daten | | Vertragsende / Loeschanfrage | | `OPEN` |
| Uploads/Fotos/Videos | | Retention-Ablauf / manueller Delete | | `OPEN` |
| Logs | | Zeitablauf | | `OPEN` |
| Billing-Metadaten | | Gesetzliche Fristen | | `OPEN` |

## 5) Betroffenenrechte-Prozess

| Request-Typ | Eingangskanal | Frist | Bearbeitungsschritte | Nachweis/Ablage | Status |
|---|---|---|---|---|---|
| Auskunft | | | | | `OPEN` |
| Berichtigung | | | | | `OPEN` |
| Loeschung | | | | | `OPEN` |
| Datenexport | | | | | `OPEN` |

## 6) Datenschutzvorfall-Prozess

| Schritt | Beschreibung | Verantwortlich | Zielzeit | Status |
|---|---|---|---|---|
| Erkennung | Vorfall identifizieren und einstufen | | | `OPEN` |
| Eindammung | Zugriffe/Keys sperren, Schaden begrenzen | | | `OPEN` |
| Bewertung | Umfang, Datenarten, Betroffene bewerten | | | `OPEN` |
| Meldung | Falls meldepflichtig: fristgerechte Meldung | | | `OPEN` |
| Nachbereitung | Root Cause + Massnahmenplan | | | `OPEN` |

## 7) Offene Punkte vor Einreichung

| Punkt | Prioritaet | Owner | Zieltermin | Status |
|---|---|---|---|---|
| DPA/AVV-Nachweise fuer alle Kernanbieter vervollstaendigen | Hoch | Owner | `2026-02-24` | `OPEN` |
| Retention-Werte je Datenklasse verbindlich festlegen | Hoch | Owner | `2026-02-24` | `OPEN` |
| Prozess fuer Betroffenenrechte operationalisieren | Mittel | Owner | `2026-02-26` | `OPEN` |
