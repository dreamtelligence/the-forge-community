# Changelog

Dieses Dokument enthält die vollständige Änderungshistorie, die zuvor in der `README.md` stand.

## 🧾 Bisher programmiert

### 17.02.2026 - Plattformabgleich + Session/User Stabilitätsfix

*   **README gegen Live-Plattform abgeglichen:**
    *   Feature-Übersicht, Projektstruktur und Tech-Stack auf den aktuellen Zustand aktualisiert.
    *   Veraltete Doku-Referenzen (`ROADMAP.md`, `CLAUDE.md`) entfernt und durch vorhandene Dokus ersetzt.
*   **Session/User Fix für API-404-Kette:**
    *   Neue Utility `lib/session-user.ts` erstellt Session-User bei Bedarf automatisch in der DB.
    *   Betroffene Endpoints stabilisiert: `/api/me`, `/api/messages/unread`, `/api/forum/like`.
    *   Credentials-Login mappt jetzt auf echte DB-User-ID (statt rein virtueller Session-ID).
*   **Login UX präzisiert:**
    *   Caseworker-Username-Feld ist beim Öffnen leer, kein voreingetragener Organisationsname mehr.
*   **Landing-Kommunikation erweitert:**
    *   WMS im Services-Bereich und in Pricing-Features ergänzt.
    *   Eigener Service-Block `Warehouse Management (WMS)` inkl. Dropshipping-Bezug ergänzt.

### 14.02.2026 - Closed Beta Login Lockdown (inkl. Rollback-Guide)

*   **Ziel:** Öffentlichen Zugang vollständig schließen, damit niemand direkt per Login in die Plattform kommt.
*   **Serverseitige Sperre (entscheidend):**
    *   `auth.ts`: Sign-in wird in Closed Beta blockiert und auf `/login?error=BetaAccess` umgeleitet.
    *   `auth.ts`: Magic-Link Versand wird bei geschlossener Beta direkt abgewiesen.
    *   `lib/beta-access.server.ts`: zentrale Allowlist-Prüfung über `BETA_LOGIN_ALLOWLIST`, plus Admin-Allowlist über `ADMIN_EMAIL`/`ADMIN_EMAILS`.
*   **UI-Sperre + Tooltip-Hinweise:**
    *   Neuer reusable UI-Baustein: `components/ui/BetaLoginButton.tsx`.
    *   Login-CTAs ersetzt durch deaktivierte Buttons mit Tooltip + Bewerbungs-Mail:
        *   `components/Header.tsx`
        *   `components/landing/kimi/Header.tsx`
        *   `components/landing/kimi/B2BSourcing.tsx`
        *   `components/landing/kimi/Pricing.tsx`
        *   `components/ui/ResponsiveHeroBanner.tsx`
    *   Login/Signup-Views auf Closed-Beta-Messaging umgestellt:
        *   `components/auth/LoginPage.tsx`
        *   `components/auth/LoginFormInline.tsx`
        *   `components/landing/kimi/SignupCard.tsx`
*   **Neue zentrale Beta-Helper:**
    *   `lib/beta-access.ts`
    *   `lib/beta-access.server.ts`
*   **Env Sync Script erweitert:**
    *   `scripts/ops/sync-env-to-vercel.sh` kennt jetzt auch:
        *   `PUBLIC_LOGIN_ENABLED`
        *   `NEXT_PUBLIC_PUBLIC_LOGIN_ENABLED`
        *   `BETA_LOGIN_ALLOWLIST`
        *   `NEXT_PUBLIC_BETA_APPLICATION_EMAIL`

#### Rollback (wenn Login wieder geöffnet werden soll)

1. Setze in Vercel (Production, Preview, Development):
   * `PUBLIC_LOGIN_ENABLED=1`
   * `NEXT_PUBLIC_PUBLIC_LOGIN_ENABLED=1`
2. Optional eingeschränkt öffnen:
   * `PUBLIC_LOGIN_ENABLED=0`
   * `NEXT_PUBLIC_PUBLIC_LOGIN_ENABLED=0`
   * `BETA_LOGIN_ALLOWLIST="user1@domain.com,user2@domain.com"`
3. Optional interne Zugänge (Admin/Sachbearbeiter):
   * `ADMIN_EMAIL="admin@domain.com"`
   * `ADMIN_EMAILS="admin@domain.com,ops@domain.com"`
