# CardFlow — Fintech Beta

A mobile-first fintech app built with **Expo (React Native)** + **Express** in a pnpm monorepo. Links real bank accounts via Plaid, processes payments via Stripe, and displays each account as a card in a rolodex-style UI.

---

## Quick Start (Sandbox)

1. Copy `.env.example` to `.env` and fill in your keys (see below).
2. The API server and Expo app start automatically via Replit workflows.
3. Open the app preview and scroll to **Linked Banks**.
4. Press **Link Bank** → sign in with the beta account → link a sandbox bank.

**Beta credentials (default):**
- Email: `beta@finapp.com`
- Password: `BetaTest2025!`

Override via `BETA_USER_EMAIL` / `BETA_USER_PASSWORD` environment variables.

---

## Environment Variables

See `.env.example` for the full annotated list. The key variables are:

| Variable | Used By | Notes |
|---|---|---|
| `JWT_SECRET` | API Server | Random 64-byte hex string |
| `PLAID_CLIENT_ID` | API Server | From Plaid Dashboard |
| `PLAID_SANDBOX_SECRET` | API Server | Plaid sandbox secret (checked first) |
| `PLAID_ENV` | API Server | `sandbox` \| `development` \| `production` |
| `STRIPE_SECRET_KEY` | API Server | `sk_test_…` for sandbox |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile App | URL of the API Server artifact |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Mobile App | `pk_test_…` for sandbox |

---

## Plaid + Stripe: Sandbox → Production Migration

### 1. Replace the beta user with real auth

The current system uses a single hardcoded user in `artifacts/api-server/src/routes/auth.ts` for beta testing only.

**Steps:**
- Remove the `BETA_USER` constant from `routes/auth.ts`
- Connect a real database (PostgreSQL via `lib/db` + Drizzle ORM is already scaffolded)
- Add a `users` table with hashed passwords (`bcrypt` or `argon2`)
- Update `POST /api/auth/login` to query the database
- Add `POST /api/auth/register` for user sign-up
- Consider an auth provider (Clerk, Auth0) to skip this entirely

### 2. Persist Plaid access tokens to the database

Currently `artifacts/api-server/src/lib/store.ts` uses an **in-memory Map** — all linked banks are lost every time the server restarts.

**Steps:**
- Add a `plaid_items` table to `lib/db/src/schema/`:
  ```sql
  CREATE TABLE plaid_items (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    item_id     TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,   -- encrypt at rest in production
    institution_name TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
  );
  ```
- Update `addPlaidItem`, `getPlaidItems`, and `getPlaidAccessToken` in `store.ts` to query this table instead
- **Encrypt `access_token` at rest** using AES-256 or a KMS before storing

### 3. Switch Plaid from sandbox to production

**Steps:**
1. Apply for Plaid **Development** access at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Once approved, apply for **Production** access
3. Update environment variables:
   ```
   PLAID_ENV=production
   PLAID_SANDBOX_SECRET=           # leave blank or remove
   PLAID_SECRET=your_live_secret   # add this
   ```
4. Add a Plaid webhook endpoint (`POST /api/plaid/webhook`) to handle:
   - `ITEM_LOGIN_REQUIRED` — prompt user to re-authenticate
   - `TRANSACTIONS_SYNC` — update transaction history in real time
5. Register the webhook URL in the Plaid Dashboard → Webhooks

### 4. Switch Stripe from test to live

**Steps:**
1. Complete Stripe's identity verification in [dashboard.stripe.com](https://dashboard.stripe.com)
2. Update environment variables:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
3. Register webhook endpoint for Stripe events:
   ```
   POST /api/stripe/webhook
   ```
   Handle: `charge.succeeded`, `charge.failed`, `payment_intent.succeeded`
4. Enable **Stripe Radar** fraud rules in the dashboard

### 5. Add Plaid support for native mobile (iOS / Android)

The current Plaid integration is **web-only** (uses `react-plaid-link` which runs in a browser WebView).

**Steps:**
1. Install [`react-native-plaid-link-sdk`](https://github.com/plaid/react-native-plaid-link-sdk)
2. Create `artifacts/finance-dashboard/components/PlaidLinkedCards.native.tsx` (Expo picks `.native.tsx` on iOS/Android and `.web.tsx` on web automatically)
3. Follow the Plaid native SDK docs to configure OAuth redirect URIs

### 6. Security hardening checklist

- [ ] Replace in-memory store with encrypted database records
- [ ] Rotate `JWT_SECRET` and set short expiry + refresh token flow
- [ ] Tighten CORS in `src/app.ts` to your domain only
- [ ] Add rate limiting (`express-rate-limit`) to `/api/auth/login` and payment endpoints
- [ ] Run dependency audit (`pnpm audit`) before release
- [ ] Enable HTTPS-only cookies if switching to session-based auth

---

## Architecture

```
pnpm monorepo
├── artifacts/api-server/     Express 5 + JWT + Plaid + Stripe
├── artifacts/finance-dashboard/  Expo React Native (web + mobile)
├── artifacts/mockup-sandbox/     Vite component preview server
└── lib/db/                   Drizzle ORM + PostgreSQL schema
```

All Plaid and Stripe routes are protected by `requireAuth` middleware — a user can only see their own linked accounts and payment history.
