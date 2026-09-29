# Tradie Enquiry Desk

Rivergum Plumbing — Portfolio Concept. A fictional Australian plumbing website and an isolated owner demo, built with React, TypeScript, Vite, a Cloudflare Worker, D1 and an optional Workers AI adapter.

The workflow is **enquiry → saved record → job brief and draft → owner approval → simulated outbox → 48-hour follow-up**. No quotes, appointments, emails or SMS are actually sent or booked. Use fictional information only.

## Run locally

Requires Node.js 24 LTS and npm. Commands work in PowerShell and other standard shells.

```sh
npm ci
npm run db:init
npm run dev
```

Open http://127.0.0.1:5173. Local D1 persists under `.wrangler/state`; no Cloudflare login or credentials are needed. The checked-in configuration defaults to template mode. `.dev.vars.example` documents the optional local setting; copying it is unnecessary for the default setup.

```sh
npm test
npm run typecheck
npm run test:e2e
npm run build
```

The browser tests use Microsoft Edge on this Windows environment. On another machine, set `channel` in `playwright.config.ts` to an installed Chrome/Edge channel, or omit it and run `npx playwright install chromium`. Playwright starts the application if needed; initialise the database first. Tests create their own fictional workspaces. Screenshots are saved in `docs/screenshots/`.

## Architecture

- `src/`: public website, validated intake form, dashboard, enquiry detail. Hash navigation keeps static hosting simple. Customer and model output are rendered as text.
- `shared/domain.ts`: field/schema validation, statuses, editable suburb allowlist, deterministic service-area and follow-up rules. Brisbane display, UTC storage.
- `worker/index.ts`: same-origin JSON API, random HttpOnly workspace cookies, every resource scoped to its workspace, bounded requests and usage, transactional mutations.
- `worker/ai.ts`: structured Workers AI adapter and deterministic template mode. Original form data remains immutable; suggestions are separate. Retrying never silently replaces a draft.
- `migrations/`: D1 schema, uniqueness rules and limits. Approval uses a client action UUID, an immutable outbox snapshot, an activity event and at most one open follow-up in a single D1 transaction.

The demo clock changes only business time in one workspace. Real time still governs request limits. Won/Closed cancel open tasks. Reopen through an explicit status change and approve again to create a new follow-up. Reset restores six fictional samples only in the current workspace. A daily scheduled handler removes workspaces older than seven days.

## AI modes and limits

**Template mode — live AI not connected** works locally without credentials. It uses supplied fields and a quoted excerpt of the original message; it does not claim live reasoning.

**Live AI** requires a server-side `AI` binding, `AI_MODE=live`, and a configurable `AI_MODEL`. The default model is `@cf/meta/llama-3.1-8b-instruct`, listed by Cloudflare as supporting [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/). Live results are strictly schema-validated, bounded and checked for obvious unsafe commitments. A failed call leaves the enquiry and draft intact. All suggestions require owner review; semantic accuracy is not guaranteed by schema validation.

No automatic provider retries: each owner action allows one call, a 15-second application wait, at most five attempts per enquiry, ten live attempts per real hour per workspace and a conservative global limit of 50/day (configurable up to 100). Timing out stops waiting and discards the result; the provider may finish the already-started inference. Limits persist across demo resets. Enquiries, approvals and activity are capped at 100, 300 and 2,000 per workspace; new workspace creation is capped at 200/day across the demo.

Workers AI includes a [free daily allowance](https://developers.cloudflare.com/workers-ai/platform/pricing/); model usage, Worker requests and D1 operations also have platform limits. This project does not upgrade plans or attach billing. Keep the account on the Workers Free plan; when limits are reached, live inference can fail and manual drafting remains available. Real deployments need stronger abuse protection, monitoring, a privacy/retention policy and production authentication before collecting real customer data.

## Deploy when authorised

Deployment was not performed as part of local development. Use a Cloudflare **Free** account and its `workers.dev` subdomain; no domain purchase is necessary.

```sh
npx wrangler login
npx wrangler d1 create tradie-enquiry-desk
```

Replace the placeholder `database_id` in `wrangler.jsonc` with the created database UUID, then:

```sh
npm run db:remote
npm run deploy
```

To enable live AI, add `"ai": { "binding": "AI" }` at the top level of `wrangler.jsonc` and set `vars.AI_MODE` to `"live"` before building/deploying. Keep local development in template mode without the remote AI binding when working offline. Never put account tokens or private bindings in browser code. JSON mode can return either a structured object or a JSON string; both are validated.

After deployment, verify the actual `workers.dev` URL, the full sample workflow, production Secure cookie and live AI status. A successful build alone is not proof of a successful deployment or live inference. Current evidence is recorded in `docs/VERIFICATION.md`.
