# Finance Dashboard — Mobile Fintech App (Expo React Native)

## Key Components (artifacts/finance-dashboard/)
- `components/CreditProfile.tsx` — Full credit intelligence section: `CreditProfileSection` (parent), `CreditScoreOverviewCard`, `CreditHealthCard`, `DebtSummaryCard`, `ScoreFactorsCard`, `PersonalizedRecommendationsCard`. Drill-down modals: `UtilizationModal` (per-card utilization), `PaymentHistoryModal` (calendar), `DebtDrillDownModal` (breakdown pie bar). Bureau layout: Equifax+Experian top row, TransUnion centered below. Supports loading/success/partial/no_data/error states, skeleton shimmer loaders, FadeSlideIn entrance animations.
- `components/WalletCardStack.tsx` — Stacked wallet cards with 3-tab ThemeModal: Pastel (classic+pastel swatch grids + card style), Pattern (10-pattern grid with icons), Custom (rainbow presets + hex picker). Patterns: none, dots, grid, lines, diamonds, hexagon, baroque, art-deco, zigzag, chevron.
- `components/BalanceHeader.tsx` — Top balance summary header
- `app/(tabs)/index.tsx` — Card List screen; renders BalanceHeader → WalletCardStack → SubscriptionsRow → CreditProfileSection → SupportSection
- `app/(tabs)/pay.tsx` — Pay tab with ACH/crypto scheduling, Pay All preview modals, confetti + success overlay with confirmation number (CF-XXXX-XXXX-XXXX), "View Receipt" button, ReceiptModal. Scheduled payments: non-pressable date pill + info icon. Transaction History: (N) button under Money Out → scrolls to list; Pending/Posted toggle (7-day cutoff); type filter row (All/Debit/Credit).
- `app/(tabs)/options.tsx` — Settings tab with KycModal, NotificationsModal, Identity & Compliance, SupportSection (Feedback + Customer Service modals replacing static Support rows).
- `app/card-detail/[id].tsx` — 4 tabs: Rewards & Benefits, Billing Dates, Subscriptions, Transactions (new: dot-ring DonutChart by category + Pending/Posted transaction list toggle).
- `components/SupportSection.tsx` — Shared Feedback + Customer Service section: FeedbackModal (star rating, category, message), CustomerServiceModal (live chat/phone/email/help center + business hours). Used in both index.tsx and options.tsx.
- `context/ThemeContext.tsx` — 7 classic themes + 7 pastel themes, 10 patterns, custom hex color with `effectiveBgStart`/`effectiveBgEnd`; exports `PASTEL_THEMES`, `ALL_THEMES`, `customColorToGradient`
- `context/FinanceContext.tsx` — Cards, transactions, balance state
- `constants/colors.ts` — Design tokens (primary, positive, negative, textPrimary, textMuted, divider, etc.)
- `assets/images/bg-damask.png` — Luxury damask texture background (opacity 0.09–0.13)

## Backend API (artifacts/api-server/)
- `src/routes/credit.ts` — Credit intelligence REST API (mock data): GET /api/credit/{profile,score,health,debt,utilization,payment-history,factors,recommendations}
- `src/routes/auth.ts` — Beta auth: POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
- `src/routes/plaid.ts` — Plaid: POST /api/plaid/link-token, POST /api/plaid/exchange, GET /api/plaid/accounts, POST /api/plaid/processor-token
- `src/routes/stripe.ts` — Stripe: POST /api/stripe/charge, POST /api/stripe/payment-intent
- `src/middleware/auth.ts` — JWT Bearer token middleware (`requireAuth`)
- `src/lib/store.ts` — In-memory Plaid access token + account store (beta only — resets on restart)
- `src/lib/plaid-client.ts` — Plaid Node.js SDK client factory
- `src/lib/stripe-client.ts` — Stripe Node.js SDK client factory

## Auth / Plaid / Stripe Integration
- Auth: JWT-based (jsonwebtoken). Single beta user hardcoded in `routes/auth.ts`. Frontend stores JWT in AsyncStorage via `context/AuthContext.tsx`.
- Plaid: Sandbox mode. Frontend `PlaidLinkedCards` component fetches a link token, opens Plaid Link (web-only via `react-plaid-link`), exchanges the public token server-side. Linked accounts stored in `FinanceContext.plaidAccounts`.
- Stripe: ACH payments via Plaid processor tokens. No raw card/bank numbers ever stored.
- Beta test credentials: email `beta@finapp.com`, password `BetaTest2025!` (changeable via env vars BETA_USER_EMAIL / BETA_USER_PASSWORD)
- Required env vars: JWT_SECRET, PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, STRIPE_SECRET_KEY, EXPO_PUBLIC_API_BASE_URL — see `.env.example`

## Sandbox → Production Migration Guide

### 1. Replace the beta user with real auth
- Remove the hardcoded `BETA_USER` in `src/routes/auth.ts`
- Replace with a real user database (Postgres via `@workspace/db` + Drizzle ORM, or Clerk/Auth0)
- Add user registration, password hashing (bcrypt/argon2), and proper session/refresh token handling

### 2. Plaid: switch from sandbox to production
- In Plaid dashboard: apply for development/production access
- Change `PLAID_ENV=sandbox` → `PLAID_ENV=development` or `PLAID_ENV=production`
- Update `PLAID_SECRET` to the production secret from your Plaid dashboard
- Add webhook handling (`POST /api/plaid/webhook`) for real-time transaction updates
- Persist access tokens to the database instead of the in-memory store (`src/lib/store.ts`)

### 3. Stripe: switch to live keys
- Change `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`
- Change `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` from `pk_test_...` to `pk_live_...`
- Enable Stripe webhooks for payment confirmation events

### 4. Persist Plaid access tokens to database
- The current `src/lib/store.ts` is in-memory only — data is lost on server restart
- Add a `plaid_items` table via Drizzle ORM in `lib/db/src/schema/`
- Update `addPlaidItem` / `getPlaidItems` to read/write the database

### 5. Plaid on native mobile (iOS/Android)
- The current `react-plaid-link` SDK is browser-only
- For native builds, install `react-native-plaid-link-sdk` and create a platform-specific component (`PlaidLinkedCards.native.tsx`)
- Configure OAuth redirect URI in the Plaid dashboard

## Design System
- Glass cards: `backgroundColor: "rgba(28,14,70,0.88)"`, `borderColor: "rgba(255,255,255,0.11)"`, inline `backdropFilter/boxShadow`
- `backdropFilter` and `boxShadow` MUST be inline styles with `as any` cast — NOT in StyleSheet.create()
- `pointerEvents` must be in style object inline `{ pointerEvents: "none" } as any`
- Theme gradient: `#1A103F → #2D1B69`; primary `#6C9EFF`; positive `#4ADEAA`; negative `#FF6B8A`

---

# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
