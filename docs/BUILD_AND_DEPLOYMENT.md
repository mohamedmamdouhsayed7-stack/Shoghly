# Build and deployment compatibility

## Supported toolchain

- Node.js `24.20.0` (pinned in `.nvmrc`; both apps enforce Node 24).
- npm `11.19.0` (declared through `packageManager` in the root and backend manifests).
- The root and `backend/` each have an independent npm v3 lockfile. Keep this two-application layout; do not install the backend from the root lockfile.

Node 22 is not selected because its maintenance lifecycle ended on October 20, 2026. Node 24 is the common maintained line for the checked Next.js, NestJS, Prisma, and Vitest versions.

## Clean installation and commands

From the repository root:

```sh
npm ci
npm --prefix backend ci
```

Equivalent helpers are `npm run install:frontend`, `npm run install:backend`, and `npm run install:all`. Do not replace `npm ci` with an unlocked install in CI.

```sh
npm run dev
npm run backend:start:dev
npm run typecheck
npm run lint
npm test
npm run build
npm run backend:prisma:generate
npm run backend:prisma:validate
npm run backend:test
npm run backend:build
```

Run the web and API as separate processes. The root Next.js dev server does not launch the NestJS API. The existing Demo Mode remains a frontend-only local demonstration and must not be confused with real backend connectivity.

## Environment and Prisma

`backend/.env.example` contains placeholders only. Copy it to the ignored `backend/.env` for local work. `DATABASE_URL` is the application/runtime URL. With Neon, use its pooled connection URL for runtime and its direct connection URL for Prisma migrations as `DIRECT_URL`. The example values point to loopback and are not production credentials. `APP_ENV`, `PORT`, `FRONTEND_ORIGIN`, the existing Supabase Auth URL/publishable key, and the confirmed reward snapshot policy are also required by the current backend config parser.

`prisma generate` uses schema and engine binaries, but it does not connect to PostgreSQL. `prisma validate` also needs no live database. Prisma 6's engine download requires network access to `binaries.prisma.sh` on a clean machine. Do not run migrations against unknown, hosted, production, or staging databases. Migration wrappers only permit the explicitly named loopback disposable/test database targets.

The checked-in Prisma schema now has required auth profile columns and auth/session tables, while the current checked-in backend migration still creates the earlier minimal `users` table and does not create those auth tables. The runtime guard therefore fails closed unless a matching app user already exists, and database-backed authentication cannot be considered deployable until an additive migration is authored, reviewed, and separately authorized for application to a disposable database. No migration was generated or run as part of compatibility repair.

## Native install scripts

Argon2 includes a native binding. Backend `allowScripts` explicitly approves `argon2@0.44.0` and the pinned Prisma 6.19.3 client/engine install scripts so hardened npm installations can build the native password hash module and generate Prisma Client. Do not globally disable lifecycle scripts; do not substitute a weaker password hash if the native module cannot install. A clean backend install must have network access to the npm registry and the Prisma engine host (or a compatible cached engine).

The unused Nodemailer runtime package was removed. The backend lockfile updates `@nestjs/platform-express` to 11.2.9 and Multer to 2.5.0, the available nonbreaking fix for the current Multer advisory. The current npm audit still reports three high advisories through `deepmerge-ts` 7.1.5 under Prisma 6.19.3's CLI/config toolchain; npm's suggested fix requires a Prisma 7 major upgrade. Prisma's major version is intentionally unchanged, and the remaining toolchain finding needs a separate compatibility review before upgrading. The frontend runtime audit reports zero vulnerabilities.

## Google AI Studio assessment

The repository is a monorepo with two independently locked applications. Google AI Studio Build Mode documents importing GitHub projects, installing npm packages, server-side Node execution, and secrets support; that does not establish automatic multi-process startup for this Next.js + NestJS layout. A root-level preview can start Next.js while leaving the NestJS API stopped. No AI Studio build log was provided that would prove a specific package is the source of its reported installation failure. The local installation diagnosis therefore confirms the packages and lockfiles are installable in the verified local environment; the exact AI Studio-specific failure remains unproven.

For a faithful functional deployment, use separate frontend and API services (or a host that explicitly supports supervising both processes), provide each service only its needed environment variables, and allow the API to reach the chosen PostgreSQL endpoint. Do not merge backend code into Next.js or imply that a frontend-only preview has live authentication, task, reward, or database behavior. A full monorepo preview on AI Studio remains unverified; a multi-service capable host such as separate Cloud Run services is a safe architectural option, subject to provider setup and review.

## Deployment separation and safety

Use distinct development, staging, and production secrets and database instances. Never copy local credentials across environments. Keep backend/database secrets out of `NEXT_PUBLIC_*` variables and source control. Do not deploy until the outstanding auth-schema migration, frontend/API integration, permissions, and production operational controls have been reviewed. Payment, deposits, withdrawals, and payouts remain unavailable.
