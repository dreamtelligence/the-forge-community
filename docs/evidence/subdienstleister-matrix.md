# Subdienstleister-Matrix (DPA/AVV)

Zweck: Nachweis ueber eingesetzte Anbieter, Datenbezug und Vertragsstatus.

## Metadaten

| Feld | Wert |
|---|---|
| Stand | `2026-02-18` |
| Verantwortlich | `Owner (THE FORGE)` |
| Letzte Pruefung | `2026-02-18` |

## Anbieteruebersicht

| Anbieter | Zweck | Datenarten | Region | Vertragstyp (DPA/AVV) | Status | Link/Beleg | Naechste Aktion |
|---|---|---|---|---|---|---|---|
| Vercel | Hosting/Deployment | App-Logs, Runtime-Metadaten | | | `PARTIAL` | | DPA/AVV-Status eintragen |
| Neon/Postgres (oder genutzter DB-Provider) | Datenbank | Account-, Venture-, Betriebsdaten | | | `PARTIAL` | | DPA/AVV-Status eintragen |
| Stripe | Billing/Payments | Zahlungsmetadaten, Kundenreferenzen | | | `PARTIAL` | | DPA/AVV-Status + Nachweislink eintragen |
| Resend | Transactional Mail | E-Mail-Adressen, Versandmetadaten | | | `PARTIAL` | | DPA/AVV-Status eintragen |
| Google Gemini | AI-Inferenz | Prompts, ggf. Metadaten | | | `PARTIAL` | | Anbieterbedingungen/DPA pruefen |
| Weitere AI-Provider (z.B. Groq/Replicate/...) | AI-Inferenz/Media | Prompt-/Job-/Media-Metadaten | | | `PARTIAL` | | pro Anbieter einzeln aufschluesseln |
| Cloudflare (geplant) | Video Storage/CDN | Medienobjekte, Access-Logs | | | `OPEN` | | nach Finanzierung aktivieren und dokumentieren |

## Pflichtkriterien pro Anbieter

| Kriterium | Erfuellt (Ja/Nein) | Nachweis |
|---|---|---|
| Vertrag/DPA dokumentiert | | |
| Zweckbindung passt zum Produkt | | |
| Datenkategorien klar benannt | | |
| Loesch-/Retention-Regeln geklaert | | |
| Transfer-/Regionsthema bewertet | | |
| Ansprechpartner/Support dokumentiert | | |

## Freigabe

| Rolle | Name | Datum | Sign-Off |
|---|---|---|---|
| Fachlich | | | |
| Datenschutz | | | |
| Final fuer Einreichung | | | |
