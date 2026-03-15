# Synthetic creator/video fixture pack (CRY-79)

Seed version: `cas-demo-pack-v1`

## What is included

- `apps/apps/api/src/db/syntheticFixtures.ts`
- `15` synthetic creators with deterministic wallet addresses + avatar metadata
- `60` deterministic videos (`demo-video-001` ... `demo-video-060`) with varied captions/tags
- Follow-graph hints in `syntheticFollowGraphHints` for realistic Following scenarios
- Deterministic engagement counters converted into like/comment/donate/download interaction rows

## Full-stack integration note

API seed wiring already imports this pack in `apps/apps/api/src/db/client.ts`.

If Web needs direct local mock usage, import from:

```ts
import { syntheticCreators, syntheticFollowGraphHints, syntheticVideos } from "../../api/src/db/syntheticFixtures";
```

Use cases:

- `syntheticVideos` -> Explorer/feed preview list
- `syntheticFollowGraphHints[currentWallet]` -> Following candidate wallet set
- `syntheticCreators` -> wallet-to-display/avatar mapping for owner labels

## Deterministic seed convention

- Creator wallets: `0x` + 64-char left-padded hex index (`1..15`)
- Video IDs: `demo-video-${NNN}` (stable)
- Seed label: `SYNTHETIC_FIXTURE_SEED = "cas-demo-pack-v1"`
- CreatedAt values use a fixed base timestamp (`BASE_CREATED_AT`) with fixed increments

## Generation/maintenance note

Edit only these knobs in `syntheticFixtures.ts`:

- `creatorPresets` to add/remove creators
- `VIDEOS_PER_CREATOR` to scale total videos
- `captionTemplates`, `tagPool`, and `VIDEO_URLS` to extend diversity
- `engagement` formula inside `syntheticVideos` mapping to tune counters

After edits, run:

```bash
cd apps && bun run --cwd apps/api typecheck
```

## Sanity checklist (self-check)

Self-check function: `runSyntheticFixtureChecks()`

- [x] creator count >= 15
- [x] video count >= 60
- [x] unique creator wallets
- [x] unique video IDs
- [x] all videos map to known creator wallets
- [x] required fields complete (`id`, `caption`, `videoUrl`)
- [x] follow-graph hints only reference valid non-self wallets

Result for this pack: `PASS`
