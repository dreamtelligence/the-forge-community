# THE FORGE COMMUNITY - Comprehensive Project Overview

**Date:** February 4, 2026  
**Project:** The Forge (STAKE & SCALE) - AI-Powered SaaS Operating System for Solo Founders  
**Stack:** Next.js 16, TypeScript, Prisma 7.2, PostgreSQL, TailwindCSS  
**Status:** Active Development (Production)

---

## 1. PROJECT OVERVIEW

### What is The Forge?

The Forge is a **KI-gestützte SaaS-Betriebssystem** (AI-powered SaaS operating system) designed to help solo founders build scalable ventures collaboratively. It's part of the **STAKE & SCALE** platform and emphasizes:

- **Community-driven venture building** (Squad-based collaboration)
- **AI-assisted content & legal generation**
- **Real-time collaboration** (Forum, messaging, decision voting)
- **Venture lifecycle management** (Ideation → Launch → Growth)
- **Freemium + Energy Credit System** for monetization

### Core Philosophy
- **Product-Led Growth:** Open access with magic-link signup
- **AI-First:** Every workflow augmented with Gemini, Groq, or Kimi
- **Creator-Friendly:** TikTok-ready export, Media Studio, Character DNA
- **Founder-Centric:** Not for VCs—for indie founders building together

---

## 2. CURRENT AI MODEL USAGE

### Text Generation (LLM Stack)

**Primary: Kimi K2.5 (Moonshot AI)** → Fallback to Gemini 2.0 Flash → Fallback to Groq Llama 3.3 70B

```typescript
// lib/ai.ts - Main AI Helper
callAI() → callKimi() → callGemini() → callGroq()
```

**Key Models:**
- **Kimi K2.5** (Moonshot): Primary for multimodal support (images + video)
- **Gemini 2.0 Flash / 2.5 Flash / 3 Pro**: Fallback LLM
- **Groq Llama 3.1 70B Versatile**: Final fallback (fastest/cheapest)

**Use Cases:**
- Chat/Orion Jarvis assistant (`/api/chat/route.ts`)
- Forum AI actions (summarize, feedback, fact-check)
- Marketing content generation
- Legal document drafting
- Research summaries

---

### Image Generation (Media Studio)

**Provider:** Replicate (webhook-based async architecture)

**Available Models:**

| Model | Provider | Tier | Cost | Use Case |
|-------|----------|------|------|----------|
| **Flux Schnell** | Replicate | Turbo | 2 credits | Forum quick images |
| **Flux 1.1 Pro** | Replicate | Pro | 15 credits | Marketing standard |
| **Flux 2 Pro** | Replicate | Pro | 25 credits | Photorealism |

**Endpoint:** `POST /api/v1/media/generate-image`

**Flow:**
1. User submits prompt
2. AI Prompt Engine expands via Gemini/Groq
3. Reserved credits via Energy system
4. Replicate async prediction created
5. Webhook `/api/webhooks/replicate` handles completion
6. Asset saved to Vercel Blob storage
7. Credits settled (with refunds on failure)

---

### Video Generation (Marketing Studio)

**Provider:** Replicate  
**Architecture:** Async via webhooks with job caching

**Available Models:**

| Model | Provider | Cost | Duration | Features |
|-------|----------|------|----------|----------|
| **Kling 2.6** | Replicate | $0.14/sec | 5-60s | Cinema + audio |
| **Sora 2** | Replicate | $0.20/sec | 5-60s | Flagship AI |
| **Veo 3.1** (Google) | Replicate | $0.40/sec | 5-60s | Context-aware audio |
| **Minimax Video 01** | Replicate | $0.12/sec | 5-60s | Human motion |
| **Luma Dream Machine** | Replicate | $0.10/sec | 5-60s | Atmospheric |

**Endpoint:** `POST /api/ventures/[id]/marketing/media`

**Cost Calculation:**
```typescript
costEUR = durationSeconds * usdPerSecond * USD_EUR_RATE
credits = calculateCreditsFromEur(costEUR) * CREDIT_MARGIN
```

---

### Face Swap & Avatar Generation

**Provider:** Replicate  
**Architecture:** Async with system cache for job state

**Models:**

