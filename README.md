# Shoghly — شغلني

Arabic-first, mobile-first foundation for the Shoghly web platform.

## Current scope

This repository contains the Phase 1 application foundation, Phase 2 authentication and account-management integration, and an Arabic-first client-driven MVP experience for task creation, worker submissions, review, and demo reward calculations. Authentication and administrative page access use the existing Phase 2 Supabase Auth and permission checks. Task, submission, review, and reward data in the MVP are browser-local demonstration data, not trusted backend records.

## Requirements

- Node.js 24 or compatible supported LTS release
- npm 11 (lockfile and scripts use npm)

## Local development

1. Start the local Supabase stack using the Supabase CLI and `supabase/config.toml`.
2. Copy `.env.development.example` to `.env.development.local` and set the local Supabase publishable key.
3. Copy `.env.test.example` to `.env.test.local` only when running the local Supabase email-flow E2E test; keep its values pointed at loopback services.
4. Run `npm ci`.
5. Run `npm run dev` and open `http://localhost:3000`.

The server-only environment module validates the app URL and Supabase URL/key. Plain HTTP is accepted only for a loopback URL in development; Supabase URLs containing embedded credentials, query strings, or fragments are rejected. Set `APP_URL` to the exact public application origin; admin mutation Origin checks compare to this configured value and do not trust forwarded host headers. `SHOGHLY_API_URL` names the backend service and is only read by the server-only backend client. The Supabase publishable key is passed only to server-created SSR clients; privileged service-role credentials are never used by the web app. Auth cookies are HttpOnly and SameSite=Lax, and use Secure when `APP_URL` is HTTPS. Do not add secrets to `NEXT_PUBLIC_*` variables or commit local environment files. Protected server routes independently verify the user and permission.

## Authentication and local database

`supabase/migrations/20261106000100_phase2_auth_and_rbac.sql` defines the auth profile trigger, account status, seeded roles and permissions, administrative audit events, row-level security, and narrowly granted database functions. A previous local CLI startup automatically applied this migration to a Shoghly-named Docker volume; that volume remains and its migration state has not been verified. Do not treat it as a fresh disposable database or run a reset against it.

The follow-up migration `20261106000200_phase2_owner_invariant_serialization.sql` serializes administrative role and status mutations and rechecks permissions after acquiring its transaction-scoped lock. This protects the final active security-owner invariant against concurrent role or status changes. Its pgTAP regression guards were added to the Phase 2 suite; runtime database and concurrency validation remain pending.

**Local Supabase port binding is not approved on this machine yet.** The previous CLI startup published services on wildcard host interfaces even though it was passed a Docker network configured with `host_binding_ipv4=127.0.0.1`. The CLI's `--network-id` option and the URLs printed by the CLI are not proof of safe bindings. Do not run `npx supabase start`, database commands, or Auth integration tests until a compatible setup explicitly binds every published port to `127.0.0.1` and `docker inspect` confirms every actual host binding. The Supabase CLI help currently exposes no per-port host-IP setting. Do not substitute the distinct self-hosted Compose deployment without validating compatibility with this local-development test workflow.

The CLI telemetry permission issue can be avoided for a command invocation without changing global filesystem permissions by setting the supported opt-out in the current PowerShell session: `$env:SUPABASE_TELEMETRY_DISABLED = '1'`. The pgTAP checks live in `supabase/tests/database/phase2_auth_rls.test.sql` and have not yet passed in an isolated local database.

Local email verification and recovery use Supabase Auth plus the local Inbucket/Mailpit inbox configured by the Supabase CLI. The app callback uses the configured `APP_URL`; configure matching local redirect URLs in the local Auth settings. For a hosted environment, set its Auth site URL, exact redirect allowlist, email confirmation behavior, and SMTP provider separately in that environment. This repository does not contain SMTP credentials.

The one-time initial security-owner bootstrap is deliberately separate from the app runtime. After the target local user has registered and confirmed their email, place the local-only service-role key and verified target user UUID in the ignored `.env.local`, then run `npm run bootstrap:admin`. The script refuses non-loopback Supabase URLs and requires `APP_ENV=development`. Never use a production or staging key for bootstrap.

Staging and production should use separate deployment-level environment settings. The checked-in `.env.staging.example` and `.env.production.example` contain placeholders only; copy values into the matching secure deployment configuration, never into a committed `.env` file. No staging or production database has been accessed or configured.

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright starts the production server, so build before running the browser tests. The local Supabase auth-flow test is skipped unless `SUPABASE_TEST_URL` is loopback and local publishable key/Mailpit settings are provided. The ordinary smoke tests run without Supabase and verify the app fails closed when auth is unconfigured. The database migration and pgTAP suite require a locally running Supabase CLI stack.

## UI foundation

- Next.js App Router and TypeScript
- Tailwind CSS v4 and shadcn/ui-compatible configuration/primitives
- Arabic document language and RTL direction at the root
- Responsive navigation, keyboard focus treatment, skip link, and reduced-motion support
- Shared color, typography, and spacing foundations in `src/app/globals.css`

## Client-driven MVP demonstration

