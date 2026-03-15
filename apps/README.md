# Crypto Airdrop Studio Apps

`60s` MVP vertical slice for Shelby dapp using Bun + Hono backend and Next.js frontend.

## Stack

- Backend: Bun runtime, Hono REST APIs, SQLite + Drizzle ORM
- Frontend: React 19 + Next.js App Router, Zustand state management, Howler.js
- Aptos integration: address normalization using Aptos TypeScript SDK on frontend

## Workspace

- `apps/api`: feed, profile, upload and interaction APIs
- `apps/web`: vertical video feed UI + wallet-gated interactions
- `scripts/e2e-local.sh`: API smoke e2e for local development

## Local development

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

For demo/runtime stability on API (`auto-restart` + startup `health` probe):

```bash
pnpm dev:api:stable
```

API defaults to `http://localhost:8787`, web defaults to `http://localhost:3000`.
Set `NEXT_PUBLIC_API_BASE_URL` in web environment if needed.

## Frontend/backend split deployment

The apps are deployable independently:

- Web app: `apps/web` (Next.js, deploy to Vercel)
- API service: `apps/api` (Bun + Hono, deploy to any Bun-capable runtime)

### Required environment variables

- Web (`apps/web`)
  - `NEXT_PUBLIC_API_BASE_URL` (required in production): full backend origin, e.g. `https://api.example.com`
- API (`apps/api`)
  - `PORT` (optional, default `8787`)
  - `CORS_ORIGINS` (recommended for production): comma-separated frontend origins, e.g. `https://your-app.vercel.app,https://www.example.com`
  - `DB_PATH` (optional): SQLite file path

### Build/run independently

From this `apps/` workspace directory:

```bash
pnpm build:web
pnpm start:web
pnpm start:api
```

### Vercel handoff (frontend)

1. Set project root to `apps/apps/web`.
2. Build command: `pnpm build` (or `bun run build`).
3. Set env var `NEXT_PUBLIC_API_BASE_URL` to the deployed API base URL.
4. Redeploy after env updates.

## API endpoint map

- `GET /` -> service metadata (`service`, `status`, endpoint pointers)
- `GET /health` -> health probe (`{ ok: true }`)
- `GET /api/feed` -> airdrop video feed
- `POST /api/wallet/connect` -> connect wallet profile
- `POST /api/videos/upload` -> upload a video record

## Troubleshooting

If `pnpm dev:api` fails with `sh: 1: bun: not found`, install Bun and reload your shell:

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

Then verify:

```bash
bun --version
pnpm dev:api
```

Or run the stable launcher that auto-detects `~/.bun/bin/bun` even when `bun` is missing from `PATH`:

```bash
pnpm dev:api:stable
```

## Typecheck

```bash
pnpm --filter @cas/api exec tsc --noEmit
pnpm --filter @cas/web exec tsc --noEmit
```

## Local e2e smoke

```bash
pnpm e2e:local
```

This script boots API and verifies:
1. feed fetch
2. wallet connect
3. upload video
4. like interaction
5. profile fetch

## Browser interactive smoke (QA runtime)

```bash
bash ../qa/run-browser-smoke.sh
```

This runs Chromium Playwright smoke for:
1. wallet connect via UI
2. upload via UI
3. video playback readiness
4. wallet-gated controls enabled

Artifacts:
- `qa/playwright-report/index.html`
- `/tmp/cas-api.log`
- `/tmp/cas-web.log`