| Model | Cost | Use Case |
|-------|------|----------|
| **Roop Face Swap** | 50 credits | Video face replacement |
| **CodePlug Face Swap** | 45 credits | Fast iterations |
| **Live Portrait** | 65 credits | Character animation |

**Endpoint:** `POST /api/ventures/[id]/marketing/faceswap`

**Monthly Quota:**
- Free tier: 3 avatar swaps/month
- Paid tier: 200 avatar swaps/month

---

### Lip Sync & Motion Transfer

**Provider:** Replicate

**Models:**

| Model | Cost | Input | Purpose |
|-------|------|-------|---------|
| **Lip Sync Preview** | 18 credits | video+audio | Fast preview |
| **Lip Sync Final** | 45 credits | video+audio | Studio quality |
| **Wan 2.2 Animate** | 50 credits | video+image | Full-body motion |

**Endpoint:** `POST /api/ventures/[id]/marketing/lipsync`

---

## 3. CURRENT INFRASTRUCTURE

### AI Provider Configuration

**Environment Variables:**
```env
# Text Generation
GEMINI_API_KEY="xxx"
GEMINI_MODEL="gemini-2.0-flash"
GROQ_API_KEY="xxx"
MOONSHOT_API_KEY="xxx"  # Kimi K2.5

# Image/Video Generation
REPLICATE_API_TOKEN="r8_xxx"

# Character/Vision
GEMINI_CHARACTER_MODEL="gemini-2.0-flash"
```

### Replicate Webhook Architecture

```
User Request → Generate Job → Store in Cache → Replicate Async Job
                                                        ↓
                                                Webhook Callback
                                                        ↓
                                        Process Output → Vercel Blob
                                                        ↓
                                        Settle Energy → Create Asset
```

**Key Components:**
- **Job Cache:** `SystemCache` table for prediction state
- **Processing Lock:** Prevents duplicate output processing
- **Webhook Signature Verification:** HMAC-SHA256 validation
- **Output Normalization:** Handles array/single outputs
- **Error Refunds:** Auto-refund credits on failure

**Webhook Endpoint:** `POST /api/webhooks/replicate`

---

## 4. CREDIT & PRICING SYSTEM

### Energy Reserve Pattern

```typescript
// Every AI operation follows: Reserve → Generate → Settle
reserveEnergy() → [AI Generation] → settleEnergy()
                                  ↓
                            refundEnergy() on failure
```

**Credit Calculations:**

```typescript
// For Videos
estimateVideoCredits(durationSeconds, model, generateAudio)
→ costEUR = seconds * (usdPerSec * USD_EUR_RATE)
→ credits = ceil(costEUR * CREDIT_MARGIN / CREDIT_EUR_VALUE)

// For Text (ElevenLabs TTS)
estimateElevenLabsTtsCredits(textLength, model)
→ elevenCredits = textLength * perCharRate
→ costEUR = elevenCredits * (EUR_PER_1K / 1000)
→ credits = calculateCreditsFromEur(costEUR)

// For Images
Hardcoded: Flux Schnell=2, Flux Pro=15, Flux 2=25
```

### Pricing Configuration

```env
CREDIT_EUR_VALUE=0.0875        # Each credit = €0.0875
CREDIT_MARGIN=1.2              # 20% markup over cost
USD_EUR_RATE=1

# Video rates (overridable per model)
VIDEO_KWAIVGI_KLING_V2_6_AUDIO_USD_PER_SEC=0.14
VIDEO_KWAIVGI_KLING_V2_6_NO_AUDIO_USD_PER_SEC=0.07
VIDEO_GOOGLE_VEO_3_1_AUDIO_USD_PER_SEC=0.40
VIDEO_GOOGLE_VEO_3_1_NO_AUDIO_USD_PER_SEC=0.20
```

### Daily Quotas (Rate Limiting)

```typescript
DAILY_QUOTAS = {
  VOICE_FREE: 20,      IMAGE_FREE: 15,      VIDEO_FREE: 3,
  VOICE_PAID: 100,     IMAGE_PAID: 50,      VIDEO_PAID: 20
}

MONTHLY_QUOTAS = {
  AVATAR_FREE: 3,
  AVATAR_PAID: 200
}
```

### User Tier Detection

```typescript
getUserTier(userId) → 'free' | 'paid'

// Paid if:
// - subscriptionStatus === 'active|trialing' AND subscriptionTier === 'pro|enterprise'
// - role === 'ADMIN'
```

