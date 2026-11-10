# Repository working guide

Applies to the whole repository through the root `AGENTS.md`. Last reviewed: 2026-11-10.

## Read before editing

- [Root README](../README.md): setup, supported runtime and verification limits.
- [Repository boundaries](architecture/repo-boundaries.md): enforced directory and route rules.
- [Modular monolith decision](architecture/modular-monolith.md): why this is one deployable.
- Query Semantica for relevant project decisions before non-trivial changes; verify them against current code. Record durable findings after verification.
- Read callers, contracts and tests before moving or changing a shared function. Keep unrelated work and the user's branches intact.

## Structure

- `app/`: pages, HTTP mapping and server actions. `components/`: product UI composition. Do not introduce `app/components/`.
- `lib/<domain>/`: domain rules and services. Core modules use `contracts`, `domain`, `application`, `infrastructure`; root `lib/*.ts` is frozen by the architecture allowlist.
- `shared/`: cross-cutting UI and integration bridges; no Prisma or domain imports.
- `scripts/`: grouped operational/check tools, not hidden business logic. Python goes in `scripts/python/`.
- `public/`: lowercase-kebab-case top-level folders. Screenshots belong in `public/docs/screenshots/`; demo media in `public/media-demos/`.
- `prisma/migrations/`: canonical schema history. `prisma/manual_sql/`: uniquely numbered manual supplements, not another migration chain.
- Do not add backup copies, generated business exports or agent paste files to source control. Supplier exports belong in ignored `local-exports/supplier-contacts/`.

## Boundaries to preserve

- Authenticate on the server and enforce user/venture/customer/operator ownership at each application boundary. RLS files do not prove that every Prisma query is tenant-safe.
- Keep marketing media, legacy Replicate and webhook routes thin. Delegate orchestration and persistence to the existing application/infrastructure modules.
- Reserve credits before generation; preserve settlement/refund behavior and repeated-delivery protection. Job receipts and webhook-delivery receipts have distinct purposes.
- Provider-bound media and crypto/blob webhooks need explicit `runtime = 'nodejs'` and `maxDuration` where required by the architecture check.
- Never expose deployment secrets, connection strings, access tokens or business-data exports. `.env.example` contains placeholders only.
- Do not change provider defaults, pricing, billing semantics or authentication to fix unrelated lint/docs issues. Current model definitions live in `lib/ai/text-models.ts` and provider modules.
- Deployment, migrations, seed/import/export tools and live smoke tests can write data or spend money. Inspect them first and use an authorized dedicated environment. Do not use `prisma db push` on existing deployments.

## Validation

Use Node.js 24 and npm 10.9.4 (see `package.json`), then `npm ci` and `npx prisma generate`.

```bash
npm run check:architecture
npm run typecheck
npm run test:warehouse:boundary
npm run test:marketing:media
npm run test:legacy:replicate
npm run test:webhook:replicate
npm run test:api-key:crypto
npm run test:external-api:availability
```

Run ESLint on changed source files; `npm run lint` checks the whole repository. Run a configured production build for runtime/dependency changes. Tests above use controlled dependencies; they do not prove live provider, payment, email or complete tenant-isolation behavior. The `test:smoke:*` scripts require separate service credentials and can create records or paid jobs.

Keep commands, links and review evidence accurate. Historical deployment reports, legal templates and financial modules are not proof of present production readiness or legal validity. Previous versions of this guide and the former duplicate project README remain in Git history.
