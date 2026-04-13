# Multi-Provider BYOK Plan

Stand: 2026-04-13

## Ziel

The Forge soll Usern eigene API-Keys fuer alle relevanten AI-Provider erlauben, nicht nur fuer Replicate.

Geplant sind:

- Replicate
- Gemini
- OpenAI
- Anthropic

Diese Keys sollen fuer alle AI-gesteuerten Bereiche nutzbar sein:

- Chat
- Context Chat
- Research
- PDF-Analyse
- Contract Scan
- Legal / AI-Textfunktionen
- Prompt Expansion
- Marketing-Generatoren
- Bild-, Video-, Voice- und Avatar-Flows

## Produktentscheidung

Diese Regel ist verbindlich und ersetzt die fruehere Idee mit der 10%-Fee auf BYOK:

### Monetarisierungsmodell

Geplantes Zielmodell:

- `49 EUR / Monat` fuer Platform Access
- erste `50 Credits` frei als Onboarding-/Testkontingent
- danach wahlweise:
  - Plattform-Keys nutzen
  - eigene Keys (BYOK) nutzen

### Strategische Bedeutung

BYOK ist in diesem Modell kein zusaetzlicher Fee-Kanal, sondern ein Feature des bezahlten Plattformzugangs.

Die Plattform monetarisiert sich dann primär ueber:

- den monatlichen Zugang
- Plattform-Keys / Credits fuer User ohne eigene Keys

Nicht mehr ueber:

- zusaetzliche Plattform-Fee auf BYOK

### Billing-Regel

1. Wenn der User den **Plattform-Key** nutzt:
- es gilt die normale Plattformabrechnung
- Providerkosten werden intern getragen und dem User berechnet
- zusaetzlich wird die Plattform-Fee berechnet

2. Wenn der User seinen **eigenen Key (BYOK)** nutzt:
- der User traegt die Providerkosten direkt beim Provider
- The Forge berechnet **keine Plattform-Fee**
- intern darf in diesem Fall **nicht** mehr der volle Providerpreis als Credits reserviert oder settled werden

3. Empfohlene Produktregel:
- BYOK wird nur fuer aktive zahlende Accounts freigeschaltet
- Free-/Beta-User nutzen die freien Credits und danach Plattform-Keys

### Konsequenz

BYOK ist in Zukunft ein echter Kostenentlastungsmodus:

- Plattform-Key = Providerkosten + Plattformmodell
- User-Key = keine Providerkosten ueber Forge, keine Plattform-Fee
- der wirtschaftliche Gegenwert der Plattform kommt ueber `49 EUR / Monat`

## Aktueller Ist-Zustand

### Bereits vorhanden

- Replicate BYOK ist technisch bereits teilweise umgesetzt
- Settings-Seite fuer Provider Keys existiert
- verschluesselte Speicherung ist vorhanden
- Fallback `user key -> platform key` existiert fuer Replicate

### Noch nicht sauber umgesetzt

- Gemini/OpenAI/Anthropic BYOK existiert noch nicht
- viele Text-/Chat-/PDF-Flows greifen direkt auf `process.env.GEMINI_API_KEY` zu
- Replicate BYOK ist heute eher Key-Routing als sauberes BYOK-Billing
- bei BYOK wird aktuell an mehreren Stellen trotzdem noch normal mit Credits gearbeitet
- Research ist gesondert kompliziert, weil dort neben LLM-Kosten auch Web-Search-Kosten anfallen

## Zielarchitektur

## 1. Provider-Key-System erweitern

Die bestehende Replicate-Logik wird zu einem generischen Multi-Provider-System erweitert.

Provider:

- `replicate`
- `gemini`
- `openai`
- `anthropic`

Pro Provider werden gebraucht:

- verschluesselter Key
- Key-Hint
- Status `user | platform | none`
- Validation Error
- Last Validated At
- Aktiv/Inaktiv

### Kernfunktionen

Empfohlene zentrale API:

- `getProviderKeyStatusForUser(userId, provider)`
- `upsertProviderKeyForUser(userId, provider, token)`
- `removeProviderKeyForUser(userId, provider)`
- `resolveProviderAuthForUser(userId, provider)`
- `getProviderClientForUser(userId, provider)`

## 2. Runtime von Billing trennen

Provider-Aufloesung und Billing duerfen nicht mehr vermischt sein.