4. Nach Env-Änderungen neu deployen:
   * `vercel deploy --prod`

#### Zustand am 14.02.2026 (live gesetzt)

*   `PUBLIC_LOGIN_ENABLED=0`
*   `NEXT_PUBLIC_PUBLIC_LOGIN_ENABLED=0`
*   `NEXT_PUBLIC_BETA_APPLICATION_EMAIL=info@stakeandscale.de`
*   `BETA_LOGIN_ALLOWLIST` leer (damit ist Login für alle gesperrt)

### 07.02.2026 - Personal Studio + Billing v2 + Prompt Workbench

*   **Personal Studio (global, venture-unabhängig):**
    *   Neue Route: `/studio` → redirect auf persönliches Marketing-Studio.
    *   `Venture.isPersonalStudio` Flag eingeführt (inkl. Unique-Index pro Owner).
    *   Legacy-Fallback aktiv: alte Personal-Studio-Ventures mit Description-Marker werden auf das Flag migriert/hochgezogen.
    *   Filter in Chat/Communication/API-Keys/Venture-Listen auf `isPersonalStudio: false` vereinheitlicht.
*   **Billing v2 (transparent):**
    *   Neue Usage-Aufschlüsselung: Provider Cost, Platform Fee, Total.
    *   Billing-Endpoints erweitert (`/api/billing/summary`, `/api/billing/usage`).
    *   Stripe Checkout/Webhook erweitert für Subscription + Credit-Purchases.
*   **3D Camera Prompt Workbench (Marketing → Prompts):**
    *   Interaktive 3D-Kamerasteuerung (Distance/Yaw/Pitch/Roll/FOV).
    *   Modell-spezifische Prompt-Optimierung (Veo 3.1, Kling 2.6, Sora 2, Generic).
    *   Copy-ready Prompt + direkte Übergabe in den Generator (`Use in Generator`).
*   **Security-Hardening:**
    *   API-Key-Leak in `generate_veo_video.py` Logging entfernt.


### 05.02.2026 - Trend Hunter & Niche Validation (Sourcing)

*   **TrendReport System (DB + RLS):**
    *   Neues Modell `TrendReport` (Venture-gebunden, JSON-Resultate)
    *   Migration: `migrations/012b_add_trend_hunter.sql`
    *   RLS Policies: `migrations/014_add_trend_report_rls.sql`
*   **AI Trend Hunter Agent (Backend):**
    *   `lib/trend-hunter.ts` generiert Suchqueries aus Brand DNA (Kategorie, Zielgruppe)
    *   Brave Search (TikTok, Amazon, Google Trends) + LLM-Analyse (Gemini/Kimi)
    *   Output: 3 konkrete „Money Maker“ Chancen inkl. Match Score & Reasoning
*   **API Endpoints:**
    *   `GET /api/ventures/[id]/trends` → letzte Reports
    *   `POST /api/ventures/[id]/trends/generate` → neuer Scan (Energy: **10 Credits**)
*   **UI Integration (Sourcing Studio):**
    *   `TrendRadar` Tab mit Scan-Button, Ergebnis-Cards, Quellen & Quick-Links

### 04.02.2026 - AI Action Framework + Erweiterte Orion-Fähigkeiten

*   **AI Action Framework (Confirmation Flow):**
    *   Neue `AiAction` Tabelle inkl. RLS + Confirmation Tokens
    *   Jede Aktion ist jetzt „ask → confirm → execute“
    *   Founder-Only Gate für alle Actions
    *   Migration: `migrations/012_add_ai_actions.sql`
*   **Erweiterte Orion Tools (Produktionsreif):**
    *   Create Venture (inkl. Phasen-Setup)
    *   Account & Settings: Profil-Updates, Notification/Privacy Prefs, Tour-Flags
    *   API Keys: Create/Rotate/Deactivate/List
    *   Integrations: Connect/Disconnect (Notion/Slack OAuth, DocuSign vorbereitet)
    *   Billing: Status, Portal, Kündigung, Checkout, Rechnungen
    *   Venture Ops: Venture-Update, Task-Updates, Steps, Roadmap Items/Votes, Decisions
    *   Marketing: Content, Campaigns, Posts
    *   Legal: Documents, Contract-Scan speichern, Signatur-Link
    *   Sourcing: Suppliers, Samples, Production Orders
