# The Forge - AI Models Quick Reference

## TL;DR Summary

**The Forge** is an AI-powered SaaS for solo founders to build ventures collaboratively. It uses a sophisticated multi-model strategy for different tasks:

### AI Model Stack

| Task | Primary | Fallback 1 | Fallback 2 | Cost |
|------|---------|-----------|-----------|------|
| **Chat/Orion** | Kimi K2.5 | Gemini 2.0 Flash | Groq Llama 3.3 70B | ~1-3 credits/msg |
| **Images** | Flux 1.1/2 Pro (Replicate) | Flux Schnell | N/A | 2-25 credits |
| **Video** | Kling 2.6 (Replicate) | Sora 2, Veo 3.1 | N/A | $0.07-0.40/sec |
| **Face Swap** | Roop (Replicate) | Live Portrait | N/A | 45-65 credits |
| **Lip Sync** | Sync 2 Pro (Replicate) | N/A | N/A | 18-45 credits |
| **Motion Transfer** | Wan 2.2 (Replicate) | N/A | N/A | 50 credits |

## Key Infrastructure

### Architecture Pattern: Energy Reserve System
```
Reserve Credits → Generate Asset → Settle Credits → Refund if failed
```

### Providers Used
1. **Moonshot AI (Kimi K2.5)** - Primary LLM (multimodal)
2. **Google Gemini** - Fallback LLM + image analysis
3. **Groq** - Fastest fallback
4. **Replicate** - All media generation (images, videos, avatars)
5. **Vercel Blob** - Storage for generated media
6. **Notion** - Integration (OAuth)
7. **Slack** - Integration (OAuth)
8. **Stripe** - Credit top-ups & subscriptions
9. **Neon PostgreSQL** - Database

## Pricing Model

### Credit System
- **1 Credit = €0.0875**
- **Margin: 1.2x** (20% markup)
- **Initial credits: 50** (for new users)

### Examples
| Operation | Cost | Credits |
|-----------|------|---------|
| Flux Schnell image | €0.175 | 2 |
| Flux 1.1 Pro image | €1.31 | 15 |
| Flux 2 Pro image | €2.19 | 25 |
| Video: 5s Kling w/ audio | €0.70 | 10 |
| Video: 10s Veo 3.1 w/ audio | €4.40 | 61 |
| Face Swap | €3.50-5.69 | 45-65 |
| Lip Sync Final | €3.94 | 45 |

## API Endpoints

### Core Media APIs
- `POST /api/v1/media/generate-image` - Versioned image API (with API keys)
- `POST /api/ventures/[id]/marketing/media` - Session-based media gen
- `POST /api/ventures/[id]/marketing/faceswap` - Avatar generation
- `POST /api/ventures/[id]/marketing/lipsync` - Lip sync videos
- `POST /api/ventures/[id]/marketing/motion-transfer` - Full-body motion

### Chat APIs
- `POST /api/chat` - Simple LLM streaming
- `POST /api/chat/contextual` - Gemini multi-turn with tools
- `POST /api/research` - Web search + summarization

### Webhooks
- `POST /api/webhooks/replicate` - Async job completion (with HMAC verification)

## Rate Limits

### Free Tier (Daily)
- Images: 15/day
- Videos: 3/day
- Voice: 20/day
- Avatars: 3/month

### Paid Tier (Daily)
- Images: 50/day
- Videos: 20/day
- Voice: 100/day
- Avatars: 200/month

## Key Features

### Marketing Studio
1. Image generation (Flux Schnell/1.1 Pro/2 Pro)
2. Video generation (Kling/Sora/Veo)
3. Face swap (character avatars)
4. Lip sync (talking heads)
5. Motion transfer (full-body animation)
6. Character DNA (portrait → prompt extraction)
7. Prompt expansion (AI improves user input)
8. Media library

### Venture Operations
1. Venture creation + phase setup
2. Brand DNA (mission, values, tone)
3. Roadmap (tasks, milestones)
4. Squad collaboration
5. Decision voting
6. Notion/Slack exports

### Community
1. Forum threads
2. Direct messaging
3. AI moderators
4. Karma system

## Integrations (Status)

| Service | Status | Features |
|---------|--------|----------|
| **Notion** | Live | Brand DNA & Roadmap sync (OAuth) |
| **Slack** | Live | Event notifications (OAuth) |
| **DocuSign** | Planned | Contract signing (Phase 3) |
| **Google** | Planned | OAuth login |
| **Soundstripe** | Pending | Music & sounds library |

## Database

**PostgreSQL (Neon)** with Prisma 7.2

Key tables:
- `EnergyTransaction` - Credit ledger
- `MediaAsset` - Generated/uploaded media
- `AiChatThread/Message` - Chat history
- `UserMemory` - Persistent AI knowledge
- `AiAction` - Confirmation workflow
- `IntegrationConnection` - OAuth tokens (AES-256 encrypted)

## Configuration

### Environment Variables (Essentials)

```env
# AI Models
GEMINI_API_KEY=...
GROQ_API_KEY=...
MOONSHOT_API_KEY=...  # Kimi K2.5

# Media Generation
REPLICATE_API_TOKEN=...

# Pricing
CREDIT_EUR_VALUE=0.0875
CREDIT_MARGIN=1.2
USD_EUR_RATE=1

# Video Pricing (USD/sec)
VIDEO_KWAIVGI_KLING_V2_6_AUDIO_USD_PER_SEC=0.14
VIDEO_GOOGLE_VEO_3_1_AUDIO_USD_PER_SEC=0.40

# Rate Limits
DAILY_QUOTA_IMAGE_FREE=15
DAILY_QUOTA_VIDEO_FREE=3
MONTHLY_QUOTA_AVATAR_FREE=3
```

## For Next Features

### Immediate TODO
1. Soundstripe music integration
2. Stripe payment setup (subscriptions + credit top-ups)
3. Google OAuth
4. DocuSign integration

### Tech Stack
- **Frontend:** Next.js 16, React 19, TailwindCSS
- **Backend:** Node.js, TypeScript, Prisma
- **Database:** PostgreSQL (Neon)
- **Storage:** Vercel Blob
- **Auth:** NextAuth.js v5 + OAuth (Notion, Slack)
- **Payments:** Stripe
- **Deployment:** Vercel

## Files to Know

| File | Purpose |
|------|---------|
| `lib/ai.ts` | Main LLM caller (fallback chain) |
| `lib/media-models.ts` | Model registry (costs, specs) |
| `lib/energy.ts` | Credit system (reserve/settle/refund) |
| `lib/credit-pricing.ts` | Cost calculations |
| `app/api/webhooks/replicate/route.ts` | Async job completion handler |
| `lib/orion-tools.ts` | AI tool registry (110KB) |
| `prisma/schema.prisma` | Database schema |

## Quick Stats

- **Status:** Production (Feb 4, 2026)
- **Users:** Founders + Mentors (invite-only currently)
- **Countries:** EU-focused (German UI, EUR pricing)
- **Monthly Spend (Providers):** ~€2000-5000 (estimated)
- **Architecture:** Async-first (webhooks, caching, event-driven)
- **Security:** RLS, AES-256 encryption, HMAC verification, API keys with scopes

---

**Last Updated:** February 4, 2026  
**For Full Details:** See `THE_FORGE_AI_OVERVIEW.md`
