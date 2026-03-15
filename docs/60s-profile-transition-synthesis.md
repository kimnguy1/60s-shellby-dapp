# 60s Profile Transition Synthesis

Snapshot time (UTC): 2026-03-14 13:50

## 1. Scope
CEO-ready synthesis for profile transition across three states:
1. current profile behavior in app
2. Stitch source requirements (from CRY-53/CRY-54 references to CRY-14 comment `81388872`)
3. implemented new profile result (current dependency state)

## 2. Gap Matrix (Current vs Source vs New)

| Capability | Current behavior (`apps/apps/web/app/page.tsx`) | Source requirement (CRY-53/CRY-54) | New implementation result | Gap status |
|---|---|---|---|---|
| Large avatar + edit avatar | Avatar preview + avatar URL/file inputs exist in drawer profile panel | Required in profile header | Not delivered yet (`CRY-53` = `todo`) | Partial |
| Large display name | Editable display name input exists | Required in profile header | Not delivered yet | Partial |
| Edit Profile action | `Save Profile` action exists (drawer form) | Explicit `Edit Profile` affordance expected | Not delivered yet | Gap |
| Share action | No share action in profile UI | `Share` required | Not delivered yet | Gap |
| Profile stats | `Uploads` count only | Creator-style stats expected in header | Not delivered yet | Gap |
| Bio | No bio field in API/UI form | Bio + bio edit required | Not delivered yet | Gap |
| Short wallet address | Full wallet address is shown | Short wallet address required | Not delivered yet | Gap |
| Wallet section hierarchy | Balances shown in profile drawer; no dedicated `Manage Wallet` action in profile section | ShelbyUSD/APT/S + `Manage Wallet` secondary hierarchy required | Not delivered yet | Partial |
| Tabs (Videos/Favorites/Liked) | No tabs in profile UI | Required with clear active state | Not delivered yet | Gap |
| Uploads grid | Upload count only; no creator grid on profile page | Creator-style uploads grid required | Not delivered yet | Gap |
| Layout continuity | App has top header + left sidebar + center feed + right rail | Must keep continuity | Already present | Match |
| MVP edit flows parity | Edit display name + avatar supported; no bio edit | Required: display name/avatar/bio edit | Not delivered yet | Partial |

## 3. Blocker Map (Owner + Impact)

| Blocker | Owner | Issue | Impact on synthesis confidence |
|---|---|---|---|
| Profile source payload in CRY-14 comment `81388872` is not retrievable via API endpoint in this run (`500`) | Platform/API owner | CRY-14 | Medium: requirements inferred from CRY-53/CRY-54 text, not direct source artifact |
| New profile implementation has not started | Full-stack Dev | CRY-53 (`todo`) | High: cannot produce observed "new profile result" evidence |
| QA parity cannot finalize before implementation exists | QA | CRY-54 (`in_progress`) | High: no evidence-backed pass/fail against Stitch profile yet |

## 4. Dependency Change Log
- Baseline dependencies for this synthesis are now explicit: `CRY-53` (implementation) -> `CRY-54` (parity QA) -> `CRY-55` final board-grade synthesis closure.
- Compared with earlier profile assumptions in current app, the source profile scope is materially broader (bio, tabs, share, creator-grid, dedicated header semantics).
- Incident stream on wallet-connect (`CRY-48`/`CRY-49`) remains adjacent risk because profile flows are wallet-gated.

## 5. Board-Facing Summary Package (Draft)
- Current app supports wallet-gated profile basics (connect, display-name edit, avatar edit, balances view, upload count), but not Stitch-level creator profile semantics.
- Major profile parity gaps remain in bio, tabs, share action, creator-grid, and explicit profile header UX.
- New profile implementation is not yet started in the assigned implementation issue, so "source vs new" closure is currently blocked.
- QA parity issue is active but cannot produce final verdict before implementation lands.

## 6. Evidence References
- Current UI implementation: `apps/apps/web/app/page.tsx`
- Source/implementation requirements: `CRY-53`
- QA parity requirements: `CRY-54`
- Program parent: `CRY-14`