*   **Gemini Tool Fix:**
    *   `allowed_function_names` nur bei `mode: ANY` → in `AUTO` entfernt
*   **Forge Lab Verbesserungen (Marketing Studio):**
    *   Frontend: Pflichtfelder, Zahlen-Inputs, Placeholder/Required-Flags, Validierung für Input-IDs
    *   Besseres Default-App-Template (inkl. passendem Standard-Input)
    *   Runner blockt fehlende Pflichtfelder + klare Hinweise
    *   Backend: Zod-Validierung + Input-Constraints, Allowed Models/Tools
    *   Zugriffsschutz auf Venture-Ebene für ForgeApps (Owner/Squad)
    *   Shared Schemas in `lib/forge-lab.ts`
*   **AI Confirmation Flow Robustheit:**
    *   Serverseitige Bestätigung/Abbruch bei "Ja/Nein" inkl. Auswahl mehrerer Pending Actions
    *   Founder-Erkennung erweitert (FOUNDER/ADMIN/founderNumber/ADMIN_EMAIL)

### 04.02.2026 - AI Memory & Persistent Chat System

*   **AI Long-Term Memory (Jarvis Mode):**
    *   Neue `UserMemory` Tabelle für persistente Speicherung von User-Präferenzen, Zielen und Fakten
    *   Orion kann sich jetzt wichtige Informationen merken ("merk dir das...")
    *   Kategorien: GOAL, PREFERENCE, FACT, DECISION, OTHER
    *   Automatische Injektion in AI-Kontext bei jedem Chat

*   **Persistent AI Chat Threads:**
    *   Neue Tables: `AiChatThread` + `AiChatMessage` (mit RLS)
    *   Communication Page speichert jetzt komplette Konversationen
    *   Thread-basierte Navigation mit Sidebar
    *   Auto-Titel-Generierung aus erstem User-Prompt
    *   Migration: `migrations/011_add_ai_chat_history.sql`

*   **Orion Tool System (Function Calling):**
    *   Zentrale Tool-Registry in `lib/orion-tools.ts`
    *   Gemini Multi-Turn Loop mit Auto-Fallback in `lib/gemini-tools.ts`
    *   Verfügbare Tools:
        *   `store_user_memory` - Speichert User-Erinnerungen
        *   `search_user_memory` - Durchsucht Memory-Datenbank
        *   `create_task` - Erstellt Venture-Tasks
    *   Dual-API Support: Gemini REST API + AI SDK v6

*   **Landing Page Refinements:**
    *   Neue `royal` Color (`#2D59FF`) in Tailwind Config
    *   Pricing Table Redesign mit Hero-Gradient
    *   Testimonials Section mit Avatar-Grid
    *   CTA Buttons mit Glow-Effects

*   **Build-Fix:**
    *   Type-Safety für Gemini Tool Calls (GeminiContent type)
    *   AI SDK v6 Migration (`inputSchema` statt `parameters`)

### Früher

*   **AI Influencer Suite (Marketing):**
    *   Neues **AI Influencer Studio** (Lip‑Sync): `/forge/[ventureId]/marketing/lipsync`
    *   **Character DNA Extractor**: Portrait → Gemini Vision → Prompt in BrandDNA gespeichert (`character_prompt`)
    *   **Character DNA Toggle** im Media Generator: Prompt wird automatisch in die Media‑Prompts injected
    *   Neue API Routes:
        *   `/api/ventures/[id]/marketing/lipsync`
        *   `/api/ventures/[id]/marketing/character-dna`
    *   **Credits & Limits**: Energy System + Hourly Quota integriert
    *   **SQL Migration:**
        ```sql
        ALTER TABLE "BrandDNA" ADD COLUMN IF NOT EXISTS "character_prompt" TEXT;
        ```

*   **Notion Integration (Phase 2 Complete):** OAuth-basierter Export von Brand DNA und Roadmap zu Notion
    *   Neue API Routes: `/api/integrations/notion/search`, `/api/integrations/notion/pages`, `/api/integrations/notion/databases`
    *   UI Komponenten: `NotionExportButton` und `NotionSyncDialog` in Venture Detail Pages
    *   AES-256-GCM Verschlüsselung für OAuth Tokens mit Version-Support
    *   Datenbank-Schema: `IntegrationConnection`, `IntegrationSyncLog` mit RLS Policies
    *   Export Features: Brand DNA → Notion Page, Roadmap → Notion Database
