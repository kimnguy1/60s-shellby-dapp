#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS_DIR="$ROOT_DIR/apps"
QA_DIR="$ROOT_DIR/qa"
API_PORT="${API_PORT:-8787}"
WEB_PORT="${WEB_PORT:-3000}"
PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-1.52.0}"

cleanup() {
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "${WEB_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[qa] pnpm is required" >&2
  exit 1
fi
if ! command -v bun >/dev/null 2>&1; then
  echo "[qa] bun is required" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "[qa] ensuring playwright linux runtime dependencies"
bash "$QA_DIR/ensure-playwright-runtime.sh"

echo "[qa] starting api on :$API_PORT"
pnpm --dir "$APPS_DIR" dev:api >/tmp/cas-api.log 2>&1 &
API_PID=$!

echo "[qa] starting web on :$WEB_PORT"
pnpm --dir "$APPS_DIR" dev:web >/tmp/cas-web.log 2>&1 &
WEB_PID=$!

echo "[qa] waiting for api"
for _ in {1..90}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[qa] waiting for web"
for _ in {1..120}; do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export QA_BASE_URL="http://127.0.0.1:${WEB_PORT}"

echo "[qa] installing chromium runtime"
pnpm --dir "$APPS_DIR" dlx "playwright@${PLAYWRIGHT_VERSION}" install chromium >/tmp/cas-playwright-install.log 2>&1

echo "[qa] executing browser smoke"
pnpm --dir "$APPS_DIR" dlx "playwright@${PLAYWRIGHT_VERSION}" test "$QA_DIR/specs/wallet-upload-playback.spec.ts" --config "$QA_DIR/playwright.config.ts"

echo "[qa] browser smoke completed"
