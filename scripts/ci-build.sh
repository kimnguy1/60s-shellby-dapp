#!/usr/bin/env bash
set -euo pipefail

echo "[ci] build"

if [ -f package.json ] && jq -e '.scripts.build' package.json >/dev/null 2>&1; then
  if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
    pnpm build
  else
    npm run build
  fi
  exit 0
fi

echo "[ci] no build target defined; pass"
