# Crypto Airdrop Studio

`crypto-airdrop-studio` is the `60s` short-video Web3 MVP workspace.  
Current implementation is a local-first TikTok-style feed with wallet-gated interactions and Aptos mock settlement endpoints.

## Project objective

- Deliver a runnable MVP for wallet connect, video feed browsing, upload, and interaction flows.
- Support board review and QA with deterministic local data and repeatable scripts.
- Keep chain integration mock-first for rapid iteration before production hardening.

## Repository structure

- `apps/`: active product workspace
- `apps/apps/frontend`: Next.js 16 + React 19 web client
- `apps/apps/backend`: Bun + Hono API service with SQLite + Drizzle
- `apps/aptos-claim`: Move contract sandbox and claim docs
- `docs/`: product and architecture reports
- `ops/`: runbooks and secrets/deploy policies
- `qa/`: Playwright runtime and smoke specs
- `scripts/`: root CI/CD and local bootstrap helpers

## Architecture summary

- Frontend (`apps/apps/frontend`)
  - Full-screen vertical feed UX (TikTok-inspired layout)
  - Wallet connect UX with Aptos address normalization
  - Upload by URL and interaction actions (like/comment/donate/download)
  - Local queue and error handling for interaction flows
- Backend (`apps/apps/backend`)
  - REST API for wallet connect, feed, profile, upload, and interactions
  - Mock wallet-connected gate for write actions
  - Synthetic seed fixtures (creators/videos/interactions) for deterministic demo data
  - Aptos mock endpoints under `/api/mock/aptos/*` for buy/donate/profile simulations
- Persistence
  - SQLite database (`users`, `videos`, `interactions`)
  - Seed data loaded automatically on API startup

## Feature summary (current behavior)

- Feed
  - `GET /api/feed` returns aggregated video metrics (likes/comments/donations/downloads)
  - Supports `limit` query validation (`1..50`)
- Wallet and profile
  - `POST /api/wallet/connect` creates/updates wallet user profile and marks session as connected
  - `GET /api/profile/:walletAddress` returns balances and upload count
- Content
  - `POST /api/videos/upload` creates new video entry by URL
- Interactions (wallet-gated)
  - `POST /api/videos/:videoId/like`
  - `POST /api/videos/:videoId/comment`
  - `POST /api/videos/:videoId/donate`
  - `POST /api/videos/:videoId/download`
- Aptos mock APIs
  - `GET /api/mock/aptos/wallets/:walletAddress/profile`
  - `GET /api/mock/aptos/wallets/:walletAddress/balances`
  - `POST /api/mock/aptos/s/buy/quote`
  - `POST /api/mock/aptos/s/buy/execute`
  - `POST /api/mock/aptos/s/donate`
  - `GET /api/mock/aptos/s/donate/:settlementId`

## Local setup and run

Prerequisites:

- Node.js 20+
- `pnpm` 9+
- Bun 1.3+
- `jq` (recommended for script output readability)

Install:

```bash
cd apps
pnpm install
```

Run API and web in separate terminals:

```bash
cd apps
pnpm dev:api
```

```bash
cd apps
pnpm dev:web
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:8787`
- Health: `http://localhost:8787/health`

## Environment notes

- Frontend uses `NEXT_PUBLIC_API_BASE_URL`.
  - In development: defaults to `http://localhost:8787`.
  - In production: must be set explicitly.
- Backend supports:
  - `PORT` (default `8787`)
  - `CORS_ORIGINS` (comma-separated origins; defaults to localhost web origins)
  - `DB_PATH` (SQLite path; default `./shelby.db`)

## Testing and verification notes

Typecheck commands:

```bash
pnpm --dir apps --filter @cas/api exec tsc --noEmit
pnpm --dir apps --filter @cas/web exec tsc --noEmit
```

Local API smoke:

```bash
cd apps
pnpm e2e:local
```

Browser smoke (Playwright):

```bash
bash qa/run-browser-smoke.sh
```

Verification evidence in this update cycle:

- API typecheck passed
- Web typecheck passed
- `bun` command not available in this execution runtime, so runtime-based smoke commands were not executed here

## Deployment notes

- Split deploy model:
  - Frontend: Vercel (project root `apps/apps/frontend`)
  - Backend: Bun-capable host (project root `apps/apps/backend`)
- Required production env:
  - Frontend: `NEXT_PUBLIC_API_BASE_URL=https://<api-host>`
  - Backend: `CORS_ORIGINS=https://<frontend-host>[,https://<preview-host>]`
- See runbook: `ops/runbooks/split-deploy-vercel-backend.md`

## Known limitations and risks

- Wallet connection in UI is not a full production wallet-adapter signing flow.
- Aptos token economics and settlement are mock-mode (`/api/mock/aptos/*`), not on-chain finality.
- Security/operational hardening (authz, rate-limits, observability, abuse controls) is MVP-level only.
- Some legacy docs may still reference old `apps/apps/web` / `apps/apps/api` paths from before folder rename to `frontend` / `backend`.
