# Documentation

Start with the [project README](../README.md) for the product, setup and runnable checks. This index separates maintained engineering guidance from dated plans and evidence.

## Review path

1. [Repository boundaries](architecture/repo-boundaries.md) and [modular monolith decision](architecture/modular-monolith.md).
2. [Marketing media use case](../lib/ai/application/start-marketing-media-generation.ts), its [HTTP route](../app/api/ventures/%5Bid%5D/marketing/media/route.ts) and [workflow tests](../scripts/tests/test-marketing-media-flow.ts).
3. [Replicate webhook receipt handling](../lib/ai/application/handle-replicate-webhook-receipt.ts) and [repeated-delivery tests](../scripts/tests/test-replicate-webhook-receipt.ts).
4. [Data model](../prisma/schema.prisma), [credit services](../lib/finance/energy.ts) and [warehouse boundary tests](../scripts/tests/test-warehouse-boundary.ts).
5. [Development rules](AGENTS.md) and the [November repository review](evidence/recruiter-review-2026-11.md).

## Operations and historical material

| Document | Scope |
| --- | --- |
| [Deployment security](DEPLOYMENT-SECURITY.md) | Deployment configuration and operational checks; validate against your environment. |
| [Smoke-test plan](SMOKE_TEST_PLAN.md) | Live-service checks; can create records and paid provider jobs. |
| [Evidence index](evidence/README.md) | Dated security, privacy and deployment records. Past results are not fresh verification. |
| [Warehouse integration plan](LAGERHUB_INTEGRATION_PLAN.md) / [evidence](LAGERHUB_PROFESSIONAL_EVIDENCE.md) | Historical module plan and evidence. |
| [Integrations](INTEGRATIONS.md) | Integration notes; availability depends on current provider configuration. |
| [Model reference](AI_MODELS_QUICK_REFERENCE.md) / [AI overview](THE_FORGE_AI_OVERVIEW.md) | Dated background. Current defaults are defined in [text-models.ts](../lib/ai/text-models.ts). |
| [Provider/BYOK plan](MULTI_PROVIDER_BYOK_PLAN.md) | Design proposal, not a statement that all providers are live. |
| [Performance analysis](PERFORMANCE_ANALYSIS.md) / [mobile QA](mobile-qa.md) | Historical observations and checklists. |
| [Change log](CHANGELOG.md) / [archived SQL](archive/db/) | Historical changes and database snapshots. |

The previous long-form `docs/README.md` and agent guide are retained in Git history. Use the root README, source and architecture checks for current setup; older claims about closed-beta access, package versions or test coverage may no longer apply.

Generated supplier/contact exports are local operational data, not documentation. The export script now writes to ignored `local-exports/supplier-contacts/`; copies previously tracked in `docs/` were removed from the current tree. Earlier commits still contain those historical exports.
