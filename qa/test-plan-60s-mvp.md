# 60s MVP QA Test Plan (Risk-based)

## Scope
- Feed/trending list load and metric aggregation.
- Wallet connect and wallet format validation.
- Profile retrieval and wallet-bound balances.
- Upload and download actions.
- Like/comment/donate gating and interaction endpoints.

## Test Matrix (Round 1)
- `PASS` API health endpoint responds OK.
- `PASS` Wallet connect accepts valid Aptos wallet.
- `PASS` Wallet connect rejects invalid wallet payload.
- `PASS` Feed endpoint returns seeded videos with aggregates.
- `PASS` Feed endpoint enforces limit bounds.
- `PASS` Upload + like/comment/donate/download happy path updates metrics.
- `FAIL` Like endpoint accepts non-existent `videoId` (should reject).
- `FAIL` Profile endpoint accepts invalid wallet format (should reject).

## Critical Journeys
- Anonymous user:
  - Feed read path works.
  - Interaction requires walletAddress at API payload level.
- Connected wallet user:
  - Connect wallet + profile + upload + interactions validated.

## Blockers / Bugs
1. High: interaction integrity bug on like endpoint for non-existent video id.
2. Medium: wallet format validation missing on profile endpoint.

## Automation Added
- API integration tests: `apps/apps/api/tests/airdrop.integration.test.ts`
- API unit tests: `apps/apps/api/tests/aptosMockService.unit.test.ts`, `apps/apps/api/tests/aptosGateway.unit.test.ts`
- Web store unit tests: `apps/apps/web/tests/airdropStore.unit.test.ts`

## Coverage Snapshot
- API suite (Bun coverage): Functions `77.04%`, Lines `74.46%`.
- Web store suite (Bun coverage): Functions `80.95%`, Lines `100.00%`.

## Existing Suite Status
- `aptos move test` currently fails to execute due unresolved named address `airdrop` in `Move.toml` (environment/config blocker).

## Release Recommendation
- Do **not** release MVP until CRY-23 and CRY-24 are fixed and retested.