- Sign in with a verified account to open `/dashboard` and `/tasks`.
- Administrators with `task.manage.read` can view `/admin`; task creation requires `task.manage.write`. Review requires the task review read, approve, and reject permissions.
- The isolated development Demo Mode stores its own task, evidence, review, and reward examples in a separate local browser key. Ordinary signed-in pages do not use browser storage for task approvals or rewards while the backend is unconnected.
- The demonstration uses the client-provided 250 IQD base by default and multiplier 1 because no verified subscription/package terms are connected. The approval interval is checked locally and does not prevent concurrent or manipulated approvals.
- Evidence attachments are not enabled; workers can submit text and an HTTPS evidence link. Rejected attempts cannot be retried until task retry policy is configured.
- Balance and approved reward history are provisional. Deposits, withdrawals, checkout, and payment confirmations are disabled. User-count statistics and subscription data show unavailable states when no trusted data source exists.
- A trusted database/API, private evidence storage, authoritative entitlement and reward rules, and financial ledger/payment/payout workflows are required before production use. The API layer is prepared but the screens are not yet wired to it; they show an unavailable state and reject local mutations rather than implying success.

## Safe local Demo Mode

Run `npm run demo` and open `http://127.0.0.1:3000`. This mode is opt-in and does not require Supabase configuration or a database. The launcher binds the development server to loopback and sets the explicit local demo flag. Runtime access additionally requires `NODE_ENV=development`, `APP_ENV=development`, `SHOGHLY_DEMO_MODE=true`, and a loopback Host header; the check fails closed in production. The demo switch endpoint is unavailable unless all those conditions pass.

Use the banner to switch between `DEMO WORKER`, `DEMO TASK ADMIN`, and `DEMO REVIEWER`. The two admin demo accounts are separate so a task creator cannot review their own task, preserving the existing review rule. Create a task as the task admin, submit evidence as the worker, approve or reject as the reviewer, then return to the worker to see the status, local demo reward, 24-hour eligibility display, and fixed 1× multiplier. New demo tasks use the existing 250 IQD base reward.

Demo tasks and submissions use a separate browser storage key (`shoghly.mvp.local-demo.v1`) and are clearly labeled DEMO. They do not enter the ordinary MVP local data namespace. Balances and rewards are illustrative browser-local values only. Deposit, withdrawal, and payment actions remain unavailable; no financial transaction is performed. Use `npm run test:e2e:demo` to run the local browser walkthrough.

## NestJS backend foundation

The isolated `backend/` project provides a NestJS REST API, Prisma/PostgreSQL schema, server-side Supabase Auth token verification, permission checks using the existing Phase 2 `has_permission` RPC, task versions, submissions/evidence metadata, review transactions, quota reservations, verified-subscription reads, reward-ledger reads, audit records, and health checks. It uses the Supabase access token only as a bearer credential; the caller cannot submit an identity to impersonate another user. The Auth server verifies the token, and the API derives the subject from its verified response. It does not use a service-role key.

Copy `backend/.env.example` to `backend/.env` and set only local disposable values. `REWARD_MULTIPLIER_SNAPSHOT_POLICY` is intentionally required and must be set to `submission` or `approval` only after the product owner confirms the snapshot point. There are no seeded packages, prices, or multipliers. The local migration wrappers refuse non-loopback databases and database names other than `shoghly_backend_disposable` or `shoghly_backend_test`.

Install and run the API with `npm install --prefix backend`, `npm run backend:prisma:generate`, then `npm run backend:start:dev`. Validate with `npm run backend:build`, `npm run backend:test`, and `npm run backend:prisma:validate`. A local migration can run only after a new disposable database has been provisioned safely: `npm run backend:prisma:migrate:dev`. No local database has been created or migrated here because the existing Supabase Docker volume is not verified as disposable and its previous port bindings were unsafe. Do not point these commands at that volume.

All mutating API operations require an `Idempotency-Key`; submission plus quota reservation is one transaction, approval plus quota consumption and reward-ledger entry is one transaction, and rejection plus reservation release is one transaction. Approvals lock a per-user gate row in PostgreSQL and recheck the rolling 24-hour rule inside the transaction. The quota grant model reserves at submission, consumes on approval, releases on rejection, and preserves reservations across expiration while pending. Free lifetime quota is five approved tasks; paid subscription grants are supported as backend data only, without payment or package-value assumptions.

Before a live deployment: provision separate production PostgreSQL and Supabase Auth environments; confirm asymmetric key/JWKS policy or keep Auth-server `getUser` verification; choose the multiplier snapshot point and any fractional-IQD rounding rule; verify role grants and database least-privilege; configure HTTPS, exact CORS origin, TLS database URLs, connection limits/pooling, secrets management, log retention/redaction, health monitoring, backup/restore, and a release-time `prisma migrate deploy` procedure. No frontend screen has been switched from Demo Mode to this API yet, and the backend has not been connected to a database or deployed. Deposit, withdrawal, payment, and payout operations remain disabled.

## Security notes

- No privileged credentials or service-role keys are checked in.
- Runtime configuration is validated in server-only code.
- `.env*` files are ignored, except safe committed examples.
- Supabase auth keys are validated as server-only configuration; privileged owner bootstrap requires a local-only service-role key and explicit verified user UUID.
- Every app-owned table in the migration has RLS enabled, and client writes to role, permission, and audit tables are revoked.
- Admin mutation routes require same-origin requests and database permission checks.
- Mutation payloads have explicit size limits; the app also sends baseline security headers. Production HSTS is emitted only when production `APP_URL` uses HTTPS.
- Login failures use a generic response to reduce account enumeration; Supabase Auth provider rate limits remain an operational requirement.
- A Content Security Policy is not configured yet. Add a nonce-aware policy after confirming the app’s required script and Supabase connection origins; avoid deploying a permissive inline-script policy as a shortcut.
- No migration was run and no remote service or database was accessed during implementation.
