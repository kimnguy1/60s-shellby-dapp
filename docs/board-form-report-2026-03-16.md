# 60s MVP Board Form Report

## Project objective

- Build a TikTok-style Web3 MVP (`60s`) for local validation of wallet-gated video interactions.
- Prove end-to-end behavior for feed, profile, upload, and interaction flows before production hardening.

## Delivered features

- Vertical short-video feed UI in `apps/apps/frontend`.
- Wallet connect flow with Aptos address normalization and profile fetch.
- Video upload by URL and metadata persistence.
- Interaction actions: like, comment, donate, download (wallet-gated on API).
- Synthetic demo fixtures for creators/videos/interactions to keep demos deterministic.
- Aptos mock service endpoints for profile/balances/buy-S/donate-S simulation.
- QA/browser smoke scripts and runbook scaffolding for local and split deployment.

## Tech stack

- Frontend: Next.js 16, React 19, Zustand, Howler, Aptos TS SDK.
- Backend: Bun, Hono, Drizzle ORM, Zod validation.
- Data: SQLite (`users`, `videos`, `interactions`).
- Tooling: pnpm workspace, Playwright smoke scripts, shell runbooks.

## Verification evidence

- Code-level verification completed this cycle:
  - `pnpm --dir apps --filter @cas/api exec tsc --noEmit` -> pass
  - `pnpm --dir apps --filter @cas/web exec tsc --noEmit` -> pass
- Runtime verification not executed in this cycle:
  - `bun` binary is not available in this execution environment, so `pnpm dev:*` and smoke scripts requiring Bun were not run here.

## Outstanding blockers and risks

- Environment blocker:
  - Bun missing in current runtime prevents live run/e2e execution during this heartbeat.
- Product/technical risks:
  - Wallet interactions are still MVP-level and not a full production wallet-provider signing architecture.
  - Aptos integration is mock-first; no real on-chain settlement in the current scope.
  - Security/ops hardening (authz, abuse controls, observability depth) is not production-complete.
- Documentation drift risk:
  - Some legacy docs still reference old `apps/apps/web` and `apps/apps/api` paths after folder rename.

## Next actions

1. Install Bun in execution/CI runtime, then run:
   - `pnpm --dir apps dev:api`
   - `pnpm --dir apps dev:web`
   - `pnpm --dir apps e2e:local`
   - `bash qa/run-browser-smoke.sh`
2. Align all docs/runbooks to `frontend`/`backend` paths consistently.
3. Prioritize production-readiness tasks:
   - real wallet adapter/signature flow
   - on-chain integration replacing mock settlement
   - security + observability hardening pass