*   **AI Sourcing (DB-only):** "AI Discovery" liefert jetzt nur echte Treffer aus der `Resource`-Datenbank inklusive Matching-Erklaerung.
*   **Sourcing Match UI:** Modaltexte angepasst (DB-Matching statt Gemini-Halluzinationen).
*   **AI Communication Page:** Neue `/communication` Seite als zentrale Chat-UI (Gemini aktiv, eigene API disabled).
    *   **Attachments aktiv:** Bilder & PDFs können hochgeladen werden (`/api/chat/upload`).
    *   **Bildanalyse:** Gemini extrahiert Prompt/Style aus Bildern und liefert einen Generations‑Prompt.
    *   **PDF‑Summaries:** PDFs werden serverseitig zusammengefasst und als Kontext injiziert.
    *   **Routing:** Chat‑Modus → `/api/chat/contextual`, Research‑Modi → `/api/research`.
*   **Orion Tooling (Function Calling):** Zentrale Tool‑Registry + Gemini Tool‑Loop, identisch für `/api/chat/contextual` und `/api/communication/chat`.
    *   Tools: Tasks, UserMemory, Supplier‑Suche, Legal Drafts, Marketing‑Kampagnen.
    *   Shared Registry: `lib/orion-tools.ts`, Gemini Loop: `lib/gemini-tools.ts`.
    *   Legacy `/api/chat` nutzt jetzt die gleiche Tool‑Registry.
*   **Music & Sounds Studio (Soundstripe):**
    *   **UI:** `/forge/[ventureId]/music` (Songs + Sound Effects, Suche + Preview).
    *   **API Proxy:** `/api/ventures/[id]/music/soundstripe` (query + paging).
    *   **CSP Update:** `media-src` erlaubt `https://cdn.soundstripe.com` für Audio‑Previews.
*   **B2B Kategorien (Landing):**
    *   Rotierendes Bild‑Loop ersetzt durch **Full‑Screen Scroll FX** (Kategorien klickbar, normales Durchscrollen ohne Pinning).
    *   Kategorien sind scroll‑navigierbar, mobile‑optimiert.
*   **One‑Click Inspiration (Media Generator):**
    *   Presets für **TikTok/Reels**, **Website Hero**, **Cinematic Film**.
    *   Klick setzt Mode, Veo‑Model, Aspect Ratio, Duration + Marketing‑Prompt.
*   **UI Sound FX:** GTA-Menu-Sound bei Forum-Post und Message-Send (nur bei Erfolg).
*   **Static Asset:** Sound liegt jetzt unter `public/audio/gta-menu.mp3`.
*   **Account Settings:** Neue `/settings`‑Seite mit Notification‑Prefs, Privacy‑Prefs und sofortiger Account‑Löschung (mit Sicherheitsarchiv).
*   **Deletion Flow:** `AccountStatus` + Tombstone/Anonymisierung, Sign‑In Lockout, Retention in `UserDeletion`.
*   **DM‑Moderation:** Nachrichten werden wie Forum‑Posts moderiert (Toxicity‑Check + Warnung), Fehler wird im UI gezeigt.
*   **Privacy Controls:** Profil‑Sichtbarkeit und Follower‑Counts serverseitig enforced.
*   **Forum Mobile Revamp:** Reddit‑like Card‑Style, kompakte Actions, fixes für Editor‑Modal, Emoji‑Picker und Toolbar‑Breiten.
*   **Mobile Navigation:** Header/Tab‑Bar, Account‑Eintrag im Hamburger‑Menü, Hub‑Badge entfernt.

---

## 🤖 Context-Aware AI Sidebar
... (bestehender Teil) ...

The Forge includes a persistent AI assistant that adapts to what the user is currently doing.

### How to use it for future features:
To add AI support to any new page or modal, simply:

1. **Import the Context**:
   ```tsx
   import { useAIContext } from '@/app/context/AIContext';
   ```