---

## 5. API ROUTES & ENDPOINTS

### Media Generation

```
POST   /api/v1/media/generate-image
       Request: { prompt, model, width?, height?, steps? }
       Response: { data: { url, creditsUsed }, meta: { requestId, responseTime } }
       Auth: API Key (bearer token) with scopes
       Rate Limit: 429 on quota exceed
       Credits: Estimated reservation → settle on completion

GET    /api/v1/media/generate-image/status/{predictionId}

POST   /api/ventures/[id]/marketing/media
       Request: { prompt, model, aspectRatio, count, mode }
       Response: { jobIds, estimatedCredits }
       Auth: Session (venture owner/squad member)

POST   /api/ventures/[id]/marketing/faceswap
       Request: { videoUrl, imageUrl, model }
       Response: { predictionId, estimatedCredits }

POST   /api/ventures/[id]/marketing/lipsync
       Request: { videoUrl, audioUrl, model }
       Response: { predictionId, estimatedCredits }

POST   /api/ventures/[id]/marketing/motion-transfer
       Request: { drivingVideoUrl, characterImageUrl }
       Response: { predictionId, estimatedCredits }
```

### Chat & AI

```
POST   /api/chat
       Streaming LLM response via AI SDK
       Auth: Session

POST   /api/chat/contextual
       Gemini multi-turn with tools via AI SDK
       Tools: store_memory, search_memory, create_task, etc.
       Auth: Session

GET    /api/research
       Web search + summarization

POST   /api/chat/upload
       Image/PDF attachment handling
       Returns: analysis + prompt suggestions
```

### Integrations

```
POST   /api/integrations/notion/callback       # OAuth callback
POST   /api/integrations/notion/pages          # Brand DNA → Notion
POST   /api/integrations/notion/databases      # Roadmap → Notion Database
GET    /api/integrations/notion/search         # Search pages/dbs

POST   /api/integrations/slack/auth            # OAuth initiation
POST   /api/integrations/slack/callback        # OAuth callback
POST   /api/integrations/slack/notify          # Send notifications
GET    /api/integrations/slack/channels        # List channels

POST   /api/integrations/docusign/send         # Create envelope (planned)
```

### Webhooks

```
POST   /api/webhooks/replicate
       Signature: HMAC-SHA256 verification
       Payload: Replicate prediction events (succeeded, failed, canceled)
       Logic: Extract output → Verify blob → Create asset → Settle energy

POST   /api/webhooks/slack
       Signature: Slack event signature verification
       Events: Venture creation, squad joins, decisions, etc.
```

---

## 6. DATABASE SCHEMA (Key Tables)

### Energy & Credits

```prisma
model EnergyTransaction {
  id                   String   @id @default(cuid())
  userId               String
  type                 EnergyTransactionType  // GRANT, SPEND, REFUND, ADJUSTMENT
  status               EnergyTransactionStatus // RESERVED, SETTLED, REFUNDED
  delta                Int      // Credits added/removed
  balanceAfter         Int      // Balance snapshot
  feature              String?  // e.g., "api-image-generation", "video-generation"
  provider             String?  // e.g., "replicate", "gemini"
  model                String?  // e.g., "flux-schnell"
  promptTokens         Int?
  completionTokens     Int?
  totalTokens          Int?
  requestId            String?  @unique  // Idempotency
  relatedTransactionId String?
  metadata             Json?
  createdAt            DateTime @default(now())
}

model User {
  id                   String   @id
  email                String   @unique
  name                 String?
  credits              Int      @default(50)  // Initial energy
  subscriptionTier     String?  // 'free', 'pro', 'enterprise'
  subscriptionStatus   String?  // 'active', 'trialing', 'canceled'
  role                 Role     // USER, ADMIN, FOUNDER, MENTOR
}
```

### Media Assets

```prisma
model MediaAsset {
  id          String    @id @default(cuid())
  ventureId   String?
  ownerId     String    // Who created it
  type        String    // IMAGE, VIDEO, AUDIO
  url         String
  filename    String
  mimeType    String
  size        Int
  source      String    // GENERATED, UPLOADED
  prompt      String?   // Original generation prompt
  model       String?   // Model ID used
  width       Int?
  height      Int?
  tags        String[]
  isPublic    Boolean   @default(false)
  createdAt   DateTime  @default(now())
}
```