Es braucht zwei getrennte Schichten:

### A. Runtime / Routing

Entscheidet:

- welcher Provider verwendet wird
- ob `user key` oder `platform key`
- welcher Client erzeugt wird

### B. Billing

Entscheidet:

- ob Credits reserviert werden
- wie Providerkosten berechnet werden
- ob ueberhaupt Plattformkosten anfallen

### Harte Regel

- `authSource = platform` -> abrechnen
- `authSource = user` -> **keine Plattformabrechnung**

## 3. Einheitliche AI Execution Layer

Es soll eine zentrale Ausfuehrungsschicht geben, statt viele Einzelrouten direkt gegen Provider laufen zu lassen.

Empfohlene neue Files:

- `lib/ai-runtime.ts`
- `lib/ai-provider-routing.ts`
- `lib/ai-usage-pricing.ts`

Standard-Interface:

- `executeAiTask({ userId, capability, provider, model, input, attachments, ventureId })`

Rueckgabe:

- output
- usage
- provider
- model
- authSource
- billingMode

## Anbieter- und Capability-Mapping

Empfohlene erste Zuordnung:

- Text Chat: Gemini, OpenAI, Anthropic
- PDF / Document Analysis: Gemini, OpenAI, Anthropic
- Contract Scan: Gemini zuerst, spaeter OpenAI/Anthropic optional
- Research Synthesis: Gemini, OpenAI, Anthropic
- Media Generation: Replicate

## Billing-Modell

### Plattform-Key

Wenn `authSource = platform`:

- interne Kostenbasis wird aus Modellpreisen oder Usage berechnet
- Credits / Charges werden wie bisher ueber die Plattform abgebildet
- Plattform-Fee bleibt nur hier relevant

### User-Key / BYOK

Wenn `authSource = user`:

- keine Credits fuer Providerkosten reservieren
- keine Plattform-Fee berechnen
- nur Usage intern loggen
- idealerweise nur erlauben, wenn der User ein aktives Platform-Access-Abo hat

### Wichtig

Fuer BYOK darf die Plattform trotzdem:

- Usage protokollieren
- Audit-/Reporting-Daten speichern
- Provider- und Modellnutzung anzeigen

Aber:

- **kein Credits-Abzug**
- **keine Plattform-Fee**

## Zugriffsregel fuer BYOK

Empfohlene Zielregel:

- `Free / Beta`: freie Credits, aber kein oder nur eingeschraenktes BYOK
- `Paid / Platform Access`: BYOK freigeschaltet

Begruendung:

- verhindert, dass kostenlose Accounts die Plattform nur als UI fuer eigene Keys nutzen
- haelt den Wert des `49 EUR / Monat` Plans klar
- vermeidet Missbrauch und Support-Last

## Sonderfall Research

Research ist gemischt:

- LLM (Gemini/OpenAI/Anthropic)
- Web Search (aktuell Brave)

Produktentscheidung fuer spaeter:

1. Wenn User eigenen LLM-Key nutzt:
- LLM-Anteil nicht ueber Forge abrechnen

2. Search-Anteil:
- zunaechst weiterhin Plattformkostenblock
- spaeter optional eigener Search-Key oder separater Search-Tarif

### Empfohlener Zwischenstand

In Phase 1 fuer Research:

- eigener LLM-Key moeglich
- Search bleibt Plattformkostenblock
- Search-Kosten getrennt loggen

## Konkrete Arbeitsphasen

## Phase 1: Datenmodell und Provider-Key-Infrastruktur

Ziel:

- Replicate-System auf Multi-Provider erweitern
- Gemini/OpenAI/Anthropic im Settings-UI sichtbar machen

Dateien:

- `lib/provider-keys.ts`
- `app/api/provider-keys/route.ts`
- `app/settings/provider-keys/page.tsx`
- `app/settings/provider-keys/ProviderKeysClient.tsx`

Aufgaben:

- Statusobjekte fuer alle vier Provider
- Validation pro Provider
- Save/Delete pro Provider
- Fallback-Logik `user -> platform -> none`
- BYOK-Freischaltung an Subscription-/Access-Status koppeln

## Phase 2: Gemini BYOK fuer alle textnahen Flows

Ziel:

- kein direkter Zugriff mehr auf `process.env.GEMINI_API_KEY` in Business-Flows

Primär betroffen:

