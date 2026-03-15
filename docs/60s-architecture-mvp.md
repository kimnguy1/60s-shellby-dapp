# 60s MVP Architecture Snapshot (Local)

## 1. System Overview
The current repository implements a local vertical slice with three primary layers:
1. Frontend (`apps/apps/web`): Next.js App Router client for wallet connect and claim UX.
2. Backend API (`apps/apps/api`): Hono service running on Bun with campaign/claim endpoints.
3. Data + contract boundary:
- SQLite (Drizzle schema) for campaigns and claims.
- Aptos gateway abstraction with deterministic mock implementation.

## 2. Runtime Topology
- Web app default: `http://localhost:3000`
- API default: `http://localhost:8787`
- API health endpoint: `GET /health`
- API base path for flow: `/api/*`

Local infra baseline currently includes dev container compose support (`docker-compose.yml`) and operational scripts in `scripts/`.

## 3. Current API Surface
- `GET /api/campaign/current`
  - Returns active campaign.
- `POST /api/eligibility/check`
  - Input: `walletAddress`
  - Checks eligibility via Aptos gateway mock.
  - Persists eligibility result in claims table.
- `POST /api/claim`
  - Input: `walletAddress`, `campaignId`
  - Submits mock claim and stores tx/status.
- `GET /api/claim/:walletAddress/status`
  - Returns latest claim status for wallet.

## 4. Data Model Snapshot
### `campaigns`
- `id` (PK)
- `title`
- `tokenSymbol`
- `rewardAmount`
- `active`

### `claims`
- `id` (PK autoincrement)
- `campaignId`
- `walletAddress`
- `txHash`
- `status` (`eligible`, `not_eligible`, `pending`, `claimed`, `failed`)
- `createdAt`, `updatedAt`

## 5. Frontend Flow Snapshot
- User enters Aptos address.
- Address is normalized with Aptos SDK.
- Connected state is stored in Zustand.
- UI calls API for:
  - campaign fetch,
  - eligibility check,
  - claim submission,
  - claim status refresh.

## 6. Delivery Dependency Map (Owner + ETA)
Snapshot time (UTC): 2026-03-14

| Domain | Owner | Issue | Dependency to MVP | Status | ETA (UTC) |
|---|---|---|---|---|---|
| Frontend + API feature closure | Full-stack Dev | CRY-15 | Critical | TODO | 2026-03-14 18:00 |
| Aptos token mock contract/service | Aptos Engineer | CRY-16 | Critical | TODO | 2026-03-14 16:00 |
| Local runtime and runbook hardening | DevOps | CRY-17 | High | TODO | 2026-03-14 15:00 |
| Test plan and execution evidence | QA | CRY-18 | Critical | IN PROGRESS | 2026-03-14 19:00 |
| Program coordination and reporting | Executor | CRY-19 | High | IN PROGRESS | 2026-03-14 08:10 |

## 7. Open Risks
- Contract/service interfaces may shift when Aptos mock spec (CRY-16) lands.
- QA completion depends on both feature baseline (CRY-15) and reproducible local stack (CRY-17).
- Current deterministic eligibility rule is adequate for local smoke but not production parity.

## 8. MVP Decision Checklist (Architecture Readiness)
- API contract stability confirmed against web client.
- Mock Aptos boundary documented and consumed without blockers.
- Local runbook validated by QA on clean machine.
- No Sev-1/Sev-2 unresolved issues in MVP critical paths.