### AI Chat & Memory

```prisma
model AiChatThread {
  id         String   @id @default(cuid())
  userId     String
  ventureId  String?
  title      String?  // Auto-generated from first message
  isArchived Boolean  @default(false)
  createdAt  DateTime @default(now())
}

model AiChatMessage {
  id       String  @id @default(cuid())
  threadId String
  role     String  // 'user', 'assistant'
  content  String
  metadata Json?   // attachments, etc.
  createdAt DateTime @default(now())
}

model UserMemory {
  id        String    @id @default(cuid())
  userId    String
  category  String    // GOAL, PREFERENCE, FACT, DECISION, OTHER
  content   String
  createdAt DateTime  @default(now())
}
```

### AI Actions & Confirmation

```prisma
model AiAction {
  id                  String    @id @default(cuid())
  userId              String
  ventureId           String?
  toolName            String    // e.g., "create_venture"
  status              AiActionStatus // PENDING, CONFIRMED, EXECUTED, FAILED
  payload             Json?
  summary             String?
  requiresConfirmation Boolean
  confirmationToken   String?   @unique
  result              Json?
  error               String?
  confirmedAt         DateTime?
  executedAt          DateTime?
  createdAt           DateTime  @default(now())
}
```

### Integrations

```prisma
model IntegrationConnection {
  id           String   @id @default(cuid())
  userId       String
  provider     String   // NOTION, DOCUSIGN, SLACK
  status       String   // CONNECTED, ERROR, PENDING
  accessToken  String   // Encrypted with AES-256-GCM
  refreshToken String?  // Encrypted
  expiresAt    DateTime?
  workspaceName String?
  workspaceId  String?
}

model IntegrationSyncLog {
  id          String   @id @default(cuid())
  connectionId String
  resourceType String  // "brand-dna", "roadmap"
  resourceId  String
  externalId  String   // Notion Page/Database ID
  externalUrl String?
  status      String   // SUCCESS, FAILED
  error       String?
}
```

### System Cache (for async jobs)

```prisma
model SystemCache {
  key       String   @id
  value     String   @db.Text
  expiresAt DateTime?
}

// Keys used:
// - replicate:media:{predictionId}
// - faceswap:{predictionId}
// - motion-transfer:{predictionId}
```

---

## 7. INTEGRATIONS STATUS

### Notion (✅ LIVE)
- OAuth 2.0 with PKCE
- Brand DNA → Notion Page
- Roadmap → Notion Database
- Search pages/databases
- AES-256-GCM encryption for tokens

### Slack (✅ LIVE)
- OAuth 2.0
- Event subscriptions (venture created, squad joined, decisions, tasks)
- Message notifications with formatted templates
- Channel selection & workspace management

### DocuSign (🚧 PHASE 3 - Planned)
- JWT OAuth flow
- Co-founder agreements
- Supplier contracts
- Template-based signing
- Webhook status tracking
- Estimated delivery: Week 6

---

## 8. MONETIZATION STRATEGY

### Freemium Model
- **Free Tier:** 50 initial credits, daily quotas (15 images, 3 videos)
- **Pro Tier:** Unlimited daily quotas, more credits/month
- **Enterprise:** Custom pricing

### Revenue Streams
1. **Credit Top-ups:** One-time purchases (via Stripe)
2. **Subscriptions:** Monthly platform access (Free/Pro/Squad)
3. **Feature Gating:** Advanced AI features (legal drafts, sourcing) require credits
4. **API Access:** Planned v1 API for external partners

### Credit Pricing Example
```
1 EUR cost → ÷ 0.0875 (CREDIT_EUR_VALUE) × 1.2 (CREDIT_MARGIN) ≈ 14 credits

Video: 5s @ Kling 2.6 with audio
= 5s × $0.14/s × 1.0 EUR/USD = €0.70
= 0.70 EUR × 1.2 ÷ 0.0875 ≈ 9.6 ≈ 10 credits
```

---

## 9. ARCHITECTURE PATTERNS

### Energy Reserve Pattern
Used for ALL costly operations (images, videos, chats):