2. **Set the Context**:
   Inside your component or modal, use a `useEffect` to update the AI's focus:
   ```tsx
   const { setContext } = useAIContext();

   useEffect(() => {
     setContext("Erstelle gerade ein Sourcing-Sample. Hilf dem User bei Qualitätsmerkmalen.");
     
     // Optional: reset when leaving
     return () => setContext("Forge Dashboard");
   }, []);
   ```

3. **Profit**:
   The AI Sidebar will instantly adapt to that new context and provide relevant advice based on the user's current page and your description. 🚀

---

## 🎨 AI Media Models & API Integration

### Model Registry (`lib/media-models.ts`)

The platform integrates multiple AI providers for media generation. All models are centrally managed in the model registry:

| Category | Model | Provider | Cost | Status |
|----------|-------|----------|------|--------|
| **Image Generation** |
| Forum/Speed | flux-schnell | Replicate | 2 | ✅ |
| Studio Pro | flux-1.1-pro | Replicate | 15 | ✅ |
| Studio Pro | flux-2-pro | Replicate | 25 | ✅ |
| **Video Generation** |
| Cinema | kling-v2.6 | Replicate | 55 | ✅ |
| Flagship | sora-2 | Replicate | 60 | ✅ |
| Enterprise | veo-3.1 | Replicate | 58 | ✅ |
| Human Motion | minimax-video-01 | Replicate | 45 | ✅ |
| Atmospheric | luma-dream-machine | Replicate | 40 | ✅ |
| Legacy | kling-v1.5-pro | Replicate | 50 | ✅ |
| **Face & Body Animation** |
| Face Swap Pro | live-portrait | Replicate | 65 | ✅ |
| Face Swap Alt | lucataco-faceswap | Replicate | 50 | ✅ |
| Face Swap Alt 2 | codeplugtech-faceswap | Replicate | 45 | ✅ |
| **Full Body Motion** | ⭐ **NEW** (04.02.2026) |
| Motion Transfer | wan-2.2-animate | Replicate | 50 | ✅ |
| **Audio & Lip Sync** |
| Lip Sync Preview | sync/lipsync-2 | Replicate | 18 | ✅ |
| Lip Sync Final | sync/lipsync-2-pro | Replicate | 45 | ✅ |

### API Routes & Frontend Integration

| Route | Feature | Frontend Component | Status |
|-------|---------|-------------------|--------|
| `/api/ventures/[id]/marketing/media` | Image/Video Generation | VeoStudio, MediaGeneratorModal | ✅ |
| `/api/ventures/[id]/marketing/faceswap` | Face Swap & Avatar | AvatarStudio | ✅ |
| `/api/ventures/[id]/marketing/lipsync` | Lip Sync | AvatarStudio | ✅ |
| `/api/ventures/[id]/marketing/motion-transfer` | **Full Body Motion Transfer** ⭐ | **AvatarStudio** | ✅ **NEW** |
| `/api/ventures/[id]/marketing/nano-banana` | Image Blending | NanoBananaStudio | ✅ |
| `/api/ventures/[id]/marketing/media/stitch` | Video Stitching | VeoStudio | ❌ deaktiviert |
| `/api/ventures/[id]/marketing/tools/rembg` | Background Removal | VeoStudio | ✅ |
| `/api/webhooks/replicate` | Webhook Handler (All Models) | - | ✅ |

### Wan 2.2 Animate - Full Body Motion Transfer (NEW)

**Feature:** Transfer full body motion from your driving video to any character image.

**Use Case:** Upload a video of yourself dancing/moving + an AI-generated character image → the character performs your exact movements.

**Implementation:**
- Model Registry: `MOTION_TRANSFER_MODELS['wan-2.2-animate']`
- API Route: `/api/ventures/[id]/marketing/motion-transfer/route.ts`
- Webhook Handler: Extended to process motion transfer jobs
- Frontend: `AvatarStudio.tsx` (Ganzkörper Studio section)

**Technical Details:**
- Input: Driving video (MP4/MOV, max 100MB) + Character image (JPG/PNG, max 10MB)
- Resolution: 480p or 720p
- Max Duration: 120 seconds
- Audio: Merged from driving video
- Processing Time: 2-5 minutes (async via Replicate webhooks)

**Cost:** 50 credits per generation

---

