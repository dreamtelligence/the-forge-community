# 🔌 Third-Party Integrations

**Enterprise Connectors für The Forge Platform**

Dieses Dokument beschreibt implementierte und geplante Integrationen mit externen Diensten.

---

## ✅ Notion Integration (IMPLEMENTED)

**Status:** ✅ Live in Production  
**Version:** 1.0.0  
**Last Updated:** 2026-02-01

### Warum Notion?
Das "Community Brain" in The Forge ist gut, aber Notion ist der **de-facto Standard** für Startup-Dokumentation. Ventures nutzen Notion bereits für Wikis, Roadmaps und Meeting Notes.

### Use Cases

#### 1. Brand DNA → Notion Sync
**Workflow:**
```
User klickt "Sync to Notion" in Brand DNA
↓
The Forge erstellt/updated eine Notion Page
↓
Strukturierte Brand Guidelines (Mission, Values, Tone of Voice)
↓
Link wird in The Forge gespeichert für schnellen Zugriff
```

**Value:** Kein doppeltes Pflegen. Änderungen in Brand DNA können optional auto-syncen.

#### 2. Roadmap → Notion Database
**Workflow:**
```
Venture Roadmap (Tasks, Milestones, Deadlines)
↓
Sync als Notion Database mit Status-Tracking
↓
Team arbeitet in Notion, Fortschritt synct zurück zu The Forge
```

**Value:** Entwickler/Designer arbeiten in Notion, Founder behält Überblick in The Forge.

#### 3. Entscheidungen → Notion Wiki
**Workflow:**
```
Decision wird in The Forge getroffen (Vote abgeschlossen)
↓
Auto-Export als formatierter Eintrag ins Notion Wiki
↓
Inkl. Kontext: Wer hat abgestimmt, Warum, Alternativen
```

**Value:** Compliance & Audit-Trail in vertrautem Notion-Format.

### Implementierung

**API Routes:**
```
/api/integrations                    # CRUD für Connections
/api/integrations/notion/callback    # OAuth Callback
/api/integrations/notion/search      # Pages/Databases suchen
/api/integrations/notion/pages       # Brand DNA → Notion Page
/api/integrations/notion/databases   # Roadmap → Notion Database
```

**Service Layer:**
```typescript
// lib/integrations/notion/service.ts
export async function syncBrandDNAToNotion(
  accessToken: string,
  ventureId: string,
  parentPageId: string
): Promise<NotionSyncResult>

export async function syncRoadmapToNotion(
  accessToken: string,
  databaseId: string,
  ventureId: string,
  userId: string
): Promise<{ tasksCreated: number; databaseUrl: string }>

export async function searchNotionPages(
  accessToken: string,
  query: string
): Promise<SearchResult[]>
```

**Auth Flow (OAuth 2.0):**
1. User klickt "Connect Notion" in Settings
2. Weiterleitung zu Notion OAuth mit PKCE
3. Callback tauscht Code gegen Access Token
4. Token wird AES-256-GCM verschlüsselt gespeichert
5. User kann jetzt Export durchführen

**Database Schema:**
```prisma
model IntegrationConnection {
  id            String   @id @default(cuid())
  userId        String
  provider      IntegrationProvider  // NOTION | DOCUSIGN
  status        IntegrationStatus    // PENDING | CONNECTED | ERROR
  accessToken   String               // Encrypted
  refreshToken  String?              // Encrypted
  expiresAt     DateTime?
  workspaceName String?
  workspaceId   String?
}

model IntegrationSyncLog {
  id           String        @id @default(cuid())
  connectionId String
  resourceType String        // "brand-dna", "roadmap"
  resourceId   String
  externalId   String        // Notion Page/Database ID
  externalUrl  String?
  direction    SyncDirection // TO_EXTERNAL
  status       SyncStatus    // SUCCESS | FAILED
  error        String?
}
```

**UI Components:**
```tsx
// components/notion/notion-export-button.tsx
<NotionExportButton ventureId={id} ventureName={name} />

// components/notion/notion-sync-dialog.tsx
<NotionSyncDialog />  // Tabs: Brand DNA | Roadmap
```

**Sicherheit:**
- OAuth Tokens werden mit AES-256-GCM verschlüsselt
- `INTEGRATION_ENCRYPTION_KEY` Environment Variable erforderlich
- Token-Versionierung für Key Rotation möglich
- RLS Policies schützen Verbindungen pro User

---

## ✅ Slack Integration (IMPLEMENTED)

**Status:** ✅ Live in Production  
**Version:** 1.0.0  
**Last Updated:** 2026-02-01

### Warum Slack?
Slack ist das **de-facto Standard** Kommunikationstool für Startups. Jeder Founder nutzt es für Team-Kommunikation. Automatische Notifications über Venture-Events direkt in Slack halten das Team synchron.

### Use Cases

