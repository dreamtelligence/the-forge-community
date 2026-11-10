# Archived landing showcase

The Stake & Scale product is discontinued. Keep the landing visual design as a portfolio reference at https://the-forge-community.vercel.app.

Production behavior:
- Only /, /en, the existing imprint/privacy/terms pages and public media assets are available.
- proxy.ts denies every other application route, all /api/* routes, Server Actions, login endpoints and non-read-only HTTP methods with 410 Gone.
- All Vercel crons were removed from vercel.json.
- Login controls, pricing and the registration form were removed from the public landing.
- Tracking and authentication providers were removed from the public root layout.
- The original full-stack modules remain in Git history and source control, but must not be enabled without a separate review.

Operational notes:
- Verify that the production deployment has no scheduled cron jobs.
- Keep Vercel Authentication enabled for previews while making production available publicly.
- If custom domains should no longer display this portfolio, detach or redirect them separately.
- Check /, /en, /login, /dashboard, /api/auth/session, /api/cron/ai-news, and POST / after each deployment.
- A 410 status is not a substitute for deleting or disabling external webhooks or external provider workflows. Revoke external integrations if the product is retired permanently.
