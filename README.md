# Shoghly — شغلني

Arabic-first, mobile-first foundation for the Shoghly web platform.

## Current scope

This repository contains the Phase 1 application shell, design foundation, server-only environment validation, code-quality configuration, and initial test/CI setup. It has no authentication, task, evidence, reward, entitlement, wallet, payment, subscription, admin-review, or Supabase integration functionality.

## Requirements

- Node.js 24 or compatible supported LTS release
- npm 11 (lockfile and scripts use npm)

## Local development

1. Copy `.env.development.example` to `.env.development.local`.
2. Run `npm ci`.
3. Run `npm run dev` and open `http://localhost:3000`.

Safe environment values are validated by `src/lib/env.ts`, which is marked server-only. Do not add secrets to `NEXT_PUBLIC_*` variables or commit local environment files. There is no Supabase connection in this phase.

Staging and production should use separate deployment-level environment settings. The checked-in `.env.staging.example` and `.env.production.example` contain placeholders only; copy their values into the matching secure deployment configuration, never into a committed `.env` file.

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

Playwright starts the production server, so build before running the browser tests.

## UI foundation

- Next.js App Router and TypeScript
- Tailwind CSS v4 and shadcn/ui-compatible configuration/primitives
- Arabic document language and RTL direction at the root
- Responsive navigation, keyboard focus treatment, skip link, and reduced-motion support
- Shared color, typography, and spacing foundations in `src/app/globals.css`

## Security notes

- No privileged credentials or service-role keys are present.
- Runtime configuration is validated in server-only code.
- `.env*` files are ignored, except safe committed examples.
- No database, migration, authentication, or external service access is configured.
