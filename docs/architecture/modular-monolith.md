# Modular Monolith Decision

Stand: 14.04.2026

## Problem, das das Produkt löst

The Forge bündelt die operativen Kernschritte für Solo-Founder in einer Oberfläche:
Idee validieren, Venture strukturieren, Brand/Content erzeugen, rechtliche Basis schaffen und operative Commerce-Abläufe steuern.

Der Scope ist absichtlich nicht "alles für jeden", sondern ein Founder-Operations-Stack für den Weg von Idee bis Launch.

## Warum aktuell ein modularer Monolith

- Ein Team, ein Deployable, eine Datenbasis.
- Die Module teilen sich Nutzer-, Venture-, Billing- und Audit-Kontext.
- Die größte Produktgeschwindigkeit entsteht aktuell an den Schnittstellen zwischen diesen Modulen, nicht durch verteilte Services.
- Komplexität wird deshalb zuerst im Repo über Modulgrenzen kontrolliert, nicht vorschnell über Netzwerkgrenzen.

## Harte Grenzen im Monolithen

- `app/`: Routen, Pages, Server Actions
- `components/`: produktnahe UI-Komposition
- `shared/`: bereichsübergreifende UI-/Integrationsbausteine
- `lib/`: Domain- und Service-Logik
- `prisma/`: kanonische Schema-Historie
- `prisma/manual_sql/`: manuelle SQL-Supplements außerhalb der Prisma-Historie

## Was bewusst nicht lokal gerechnet wird

- AI-Video-, Image- und Voice-Generierung läuft nicht als eigene Medienpipeline im App-Server.
- Die Routen orchestrieren externe Provider, Persistenz, Credits, Guardrails und Rückgabe.
- Langlaufende Providerpfade müssen explizit `runtime = 'nodejs'` und `maxDuration` setzen.

## Extraktions-Trigger

Ein Modul wird erst aus dem Monolithen herausgelöst, wenn mindestens einer dieser Fälle eintritt:

- es braucht eine eigene Queue/Worker-Laufzeit mit dauerhaft anderen Betriebsanforderungen
- es braucht eine eigene Deploy-/Rollback-Geschwindigkeit
- es erzeugt wiederholt unklare Ownership oder Kopplung im Repo
- es blockiert `build`, `lint`, Tests oder Release-Frequenz für fachfremde Teams

Bis dahin gilt: lieber ein sauberer modularer Monolith als ein chaotisches Pseudo-Microservice-System.