```typescript
// 1. RESERVE credits (optimistic)
const reservation = await reserveEnergy({
  userId,
  amount: estimatedCost,
  requestId: `unique-id`  // Idempotency
});

// 2. EXECUTE operation
const result = await generateImage(...);

// 3. SETTLE actual cost (with refund if overestimated)
await settleEnergy({
  reservationId: reservation.reservationId,
  finalCost: actualCost
});

// 4. REFUND on failure
if (failed) {
  await refundEnergy(reservation.reservationId, 'reason');
}
```

### Replicate Webhook Processing
```
1. Receive webhook → Verify signature (HMAC-SHA256)
2. Check job cache for state
3. If status = "succeeded":
   - Acquire processing lock (prevent race conditions)
   - Fetch output from URL with timeout
   - Save to Vercel Blob (public)
   - Create MediaAsset record
   - Settle energy credits
   - Update cache with result
4. If status = "failed|canceled":
   - Refund reserved credits
   - Mark as failed in cache
5. Return 200 OK (Replicate doesn't retry)
```

### Async Job Caching
```typescript
// Instead of database for transient state, use SystemCache
const cache = await prisma.systemCache.upsert({
  where: { key: `replicate:media:${predictionId}` },
  update: { value: JSON.stringify(jobState), expiresAt: expiresIn6h },
  create: { ... }
});
```

---

## 10. KEY FEATURES & WORKFLOWS

### Marketing Studio
- Image generation (Flux Schnell/1.1 Pro/2 Pro)
- Video generation (Kling/Sora/Veo)
- Face swap (character avatars)
- Lip sync (talking heads)
- Motion transfer (full-body animation)
- Character DNA extractor (portrait → prompt)
- Prompt expansion (AI refines user input)
- Media library + favorites

### Venture Operations
- Create venture → Setup phases automatically
- Brand DNA (mission, values, tone)
- Roadmap (tasks, milestones, votes)
- Squad collaboration (roles: LEAD, MEMBER, GUEST)
- Decision voting (async consensus)
- Integration exports (Notion, Slack)

### Legal Stack
- Contract scanning (extract key dates/terms)
- AI legal drafting (templates)
- DocuSign signing (live)
- Audit trails

### Sourcing
- Supplier database
- AI discovery (match ventures to suppliers)
- Production orders
- Sample requests

### Forum & Community
- Thread-based discussions
- AI actions (summarize, feedback, fact-check)
- Moderation (toxicity detection)
- Karma system
- Direct messaging

---

## 11. DEPLOYMENT & SECURITY

### Deployment
- **Platform:** Vercel (Next.js)
- **Database:** Neon PostgreSQL (pooled + unpooled)
- **Blob Storage:** Vercel Blob
- **Email:** Resend
- **Auth:** NextAuth.js v5 beta

### Security Measures
- **RLS (Row-Level Security):** All Prisma queries with RLS context
- **API Key System:** Scoped bearer tokens with rate limiting
- **Encryption:** AES-256-GCM for sensitive tokens (Notion, Slack, DocuSign)
- **Webhook Verification:** HMAC-SHA256 signatures
- **Rate Limiting:** Per-user quotas (daily/monthly) + global limits
- **CSRF Protection:** NextAuth built-in
- **Content Security Policy:** Custom CSP for media domains
- **Admin Bypass:** `ADMIN_UNLIMITED_ENERGY` flag for testing

---

## 12. NEXT PRIORITIES (TODO)

### Immediate (This Week)
1. **Music & Sounds Studio**
   - Soundstripe Enterprise API integration
   - License tracking + download flow
   
2. **Membership & Credit Monetization**
   - Stripe subscription setup
   - Credit top-up purchases
   - Plan-based limits enforcement

3. **Pricing Finalization**
   - Free/Pro/Squad tiers
   - Monthly + credit pack pricing

### Short-term (Next 2 Weeks)
1. **Google OAuth** on login page (for trust)
2. **DocuSign Integration** (Phase 3)
3. **Advanced Analytics** (usage tracking)
4. **Error Handling** improvements for API

### Medium-term (Next Month)
1. **Mobile App** (React Native)
2. **Batch Operations** (bulk image/video generation)
3. **Custom Models** (fine-tuning support)
4. **Team Workspaces** (upgrade from squad-based)

---

