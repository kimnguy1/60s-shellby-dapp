# 60s MVP Product Spec (Local)

## 1. Objective
Build a local-first MVP for the 60s Shelby dapp that proves end-to-end airdrop user flow:
- user opens app,
- connects Aptos wallet,
- checks eligibility,
- submits claim,
- sees latest claim status.

This MVP is for internal validation and go/no-go decision only.

## 2. MVP Scope (Single Source of Truth)
### In scope
- Web app for wallet connect and claim flow.
- API for active campaign, eligibility check, claim submit, and claim status.
- Deterministic Aptos mock gateway for local testing.
- SQLite persistence for campaigns and claims.
- Local ops scripts/runbooks and smoke e2e checks.
- QA test plan and release readiness report.

### Out of scope (MVP)
- Real on-chain settlement and production contract deployment.
- Mainnet-grade security hardening and observability stack.
- Multi-tenant campaign administration UI.

## 3. Primary User Journey
1. Anonymous user opens app and sees current campaign.
2. User enters Aptos wallet and connects.
3. User runs eligibility check.
4. If eligible, user submits claim.
5. User sees claim tx hash and latest claim status.

## 4. Acceptance Criteria
- Current campaign loads from API.
- Wallet address is normalized/validated before connect.
- Eligibility state is visible and deterministic in local environment.
- Claim submission returns tx hash and status.
- Claim history endpoint returns latest state for wallet.

## 5. Workstream Tracking Board
Snapshot time (UTC): 2026-03-14

| Workstream | Owner | Issue | Status | Deliverables | ETA (UTC) |
|---|---|---|---|---|---|
| Full-stack app + wallet-gated interactions | Full-stack Dev | CRY-15 | TODO | Web/API feature-complete MVP | 2026-03-14 18:00 |
| Aptos/S-token mock + settlement interface | Aptos Engineer | CRY-16 | TODO | Aptos mock spec + service payloads | 2026-03-14 16:00 |
| Local runtime stack + operations runbook | DevOps | CRY-17 | TODO | Ops runbook + one-command local stack | 2026-03-14 15:00 |
| QA test plan + MVP execution report | QA | CRY-18 | IN PROGRESS | Risk-based plan + pass/fail summary | 2026-03-14 19:00 |
| Coordination docs + rollout reporting | Executor | CRY-19 | IN PROGRESS | Product spec + architecture snapshot | 2026-03-14 08:10 |

## 6. Dependency and Blocker Log
| Dependency | Required by | Owner | Status | ETA (UTC) | Blocker if late |
|---|---|---|---|---|---|
| Aptos mock contract/service contract | Full-stack, QA | Aptos Engineer (CRY-16) | TODO | 2026-03-14 16:00 | Wallet-gated token actions cannot be validated fully |
| Local runtime and reproducible environment | QA, Full-stack | DevOps (CRY-17) | TODO | 2026-03-14 15:00 | QA execution may be delayed or non-reproducible |
| Feature-complete wallet flows | QA | Full-stack Dev (CRY-15) | TODO | 2026-03-14 18:00 | QA pass/fail report cannot close |
| Test evidence and bug severity report | Go/No-Go decision | QA (CRY-18) | IN PROGRESS | 2026-03-14 19:00 | CEO lacks release confidence signal |

Current blocker summary:
- No hard blocker on CRY-19 itself.
- Program-level risk is schedule coupling between CRY-15/16/17 and QA completion.

## 7. Internal Release Notes Draft (Local MVP)
### Release
- Name: 60s Local MVP
- Date: 2026-03-14
- Scope: local-only validation for wallet-gated airdrop flow.

### Included components
- Web client: Next.js app (`apps/apps/web`).
- API: Hono + Bun service (`apps/apps/api`).
- Aptos boundary: mock gateway in API (`apps/apps/api/src/services/aptosGateway.ts`).
- Persistence: SQLite + Drizzle schema for campaigns/claims.
- Ops baseline: root scripts + runbooks (`scripts/`, `ops/`).

### Known limitations
- Aptos behavior is mocked; no real chain settlement in this milestone.
- Eligibility policy is deterministic mock logic for predictable local tests.
- Dashboarding/incident response is documented, not fully automated.

### Go/No-Go inputs for CEO
- QA evidence for critical journeys (pass/fail + severities).
- Confirmation that local stack is reproducible by non-author developer in <= 10 min.
- Zero critical blockers across CRY-15, CRY-16, CRY-17, CRY-18.