#### 1. Venture Created Notification
**Workflow:**
```
Founder erstellt neues Venture in The Forge
↓
Slack Bot sendet Notification in #ventures Channel
↓
Team sieht sofort: Wer hat was gestartet
```

**Value:** Transparenz über neue Projekte im gesamten Team.

#### 2. Squad Member Joined
**Workflow:**
```
Neuer Member joined Squad
↓
Slack Notification mit Role & Venture
↓
Willkommens-Workflow wird getriggert
```

**Value:** Keine überraschenden neuen Team-Mitglieder mehr.

#### 3. Decision Alerts
**Workflow:**
```
Decision Voting schließt
↓
Slack Notification mit Ergebnis
↓
Alle wissen Bescheid, kein Micromanagement nötig
```

**Value:** Asynchrone Entscheidungsfindung dokumentiert.

#### 4. Task Completion
**Workflow:**
```
Roadmap Task wird erledigt
↓
Slack Notification: "✅ Task completed by @user"
↓
Venture Roadmap zeigt Fortschritt
```

**Value:** Sichtbarer Fortschritt motiviert das Team.

#### 5. Marketing Content Generated
**Workflow:**
```
AI generiert Bild/Video/Avatar
↓
Slack Notification mit Preview Link
↓
Team kann sofort Feedback geben
```

**Value:** Schneller Feedback-Loop für Marketing.

### Implementierung

**API Routes:**
```
/api/integrations/slack/auth           # OAuth Initiation
/api/integrations/slack/callback       # OAuth Callback
/api/integrations/slack/channels       # List channels/users
/api/integrations/slack/notify         # Send notifications
/api/integrations/slack/settings       # Get/Update settings
/api/integrations/slack/disconnect     # Disconnect workspace
/api/webhooks/slack                   # Event subscriptions (signature verified)
```

**Service Layer:**
```typescript
// lib/integrations/slack/service.ts
export async function exchangeSlackCode(code: string): Promise<SlackTokenResponse>
export async function listChannels(accessToken: string): Promise<SlackChannel[]>
export async function sendMessage(accessToken: string, notification: SlackNotification): Promise<SendResult>
export const SlackTemplates = { ventureCreated, squadMemberJoined, decisionMade, ... }
```

**UI Components:**
```tsx
// components/slack/slack-connect-button.tsx
<SlackConnectButton isConnected={true} workspaceName="MyTeam" />

// components/slack/slack-channel-select.tsx
<SlackChannelSelect onChange={(id, name) => ...} />

// components/slack/slack-settings-dialog.tsx
<SlackSettingsDialog ventureId={id} ventureName={name} />
```

**Environment Variables:**
```env
SLACK_CLIENT_ID="xxx.xxx"
SLACK_CLIENT_SECRET="xxx"
SLACK_SIGNING_SECRET="xxx"          # Required for event subscriptions
NEXT_PUBLIC_APP_URL="https://..."   # Must be https for Slack OAuth
```

**Scopes Required:**
- `chat:write` - Send messages
- `chat:write.public` - Send to public channels
- `channels:read` - List channels
- `groups:read` - List private channels
- `users:read` - Map users
- `team:read` - Get workspace info

---

## ✅ Priorität 3: DocuSign Integration (Live, Erweiterungen laufen)

### Warum DocuSign?
Euer **Legal Stack** ist ein USP. Die digitale Signatur ist live, jetzt geht es um Ausbau und Enterprise-Hardening.

### Use Cases

#### 1. Co-Founder Agreement Signing
**Workflow:**
```
Legal → Co-Founder Agreement generiert
↓
"Request Signatures" Button
↓
DocuSign Envelope wird erstellt
↓
Alle Squad-Member erhalten Signatur-Link per Email
↓
Signierte Version wird automatisch in The Forge archiviert
↓
Audit-Trail (Wer, Wann, IP) wird gespeichert
```

**Value:** Rechtssichere Unterschriften ohne externes Tool verlassen zu müssen.

#### 2. Supplier Contract Signing
**Workflow:**
```
Sourcing → Supplier Contract generiert (NDA, PO Agreement)
↓
An Supplier senden zur Unterschrift
↓
DocuSign Embedded Signing (Signatur direkt in The Forge)
↓
Beide Parteien signieren
↓
Vertrag wird automatisch mit Supplier verknüpft
```

**Value:** Schnellere Supplier Onboarding, rechtssichere Prozesse.

#### 3. Template-basierte Verträge
**Workflow:**
```
Legal Templates in The Forge (NDA, Service Agreement)
↓
Variables: {founder_name}, {company_name}, {date}
↓
Template wird mit Venture-Daten gefüllt
↓
Direkt an DocuSign gesendet
```

**Value:** Standardisierte Verträge in Sekunden, nicht Stunden.

### Technische Umsetzung