- `lib/ai.ts`
- `lib/gemini-tools.ts`
- `app/api/chat/route.ts`
- `app/api/chat/contextual/route.ts`
- `app/api/communication/chat/route.ts`
- `app/api/chat/landing/route.ts`
- `lib/ai-contract-scan.ts`
- `lib/ai-research.ts`
- `app/api/research/route.ts`

Regel:

- wenn User-Gemini-Key aktiv -> mit User-Key ausfuehren
- sonst Plattform-Gemini-Key
- bei User-Key keine Plattformabrechnung
- BYOK nur, wenn der Account fuer Platform Access freigeschaltet ist

## Phase 3: OpenAI und Anthropic integrieren

Ziel:

- alternative Text-/Reasoning-Provider ueber denselben Key-Mechanismus nutzbar machen

Neue Resolver:

- `resolveOpenAIAuthForUser`
- `resolveAnthropicAuthForUser`

Neue Runtime-Regel:

- bevorzugten Provider pro Capability waehlen
- nur auf Plattform-Key fallbacken, wenn kein User-Key vorhanden ist

## Phase 4: Replicate-Billing sauber machen

Ziel:

- bestehendes Replicate-BYOK wirtschaftlich korrigieren

Betroffene Bereiche:

- `app/api/forge/media/route.ts`
- `app/api/ventures/[id]/marketing/media/route.ts`
- `faceswap`
- `lipsync`
- `motion-transfer`
- `rembg`
- `app/api/webhooks/replicate/route.ts`

Regel:

- `authSource = platform` -> normale Plattformabrechnung
- `authSource = user` -> keine Credits, keine Fee, nur Usage-Logging

## Phase 5: Billing- und Usage-UI

Ziel:

- User und Admin sehen, was ueber eigene Keys und was ueber Plattform-Keys lief

Betroffen:

- `app/settings/billing/page.tsx`
- `app/api/billing/summary/route.ts`
- `app/api/billing/usage/route.ts`

Anzeigen:

- Provider
- Modell
- Auth Source
- Provider Cost
- Charged Cost
- Fee
- Usage / Token / Runtime

Bei BYOK:

- `charged = 0`
- klar sichtbar: `own key used`
- optional Hinweis: `covered by your own provider account`

## Empfohlene Reihenfolge

Diese Reihenfolge reduziert Risiko:

1. Provider-Key-Infrastruktur allgemein
2. BYOK-Access-Guard an Platform Access koppeln
3. Gemini BYOK fuer Chat/PDF/Contract Scan
4. OpenAI + Anthropic
5. Replicate-Billing korrigieren
5. Research sauber aufteilen
6. Billing-/Usage-UI finalisieren

## Offene Produktfragen

Vor Umsetzung final entscheiden:

1. Soll Research-Search weiterhin Plattformkosten verursachen, auch wenn User eigenen LLM-Key nutzt?
2. Soll es spaeter pro Capability einen bevorzugten Provider geben?
3. Soll der User im UI explizit `prefer own key` setzen koennen?
4. Sollen bestimmte kritische Flows trotz User-Key nur auf freigegebenen Providern laufen?
5. Ab welchem genauen Billing-Status wird BYOK freigeschaltet: `active`, `trialing`, `pro`, `enterprise`?

## Wichtige technische Leitlinie

Kein neuer Flow darf direkt an `process.env.GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` oder `REPLICATE_API_TOKEN` haengen, sobald diese Umstellung beginnt.

Alles muss durch die zentrale Provider-Aufloesung laufen.

## Kurzfassung fuer den naechsten Chat

Wenn dieses Thema wieder aufgegriffen wird:

- Ziel ist **Multi-Provider BYOK**
- Provider: Replicate, Gemini, OpenAI, Anthropic
- AI-Bereiche: Chat, PDFs, Research, Contract Scan, Text, Media
- **Wichtige Produktentscheidung:** Bei **eigenen Keys keine Plattform-Fee**
- Geschaeftsmodell: `49 EUR / Monat` Platform Access + `100 freie Credits`
- BYOK soll idealerweise nur fuer zahlende Accounts freigeschaltet werden
- Plattform-Fee und Plattformabrechnung nur bei **Plattform-Keys**
- Replicate ist technisch teilweise vorhanden, aber wirtschaftlich noch nicht sauber
- als erstes Infrastruktur + Gemini BYOK bauen
