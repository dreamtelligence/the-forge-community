# AGENTS.md - AI Coding Agent Guidelines

> This file provides essential context for AI coding agents working on **STAKE & SCALE** (The Forge Community).

---

## Project Overview

**STAKE & SCALE** is a Community Venture Studio Platform – a Next.js-based SaaS that enables solo founders to build scalable ventures together. It combines AI-powered tools with collaborative squad-based workflows.

### Core Concept

- **Open Registration**: Anyone can sign up via magic link (email) or Google OAuth
- **Freemium Model**: New users receive 50 AI credits (Energy System) to test the platform
- **Squads**: Groups of 2-5 members form to build ventures collaboratively
- **Ventures**: Created via a guided wizard (E-Commerce, SaaS, Service types)
- **The Forge**: The venture workspace with studios for Brand, Legal, Marketing, and Sourcing
- **AI-First**: Gemini 2.0 Flash powers content generation, moderation, and advisor chatbot

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.2.3 (App Router, React Server Components) |
| **Language** | TypeScript 5 (strict mode) |
| **Database** | PostgreSQL (Vercel Postgres) + Prisma 7.7 |
| **Authentication** | NextAuth v5 (JWT, Magic Links via Resend) |
| **Payments** | Stripe (Subscriptions + Connect for marketplace) |
| **AI** | Gemini 2.0 Flash (primary), Groq (fallback) |
| **Storage** | Vercel Blob for file uploads |
| **Styling** | Tailwind CSS v4 |
| **Deployment** | Vercel |

---

## Project Structure

```
the-forge-community/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (REST endpoints)
│   │   ├── forum/               # Forum API (posts, comments, votes)
│   │   ├── ventures/[id]/       # Venture-specific APIs
│   │   ├── webhooks/            # Stripe, Replicate webhooks
│   │   └── ...                  # Various service APIs
│   ├── forge/[ventureId]/       # Venture Workspace (The Forge)
│   │   ├── brand/              # Brand DNA Studio
│   │   ├── legal/              # Legal Studio (Contracts)
│   │   ├── marketing/          # Marketing Studio (AI-Campaigns)
│   │   ├── sourcing/           # Sourcing Studio (Suppliers/Samples)
│   │   ├── decisions/          # Decision Hall (Voting)
│   │   └── admin/              # Admin Studio
│   ├── actions/                 # Server Actions (Next.js)
│   ├── context/                 # React Context providers
│   ├── hooks/                   # Custom React hooks
│   ├── ventures/                # Venture Management pages
│   ├── squads/                  # Squad Marketplace
│   ├── forum/                   # Community Forum
│   ├── settings/                # User settings (billing, API keys)
│   └── ...                      # Other pages
├── components/                  # Produktnahe UI-Komponenten
├── shared/                      # Cross-cutting UI + integration modules
├── lib/                         # Domain- und Service-Logik
│   ├── warehouse/              # Warehouse/WMS boundary modules
│   ├── billing/                # Billing and invoice logic
│   ├── integrations/           # Notion, Slack, provider integrations
│   ├── security/               # Rate limiting, platform protection
│   └── ...                     # Further grouped domain modules
├── prisma/
│   ├── schema.prisma           # Database Schema
│   ├── migrations/            # Canonical Prisma migration history
│   └── manual_sql/            # Manual SQL supplements
├── scripts/                    # Grouped utility scripts (architecture/db/seed/tests/ops)
├── types/                      # TypeScript type definitions
└── public/                     # Static Assets
```

---

## Build & Development Commands

```bash
# Development
npm run dev                 # Start dev server (localhost:3000)
npm run build              # Production build (prisma generate + next build)
npm start                  # Production server
npm run lint               # ESLint check

# Database
npx prisma generate        # Generate Prisma Client after schema changes
npx prisma db push         # Push schema changes to database (dev only)
npx prisma studio          # Open Prisma Studio GUI
npm run migrate:deploy     # Deploy migrations (uses unpooled connection)

# Seeding & Scripts
npm run seed:academy       # Seed academy/training course data
npm run seed:platform-finance  # Seed platform finance data
```

**Important**: This project uses **two database change paths**:

- `prisma/migrations/` is the canonical schema migration chain and is deployed with `npm run migrate:deploy` (`prisma migrate deploy` on an unpooled connection).
- `prisma/manual_sql/` contains **manual SQL supplements** for RLS, policies, and post-deploy SQL that Prisma does not manage directly.

Do not create a second competing migration history outside `prisma/`. Use unique, sortable filenames in `prisma/manual_sql/` and keep schema evolution in Prisma unless the SQL must remain manual.

---

## Code Style Guidelines

### TypeScript & React

- **Functional components** preferred over class components
- **Strict TypeScript** mode enabled – avoid `any` types
- **Async/await** for asynchronous operations
- Use `'use server'` directive for Server Actions
- Use `'use client'` directive only when necessary (interactivity)

### Naming Conventions

- **Files**: kebab-case for utilities, PascalCase for components
- **Components**: PascalCase (e.g., `BrandDNAForm.tsx`)
- **Functions**: camelCase (e.g., `generateContent()`)
- **Database models**: PascalCase (e.g., `Venture`, `SquadMember`)
- **Environment variables**: UPPER_SNAKE_CASE

### Styling

- **Tailwind CSS v4** for all styling
- Use CSS variables from `globals.css` (`--accent`, etc.)
- Avoid inline styles; use Tailwind utility classes
- Custom animations in `globals.css` with `@keyframes`

### Database Patterns

- Use Prisma Client from `@/lib/prisma` (singleton)
- Use transactions for multi-step operations: `prisma.$transaction()`
- Apply indexes for frequently queried fields
- Row-Level Security (RLS) enforced on critical tables

---

