# Browser Runtime Handoff (CRY-40)

## Goal
Provide QA with a reproducible, browser-capable smoke runtime for interactive wallet connect + upload + playback.

## What was added
- Playwright config: `qa/playwright.config.ts`
- Browser smoke spec: `qa/specs/wallet-upload-playback.spec.ts`
- Orchestrator script: `qa/run-browser-smoke.sh`

## Preconditions
- `pnpm` and `bun` installed.
- Workspace dependencies installed under `apps/`.
- Ports `3000` and `8787` available.
- Linux hosts need Playwright runtime deps (installed via script below).

## Runtime dependency install (Linux)
```bash
bash qa/ensure-playwright-runtime.sh
```

This installs required Chromium libs (`libnspr4`, `libnss3`, etc.) through:
```bash
sudo env DEBIAN_FRONTEND=noninteractive pnpm --dir apps dlx "playwright@1.52.0" install-deps chromium
```

## Run command
```bash
bash qa/run-browser-smoke.sh
```

## What the smoke checks
1. Open web app in Chromium.
2. Connect wallet through UI (`Wallet` panel, Aptos address path).
3. Upload a clip URL through `Upload` panel.
4. Verify stage video source is updated and media is playable.
5. Verify wallet-gated action controls are enabled.

## Useful overrides
```bash
QA_HEADLESS=0 bash qa/run-browser-smoke.sh
QA_WALLET_ADDRESS=0x... QA_DISPLAY_NAME="QA User" bash qa/run-browser-smoke.sh
QA_VIDEO_URL="https://.../clip.mp4" bash qa/run-browser-smoke.sh
API_PORT=8787 WEB_PORT=3000 bash qa/run-browser-smoke.sh
```

## Artifacts on failure
- Playwright HTML report: `qa/playwright-report/index.html`
- Trace/video/screenshots kept on failure by config.
- Service logs: `/tmp/cas-api.log`, `/tmp/cas-web.log`, `/tmp/cas-playwright-install.log`, `/tmp/cas-playwright-deps.log`

## Caveats
- This smoke uses the app's built-in manual wallet connect path. It does not require wallet extension automation.
- If Aptos wallet extension automation is needed later, add a second profile using persistent Chromium context + extension preload.

## Screenshot verification command
After deps install, validate browser runtime directly:
```bash
pnpm --dir apps dlx "playwright@1.52.0" screenshot --browser=chromium https://example.com /tmp/cas-smoke-shot.png
ls -lh /tmp/cas-smoke-shot.png
```

## Troubleshooting
- `Host system is missing dependencies` / `libnspr4`:
  - Run `bash qa/ensure-playwright-runtime.sh` from a shell with sudo privilege.
- `sudo: a terminal is required`:
  - Current shell cannot elevate; run dependency install from a privileged interactive terminal.
- `bun: command not found`:
  - Install Bun first (`curl -fsSL https://bun.sh/install | bash`), then re-run smoke.
