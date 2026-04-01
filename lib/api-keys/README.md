# API Key Management System

**Production-Ready External API Access for The Forge Platform**

Version: 1.0.0
Date: 2026-02-01
Author: Claude Code

---

## Overview

Enterprise-grade API key authentication system enabling external access to The Forge platform for automation tools (Zapier, Make, n8n), custom integrations, and third-party applications.

## Features

### ✅ Implemented (Backend Complete)

- **Cryptographically Secure Key Generation** - SHA-256 hashing, constant-time comparison
- **Rate Limiting** - Hourly + Daily quotas (IP-based + User-based)
- **Scope-Based Authorization** - Fine-grained permissions (media, content, venture, etc.)
- **Request Logging** - Full analytics (endpoint, credits, response time, errors)
- **Energy Integration** - Automatic credit reservation/settlement/refund
- **RLS Policies** - Multi-tenant security (users see only their keys)
- **Webhook Support** - Database ready for webhook event subscriptions
- **Versioned API** - /api/v1/* structure for future compatibility

### 🚧 Pending (UI + Documentation)

- API Key Management UI (`/settings/api-keys`)
- API Documentation (OpenAPI/Swagger)
- Webhook UI & Event System
- End-to-end testing

---

## Architecture

### Database Schema

```prisma
ApiKey {
  id, userId, ventureId,
  name, keyHash, keyPrefix,
  scopes[], rateLimit, rateLimitDaily,
  isActive, lastUsedAt, expiresAt
}

ApiRequest {
  id, apiKeyId, endpoint, method, statusCode,
  creditsUsed, responseTime, ipAddress, error
}

ApiWebhook {
  id, userId, ventureId, url, events[],
  secret, isActive, lastTriggeredAt, failureCount
}
```

### API Key Format

```
forge_[env]_[32 bytes base64url]
Example: forge_prod_kJ8vLp2Qm9xR4sT6uV3wX1yZ5aB7cD9eF
```

- **Prefix**: `forge_prod` (first 10 chars, safe to display)
- **Environment**: prod | test | dev
- **Random**: 32 cryptographically secure bytes (Base64url encoded)
- **Storage**: SHA-256 hash only (plaintext never stored)

### Security

- ✅ Constant-time hash comparison (timing attack resistant)
- ✅ Bearer token authentication (RFC 6750)
- ✅ Row-Level Security (RLS) policies
- ✅ Rate limiting (hourly + daily)
- ✅ Scope validation (AND/OR logic)
- ✅ Automatic key expiration
- ✅ Request logging for audit
- ✅ HMAC-SHA256 webhook signatures

---

## API Endpoints

### Management API (NextAuth Required)

```
POST   /api/keys              Create new API key
GET    /api/keys              List user's keys
GET    /api/keys/[id]         Get key details
PATCH  /api/keys/[id]         Update key
DELETE /api/keys/[id]         Revoke key
GET    /api/keys/[id]/stats   Get usage statistics
```

### Versioned API (API Key Required)

```
POST   /api/v1/media/generate-image
POST   /api/v1/media/generate-video
POST   /api/v1/content/generate
POST   /api/v1/files/upload
GET    /api/v1/ventures/[id]
...
```

---

## Usage Examples

### Creating an API Key

```bash
curl -X POST https://stakeandscale.de/api/keys \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=..." \
  -d '{
    "name": "Zapier Integration",
    "scopes": ["media:generate:image", "content:generate:marketing"],
    "ventureId": "venture_123",
    "rateLimit": 100,
    "rateLimitDaily": 1000
  }'

# Response (⚠️ apiKey shown ONCE only!)
{
  "apiKey": "forge_prod_kJ8vLp2Qm9xR4sT6uV3wX1yZ5aB7cD9eF",
  "keyId": "key_abc123",
  "keyPrefix": "forge_prod",
  "name": "Zapier Integration",
  "scopes": ["media:generate:image", "content:generate:marketing"],
  "createdAt": "2026-02-01T..."
}
```

### Using an API Key

```bash
curl -X POST https://stakeandscale.de/api/v1/media/generate-image \
  -H "Authorization: Bearer forge_prod_kJ8vLp2Qm9xR4sT6uV3wX1yZ5aB7cD9eF" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at sunset",
    "model": "flux-schnell"
  }'

# Response
{
  "data": {
    "url": "https://blob.vercel-storage.com/...",
    "creditsUsed": 10
  },
  "meta": {
    "requestId": "abc123...",
    "timestamp": "2026-02-01T..."
  }
}
```

### Rate Limit Error

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Hourly rate limit exceeded (100 req/hour)",
    "requestId": "abc123",
    "retryAfter": 3456,
    "resetAt": "2026-02-01T15:00:00Z"
  }
}
```

---

## Available Scopes

| Scope | Description |
|-------|-------------|
| `media:generate:image` | Generate images via AI |
| `media:generate:video` | Generate videos via AI |
| `media:generate:voice` | Generate voice audio |
| `media:read` | Read media assets |
| `media:delete` | Delete media assets |
| `content:generate:marketing` | Generate marketing content |
| `content:generate:legal` | Generate legal documents |
| `content:read` | Read content |
| `content:delete` | Delete content |
| `venture:read` | Read venture data |
| `venture:write` | Create/update ventures |
| `venture:delete` | Delete ventures |
| `brand:read` | Read brand DNA |
| `brand:write` | Update brand DNA |
| `files:upload` | Upload files |
| `files:read` | Read files |
| `files:delete` | Delete files |
| `webhooks:read` | Read webhooks |
| `webhooks:write` | Create/update webhooks |
| `webhooks:delete` | Delete webhooks |
| `analytics:read` | Read analytics |
| `*` | Wildcard (full access) |

---

## Code Structure

```
lib/api-keys/
├── crypto.ts         # Key generation, hashing, signing
├── types.ts          # TypeScript definitions
├── auth.ts           # Authentication middleware
└── README.md         # This file

app/api/keys/
├── route.ts          # POST, GET (create, list)
└── [id]/
    ├── route.ts      # GET, PATCH, DELETE (read, update, delete)
    └── stats/
        └── route.ts  # GET (usage statistics)

app/api/v1/           # Versioned API
└── media/
    └── generate-image/
        └── route.ts  # Example v1 endpoint

migrations/
├── 008_add_api_key_management.sql
└── manual/
    └── 008_api_rls_policies.sql
```

---

## Implementation Template

When creating new v1 API endpoints, follow this pattern:

```typescript
import { authenticateApiRequest, logRequestCompletion, formatApiError } from '@/lib/api-keys/auth';
import { reserveEnergy, settleEnergy } from '@/lib/energy';

export async function POST(req: NextRequest) {
  let context = null;

  try {
    // 1. Authenticate
    context = await authenticateApiRequest(req, ['your:scope']);

    // 2. Validate request
    const body = await req.json();
    // ... validation

    // 3. Reserve credits
    const reservation = await reserveEnergy({
      userId: context.user.id,
      amount: 10,
      feature: 'your-feature',
      requestId: `api-${context.requestId}`,
    });

    // 4. Perform operation
    const result = await yourOperation();

    // 5. Settle credits
    await settleEnergy({
      reservationId: reservation.reservationId,
      finalCost: 10,
    });

    // 6. Log & return
    await logRequestCompletion(context, req, 200, 10);
    return NextResponse.json({ data: result });

  } catch (error) {
    if (context) {
      await logRequestCompletion(context, req, 500, 0, error.message);
    }
    return formatApiError(error, context?.requestId);
  }
}
```

---

## Next Steps

1. **UI Implementation** - `/settings/api-keys` page with React components
2. **API Documentation** - OpenAPI/Swagger spec generation
3. **Webhook System** - Event emission & delivery
4. **Testing** - End-to-end integration tests
5. **Monitoring** - Analytics dashboard for admins

---

## Security Considerations

- **Never log plaintext keys** - Only log keyPrefix for debugging
- **Rate limiting** - Prevent abuse with both IP and user quotas
- **Scope principle** - Grant minimum required scopes
- **Key rotation** - Users should rotate keys regularly
- **Expiration** - Set expiresAt for time-limited access
- **Revocation** - Immediate effect via DELETE /api/keys/[id]
- **Audit trail** - All requests logged in ApiRequest table

---

## FAQ

**Q: How long are API keys valid?**
A: By default, keys don't expire unless `expiresAt` is set during creation.

**Q: Can I have multiple keys?**
A: Yes, up to 50 keys per user.

**Q: What happens if I lose my API key?**
A: Revoke the old key and generate a new one. Plaintext keys are never stored.

**Q: Can API keys access NextAuth-protected routes?**
A: No. API keys are for `/api/v1/*` only. Session routes require cookies.

**Q: Are API keys tied to a specific venture?**
A: Optional. You can scope a key to a venture or use it globally.

**Q: How do I monitor API usage?**
A: Use `GET /api/keys/[id]/stats` for detailed analytics.

---

## Support

For questions or issues, contact the platform admin or create a GitHub issue.

**Documentation:** https://stakeandscale.de/docs/api
**API Reference:** https://stakeandscale.de/api/v1/docs (Coming soon)