```typescript
// API Endpoint: /api/v1/integrations/docusign/send
{
  "templateId": string,           // DocuSign Template ID
  "documentType": "co-founder" | "supplier" | "nda",
  "signers": [
    {
      "email": string,
      "name": string,
      "role": "founder" | "supplier" | "witness"
    }
  ],
  "templateData": {
    "founder_name": string,
    "company_name": string,
    "venture_id": string
  }
}

// Response
{
  "envelopeId": string,
  "status": "sent",
  "signingUrl": string,  // Für Embedded Signing
  "expiresAt": Date
}
```

**Auth Flow:**
1. Org-Admin (oder Platform) verbindet DocuSign Account
2. The Forge nutzt DocuSign JWT Grant für API-Zugriff
3. Templates werden in DocuSign erstellt und IDs in The Forge gespeichert

**Database Erweiterung:**
```prisma
model DocuSignEnvelope {
  id              String   @id @default(cuid())
  userId          String
  ventureId       String?
  envelopeId      String   // DocuSign Envelope ID
  documentType    String
  status          String   // sent, delivered, completed, declined
  signers         Json     // [{email, name, status, signedAt}]
  signedDocumentUrl String?
  auditTrail      Json?
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}

model DocuSignConnection {
  id            String @id @default(cuid())
  userId        String @unique  // One DocuSign account per user (for now)
  accountId     String
  accessToken   String // Encrypted, JWT or OAuth
  baseUrl       String // DocuSign API base URL
}
```

**UI Placement:**
- Legal → Contracts: "Request Signatures" Button
- Venture → Squad Members: "Send Co-Founder Agreement"
- Sourcing → Supplier Detail: "Send NDA for Signature"

**Webhook Handling:**
```typescript
// DocuSign Connect Webhook
// POST /api/webhooks/docusign
{
  "event": "envelope-completed",
  "data": {
    "envelopeId": string,
    "status": "completed",
    "completedDateTime": string
  }
}
↓
The Forge updated den Vertrag-Status
↓
Notification an alle Beteiligten
↓
Signed PDF wird heruntergeladen & gespeichert
```

---

## 🔄 Implementierungsreihenfolge

### Phase 1: Foundation ✅ COMPLETE
- [x] Database Schema für Integrationen erstellen
- [x] OAuth Handler für Notion & DocuSign (vorbereitet)
- [x] Verschlüsselung für Access Tokens implementieren (AES-256-GCM)
- [x] Settings UI für Integration Connections

### Phase 2: Notion ✅ COMPLETE
- [x] Brand DNA → Notion Sync
- [x] Roadmap → Notion Database Sync
- [x] Notion OAuth Flow
- [x] UI Buttons in Venture Detail Pages
- [x] Search Pages/Databases API
- [x] Test mit echten Notion Workspaces

### Phase 3: DocuSign Hardening (ONGOING)
- [ ] DocuSign JWT Auth erweitern/härten
- [ ] Template Management System ausbauen
- [ ] Co-Founder Agreement Flow verbessern
- [ ] Webhook Handling für Status Updates erweitern
- [ ] Supplier Contract Signing erweitern

### Phase 4: Polish (Woche 6)
- [ ] Error Handling & Retry Logic
- [ ] Audit Logging für alle Integrationen
- [ ] Dokumentation für End-User
- [ ] E2E Tests

---

## 🏗️ Architektur-Pattern

### Integration Service Layer
```typescript
// lib/integrations/notion/service.ts
export class NotionService {
  async syncBrandDNA(ventureId: string, notionPageId?: string)
  async syncRoadmap(ventureId: string)
  async getConnection(userId: string): Promise<NotionConnection | null>
}

// lib/integrations/docusign/service.ts
export class DocuSignService {
  async createEnvelope(params: CreateEnvelopeParams)
  async getSigningUrl(envelopeId: string, signerEmail: string)
  async handleWebhook(event: DocuSignEvent)
}
```

### Common Integration Interface
```typescript
interface Integration {
  id: string
  name: string
  provider: "notion" | "docusign" | "slack" | ...
  status: "connected" | "disconnected" | "error"
  connect(): Promise<void>
  disconnect(): Promise<void>
  sync(resource: string, data: any): Promise<void>
}
```

---

## 💰 Monetarisierung

**Freemium:**
- Notion Sync: Basis-Sync kostenlos
- DocuSign: 3 kostenlose Signaturen/Monat, danach Credits

**Pro Features:**
- Bidirektionaler Sync (Notion ↔ The Forge)
- Custom Templates (DocuSign)
- Bulk Signing
- Advanced Analytics

---

## 📊 Erwartete Impact

| Integration | User Benefit | Retention Impact | Dev Effort |
|-------------|--------------|------------------|------------|
| Notion | Dokumentation wo User sie nutzen | +15% | Medium |
| DocuSign | Rechtssicherheit ohne Friction | +25% | High |

---

**Last Updated:** 2026-02-01
**Status:** Notion Live, DocuSign Live (Hardening/Erweiterung aktiv)
**Owner:** Engineering Team