## 13. ENVIRONMENT VARIABLES (Complete Reference)

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Auth
AUTH_SECRET=...
AUTH_URL=https://www.stakeandscale.de
AUTH_RESEND_KEY=re_...

# AI Models
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
GROQ_API_KEY=...
MOONSHOT_API_KEY=...

# Media Generation
REPLICATE_API_TOKEN=r8_...
REPLICATE_WEBHOOK_SECRET=whsec_...

# Pricing
CREDIT_EUR_VALUE=0.0875
CREDIT_MARGIN=1.2
USD_EUR_RATE=1

# Video Pricing (per model, per second, USD)
VIDEO_KWAIVGI_KLING_V2_6_AUDIO_USD_PER_SEC=0.14
VIDEO_GOOGLE_VEO_3_1_AUDIO_USD_PER_SEC=0.40

# Quotas
DAILY_QUOTA_IMAGE_FREE=15
DAILY_QUOTA_IMAGE_PAID=50
DAILY_QUOTA_VIDEO_FREE=3
DAILY_QUOTA_VIDEO_PAID=20
MONTHLY_QUOTA_AVATAR_FREE=3
MONTHLY_QUOTA_AVATAR_PAID=200

# Integrations
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# Payment
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage
VERCEL_BLOB_READ_WRITE_TOKEN=...

# Other
ADMIN_UNLIMITED_ENERGY=false
NEXT_PUBLIC_APP_URL=https://www.stakeandscale.de
```

---

## 14. CODE STRUCTURE

```
/Users/bucci369/the-forge-community/
├── app/                           # Next.js App Router
│   ├── api/
│   │   ├── v1/media/            # Versioned API
│   │   ├── chat/                # LLM endpoints
│   │   ├── webhooks/            # Replicate, Slack, etc.
│   │   ├── ventures/[id]/       # Venture-specific endpoints
│   │   └── integrations/        # OAuth callbacks, syncs
│   ├── forge/[ventureId]/       # Venture workspace
│   │   ├── marketing/           # Media generation UI
│   │   ├── legal/               # Legal documents
│   │   ├── sourcing/            # Supplier management
│   │   └── communication/       # Chat/messaging
│   └── ...
├── lib/
│   ├── ai.ts                    # Main LLM caller (fallback chain)
│   ├── ai-prompt-engine.ts      # Prompt expansion
│   ├── media-models.ts          # Model registry
│   ├── credit-pricing.ts        # Cost calculations
│   ├── energy.ts                # Credit system
│   ├── orion-tools.ts           # Tool registry (110KB!)
│   ├── integrations/
│   │   ├── notion/              # Notion OAuth & sync
│   │   └── slack/               # Slack OAuth & notifications
│   └── ...
├── components/
│   ├── notion/                  # Notion UI
│   ├── slack/                   # Slack UI
│   └── ...
├── prisma/
│   └── schema.prisma            # Prisma schema
├── migrations/                  # Database migrations
└── README.md, INTEGRATIONS.md, AGENTS.md
```

---

## 15. SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Primary LLM** | Kimi K2.5 (Moonshot) → Gemini 2.0 Flash → Groq Llama 3.3 |
| **Image Generation** | Replicate (Flux Schnell, Flux 1.1 Pro, Flux 2 Pro) |
| **Video Generation** | Replicate (Kling 2.6, Sora 2, Veo 3.1) |
| **Avatar/Face Swap** | Replicate (Roop, Live Portrait) |
| **Lip Sync/Motion** | Replicate + system cache for state |
| **Credit System** | Reserve → Generate → Settle (with refunds) |
| **Pricing** | €0.0875/credit, 1.2x margin, per-model USD rates |
| **Rate Limiting** | Daily quotas (free: 15 img/3 vid, paid: 50 img/20 vid) |
| **Storage** | Vercel Blob (public URLs) |
| **Database** | PostgreSQL (Neon) with RLS + Prisma 7.2 |
| **Auth** | NextAuth v5 + OAuth (Notion, Slack, future: Google, DocuSign) |
| **Monetization** | Freemium (50 credits) → Pro subscription + top-ups |
| **Status** | Production (Live with 04.02.2026 updates) |

---

**Last Updated:** February 4, 2026  
**Maintainer:** Engineering Team (STAKE & SCALE)  
**License:** Proprietary