## Testing Strategy

- **No formal test suite** currently exists
- Manual testing via UI during development
- API testing via route handlers
- Database validation via Prisma Studio

**When adding tests**: Use Jest + React Testing Library. Place test files near modules (`*.test.ts(x)`).

---

## Key Architecture Patterns

### 1. Row-Level Security (RLS)

Protected tables: `User`, `Venture`, `Squad`, `SquadMember`, `BrandDNA`, `VentureTask`

```typescript
// Session variables are set by secureQuery helper
import { secureQuery } from '@/lib/db-security';

const result = await secureQuery(async () => {
  return await prisma.venture.findMany(); // Auto-filtered by RLS
});
```

### 2. Energy System (AI Credits)

Modern reserve-settle pattern (ALWAYS use this):

```typescript
import { reserveEnergy, settleEnergy, refundEnergy } from '@/lib/energy';

// 1. Reserve credits BEFORE AI call
const reservation = await reserveEnergy({
  userId,
  amount: 10,
  feature: 'marketing-content',
  requestId: `unique-id-${Date.now()}`,
  provider: 'gemini',
  model: 'gemini-2.0-flash'
});

try {
  // 2. Perform AI operation
  const result = await callAI(...);
  
  // 3. Settle with actual cost
  await settleEnergy({
    reservationId: reservation.reservationId,
    finalCost: 7,
    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 }
  });
} catch (error) {
  // 4. Refund on failure
  await refundEnergy(reservation.reservationId, 'ai-generation-failed');
  throw error;
}
```

### 3. Multi-Squad Membership

```typescript
// Get user's squads (many-to-many via SquadMember)
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    squadMemberships: {
      where: { leftAt: null }, // Active only
      include: { squad: true }
    }
  }
});

const squads = user.squadMemberships.map(m => m.squad);
```

### 4. AI Integration (Multi-Provider)

```typescript
import { callAI } from '@/lib/ai';

// Automatically tries Gemini first, falls back to Groq
const response = await callAI([
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Generate content...' }
], { temperature: 0.7, maxTokens: 1000 });

console.log(response.content);   // AI-generated text
console.log(response.provider);  // 'gemini' or 'groq'
console.log(response.usage);     // Token usage
```

---

## Security Considerations

### Authentication

- NextAuth v5 with JWT strategy
- Magic links via Resend (primary) or Google OAuth (optional)
- Session cookie: `__Secure-authjs.session-token` (production)
- Protected routes defined in `auth.config.ts`

### API Security

- Rate limiting on AI endpoints (`lib/rate-limit.ts`)
- Content moderation on all user-generated content (`lib/moderation.ts`)
- API keys for external access with scoped permissions (`lib/api-keys/`)
- CORS headers configured in `next.config.ts`

### Data Security

- RLS policies enforce data isolation
- User can only access own data + squad data
- Admins bypass policies via role check
- Encryption for OAuth tokens (AES-256-GCM)

### Content Moderation

- AI-powered toxicity detection (HARASSMENT, HATE_SPEECH, SPAM)
- 3-strike warning system → 4th strike = auto-ban
- Applied to forum posts AND direct messages
- Free operation (no credits deducted – platform safety)

---

## Environment Variables

Create `.env.local` based on `.env.example`:

```bash
# Database (Pooled for runtime, Unpooled for migrations)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
POSTGRES_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# Auth (NextAuth v5)
AUTH_SECRET="xxx"
AUTH_URL="http://localhost:3000"
AUTH_RESEND_KEY="re_xxx"
AUTH_RESEND_FROM="STAKE & SCALE <info@stakeandscale.de>"
AUTH_GOOGLE_ID="xxx"          # Optional
AUTH_GOOGLE_SECRET="xxx"      # Optional

# AI
GEMINI_API_KEY="xxx"
GROQ_API_KEY="xxx"            # Fallback
INITIAL_CREDITS=50

# Stripe
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"

# Admin
ADMIN_EMAIL="admin@example.com"
ADMIN_UNLIMITED_ENERGY="true"  # Admin bypass for credits

# Integrations
NOTION_CLIENT_ID="xxx"
NOTION_CLIENT_SECRET="secret_xxx"
INTEGRATION_ENCRYPTION_KEY="xxx"  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Other
NEXT_PUBLIC_APP_URL="https://www.stakeandscale.de"
```

---

## Deployment

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Build command: `prisma generate && next build`
4. Database: Use Vercel Postgres or external PostgreSQL

### Database Migrations

```bash
# Deploy migrations (uses unpooled connection)
npm run migrate:deploy

# Or manually:
bash scripts/db/migrate-unpooled.sh
```

### Webhook Configuration

- Stripe webhooks: Point to `/api/webhooks/stripe`
- Replicate webhooks: Point to `/api/webhooks/replicate`

---

## Common Tasks

### Adding a New API Route

Create file in `app/api/[path]/route.ts`:

```typescript
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Implementation
  return NextResponse.json({ data: result });
}
```

### Adding a New Database Model

1. Edit `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` (dev) or create migration (production)
4. Update RLS policies if needed in `migrations/`

### Adding AI Features

1. Use `callAI()` from `@/lib/ai` for automatic fallback
2. Wrap with Energy System (reserve-settle pattern)
3. Add rate limiting for abuse prevention
4. Log token usage for cost tracking

---

## Documentation References

- `README.md` – Project overview and setup
- `CLAUDE.md` – Detailed developer documentation
- `ROADMAP.md` – Feature planning
- `INTEGRATIONS.md` – Enterprise integrations guide
- `prisma/schema.prisma` – Database schema reference

---

## Support & Contact

**Development**: info@stakeandscale.de

**License**: Proprietary – All rights reserved.

---

*Last updated: April 12, 2026*
