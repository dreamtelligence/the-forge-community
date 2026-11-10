# Repository review — 10 November 2026

This review covers repository presentation, documented boundaries, dependency advisories and selected executable workflows. It is not an acceptance test of every product module.

## Changes

- Replaced the duplicate long-form project guide with a documentation index and current working instructions. The root `AGENTS.md` now points to those instructions. Previous document versions remain in Git history.
- Added a representative product screenshot and a source-to-test review path to the main README. The screenshot is dated April 2026; its model labels are historical.
- Removed an agent paste and generated supplier/contact exports from the current tracked tree. Export copies were retained locally, and the supplier export now targets ignored `local-exports/supplier-contacts/`. Historical commits still contain the previous exports; history was not rewritten.
- Replaced dummy key strings with explicit placeholders. The full-history secret scan found four documentation/example matches, not verified live credentials; the current source tree was checked separately after cleanup.
- Updated compatible Blob and transitive security dependencies. Kept ESLint 9's callable minimatch 3 API, patched its brace dependency, and scoped minimatch 11 to the TypeScript parser/modern glob branches. A targeted Zod override patches Vercel's configuration dependency.
- Corrected the unused HMAC utility to use Node's `createHmac`, and reject malformed hex before constant-time comparison. No current route calls the signing helper; Replicate verification uses a separate boundary.
- Disabled the legacy external image-generation example with an immediate non-cacheable **501 / NOT_IMPLEMENTED** response. It previously returned a fake URL while reserving and settling real credits. The current handler imports no authentication, quota, credit, database or provider services. The real authenticated Marketing Studio flow is separate.
- Rewrote the external API page/module guide to describe actual availability instead of promising unimplemented endpoints.
- Fixed React declaration order, moved a nested YouTube component to module scope and corrected navigation calls. Link previews now load on URL changes rather than on every render. Preserved existing request validation, error handling and credit orchestration.
- Added crypto and unavailable-endpoint regression checks, plus existing legacy workflow checks and full linting to CI.

## Verification

Local checks used Node.js 24 and npm 10.9.4:

- Clean `npm ci`; Prisma client generation without migration or database writes.
- Architecture guard: migration supplement layout, module boundaries, thin routes and warehouse isolation.
- Full ESLint and TypeScript checks.
- Warehouse boundary, marketing media, legacy Replicate and repeated webhook delivery tests.
- Crypto checks using the [RFC 4231 section 4.3 reference vector](https://www.rfc-editor.org/rfc/rfc4231.html#section-4.3), tampering and malformed hex. The same test fails against the previous implementation.
- The actual disabled external handler returns 501 and no generated result/credit fields without network access.
- Browser check of the actual LinkPreview component with controlled HTTP responses: one initial request, no extra requests after three parent renders, one request for a new URL, visible fallback after HTTP 503, no page errors.
- `npm audit`: **15 findings before, 0 after** at review time. This is a package-advisory snapshot, not a complete security assessment.
- Current documentation links and ignored export paths checked. Full current-tree Gitleaks scan: no findings.
- Configured Vercel production build passed for the final runtime changes: [staged deployment](https://the-forge-community-e6m7toumf-bucci369s-projects.vercel.app). Its actual external API returned 501 / NOT_IMPLEMENTED; its API page rendered the corrected availability notice. The candidate was built before changing the public domain.

## Remaining limits

GitHub Actions was blocked before job execution by the account's billing/spending restriction at review time. Local checks are the available execution evidence; this report does not claim hosted CI passed.

No live key creation, real payment, paid AI generation, seed/import/export operation or database migration was performed. Complete tenant isolation, concurrent quota/ledger behavior, webhook recovery, OAuth/email delivery, legal/financial validity and load behavior require separate integration and operational acceptance. The external generation API remains unavailable until its real implementation and financial failure paths are tested.
