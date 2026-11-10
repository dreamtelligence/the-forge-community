# API key module

Last reviewed: 2026-11-10. This module contains API-key management and authentication infrastructure. It is not a completed external generation API.

## Current surface

- [Management routes](../../app/api/keys/route.ts): session-authenticated creation and listing, plus per-key update, revocation and usage statistics under `app/api/keys/[id]/`.
- [Management UI](../../app/settings/api-keys/page.tsx): key creation, one-time plaintext display and key statistics.
- [Authentication helper](auth.ts): bearer extraction, format/hash lookup, active/expiry checks, hourly/daily quotas, scope checks and request logging.
- [Types](types.ts): scope vocabulary and contracts. A defined scope does not mean a corresponding endpoint exists.
- [Crypto helpers](crypto.ts): random keys, SHA-256 key hashes and HMAC-SHA-256 signatures.
- [Public API status page](../../app/docs/api/page.tsx): available and unavailable functionality.

`POST /api/v1/media/generate-image` returns **501 / NOT_IMPLEMENTED** without authentication, quota, database, provider or credit operations. Its former example returned a fake URL while charging real credits. It must remain unavailable until connected to a real provider flow with settlement/refund and authorization coverage. External video, content, file and venture endpoints listed in the former guide are not implemented. Authenticated Marketing Studio routes are separate.

## Key handling

Keys have the shape `forge_[prod|test|dev]_[43 base64url characters]`, generated from 32 random bytes. Database records retain a SHA-256 hash and a display prefix; only creation returns the plaintext key. Never log or commit plaintext keys. Use `YOUR_FORGE_API_KEY` as a documentation placeholder.

Creation verifies a supplied venture's owner/squad membership, accepts configurable limits and expiry, and caps keys at 50 per user. The absence of an expiry means the key does not automatically expire. Runtime authorization must continue to validate resource ownership; schema/RLS supplements alone do not establish complete tenant isolation.

`verifyApiKey` compares decoded hashes in constant time after strict hex-format validation. The authentication path currently looks up the key hash directly in PostgreSQL; it does not call this comparison helper. HMAC helpers currently have no route callers; the Replicate webhook uses its separate verification boundary. Do not infer an outbound webhook delivery system from these utilities.

## Checks and integration limits

```bash
npm run test:api-key:crypto
npm run test:external-api:availability
```

Crypto checks use the published [RFC 4231 section 4.3 HMAC-SHA-256 vector](https://www.rfc-editor.org/rfc/rfc4231.html#section-4.3), tampered values and malformed hex. The availability check calls the actual external handler and asserts a non-billable 501 response without network access.

Real key CRUD, database quotas, concurrent requests, expiry/revocation and complete resource authorization still need integration tests against a dedicated database. No production-readiness claim is made by this guide. The old implementation template and roadmap are available in Git history; current credit orchestration lives in [lib/ai/application](../ai/application/) and [lib/finance](../finance/).