### Voraussetzungen
- Node.js 18+ & npm
- PostgreSQL-Datenbank (empfohlen: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres))
- Gemini API Key ([Google AI Studio](https://aistudio.google.com/))
- Soundstripe API Key (für Music & Sounds Studio)

### Installation

```bash
# Repository klonen
git clone <repo-url>
cd the-forge-community

# Dependencies installieren
npm install

# Umgebungsvariablen einrichten
# Es gibt aktuell keine .env.example im Repo.
# Erstelle .env.local manuell und nutze den ENV-Block unten als Vorlage.

# Music & Sounds (Soundstripe)
# SOUNDSTRIPE_API_KEY="ss_xxx"
# SOUNDSTRIPE_API_URL="https://api.soundstripe.com/v1"

# Datenbank-Schema anwenden
npx prisma generate
npx prisma db push

# Development Server starten
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

---

## 🏗️ Core Engine & Professional Architecture (Updated Jan 2026)

Das Projekt wurde auf eine professionelle **Multi-Tenant Architektur** für skalierbare Venture-Entwicklung gehoben:

### 1. Venture Phase Engine (Automatisierter Workflow)
*   **Logik:** Ein zentraler Service (`lib/ventures.ts`) steuert den Fortschritt über 6 Phasen (Ideation → Branding → Legal → Sourcing → Marketing → Launch).
*   **Trigger:** Jede Aktion in den Studios (z.B. Brand DNA Speicherung, Lieferant-Übernahme) triggert automatisch eine Neuberechnung des Projektstatus.
*   **Personalisiert:** Fortschritt und Berechtigungen sind strikt an `ownerId` oder `squadId` gekoppelt.

### 2. AI Sourcing Agent (Enterprise Level)
*   **Discovery:** Neuer "AI Discovery" Button im Sourcing Studio.
*   **Kontext:** Nutzt die **Brand DNA** (Kategorie, Zielmarkt, Werte), um per Gemini Flash 2.0 gezielt Lieferanten weltweit zu identifizieren.
*   **UX:** Modulares UI-Modal zur Prüfung und selektiven Übernahme von KI-Vorschlägen in die Datenbank.

### 3. Squad Safe (Financial Transparency)
*   **Wallet:** Integriertes `SquadWallet` System für jede Gruppe.
*   **Transparency:** Neues Dashboard zeigt Budget-Verteilung (Samples, Produktion, Marketing) und eine lückenlose Transaktionshistorie mit Klarnamen der Ersteller.
*   **Stripe Ready:** Vorbereitet für Einzahlungen direkt auf Squad-Connected-Accounts.

### 4. Technical Excellence
*   **Prisma 7 Migration:** Schema bereinigt, `DATABASE_URL` Management über `prisma.config.ts` (Next-Gen Standard).
*   **TypeScript Mastery:** Vollständige Umstellung auf CamelCase, typsichere API-Routen über Prisma-Relationen statt SQL.
*   **Stability:** Build-geprüfte Codebase mit robusten Error-Boundaries und expliziten Interfaces.

---

## 🧠 AI Engineering Highlights (Code-verified)

- **Tool Calling + Agent Guardrails:** Gemini Function Calling mit mehrstufiger Tool-Schleife, Confirmation Tokens und Founder-Gate (`lib/gemini-tools.ts`, `lib/orion-tools.ts`, `app/api/chat/route.ts`).
- **Retrieval-Grounding für Legal-Generation:** Syncbarer Rechtskorpus mit Ranking, Zitaten und Prompt-Grounding (`lib/legal-corpus.ts`, `app/api/ventures/[id]/legal/route.ts`, `lib/ai-legal.ts`).
- **Prompt Ops in Produktion:** Starke Systemprompts plus deterministische Output-Normalisierung mit Repair-Pass (`app/api/ventures/[id]/marketing/ai-influencer-prompts/route.ts`).
- **Usage & Cost Observability:** Reserve/Settle/Refund-Pattern, Token-/Kosten-Erfassung und API-Usage-Stats (`lib/energy.ts`, `app/api/keys/[id]/stats/route.ts`, `app/api/billing/usage/route.ts`).
- **AI Smoke-Test-Suiten:** Getrennte Flows für Image, Video, Effects und Warehouse-APIs (`scripts/smoke-tests/README.md`, `package.json`).

---
