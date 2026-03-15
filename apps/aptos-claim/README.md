# Aptos Claim Module (MVP)

This package contains the Aptos on-chain claim logic for airdrop campaigns.

## Contents

- `sources/claim.move`: campaign, eligibility, and claim module
- `tests/claim_tests.move`: unit tests for key flows and guardrails
- `abi/claim-interface.json`: entry/view interface for frontend integration
- `scripts/seed_campaign.ts`: TS SDK seeding utility
- `docs/DEPLOYMENT.md`: testnet deployment runbook

## Quick start

```bash
cd apps/aptos-claim
aptos move compile --named-addresses airdrop=<DEPLOYER_ADDRESS>
aptos move test --named-addresses airdrop=<DEPLOYER_ADDRESS>
npm install
npm run typecheck
```
