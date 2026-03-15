#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-8787}"
WALLET="${E2E_WALLET:-0x1234000000000000000000000000000000000000000000000000000000000000}"
VIDEO_URL="${E2E_VIDEO_URL:-https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4}"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

cd "$ROOT_DIR"

pnpm --filter @cas/api run dev >/tmp/cas-api.log 2>&1 &
API_PID=$!

for _ in {1..20}; do
  if curl -s "http://localhost:${API_PORT}/health" >/dev/null; then
    break
  fi
  sleep 0.5
done

printf "\n[1/5] Feed\n"
curl -s "http://localhost:${API_PORT}/api/feed" | jq .

printf "\n[2/5] Wallet connect\n"
curl -s -X POST "http://localhost:${API_PORT}/api/wallet/connect" \
  -H 'Content-Type: application/json' \
  -d "{\"walletAddress\":\"${WALLET}\",\"displayName\":\"E2E User\"}" | jq .

printf "\n[3/5] Upload\n"
UPLOAD_RESPONSE="$(curl -s -X POST "http://localhost:${API_PORT}/api/videos/upload" \
  -H 'Content-Type: application/json' \
  -d "{\"walletAddress\":\"${WALLET}\",\"videoUrl\":\"${VIDEO_URL}\",\"caption\":\"e2e upload\"}")"
echo "$UPLOAD_RESPONSE" | jq .
VIDEO_ID="$(echo "$UPLOAD_RESPONSE" | jq -r '.id')"

printf "\n[4/5] Like\n"
curl -s -X POST "http://localhost:${API_PORT}/api/videos/${VIDEO_ID}/like" \
  -H 'Content-Type: application/json' \
  -d "{\"walletAddress\":\"${WALLET}\"}" | jq .

printf "\n[5/5] Profile\n"
curl -s "http://localhost:${API_PORT}/api/profile/${WALLET}" | jq .

printf "\nLocal API e2e completed successfully.\n"
