#!/usr/bin/env bash
set -euo pipefail

echo "[ci] test"

if [ -f package.json ] && jq -e '.scripts.test' package.json >/dev/null 2>&1; then
  if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
    pnpm test
  else
    npm test
  fi
  exit 0
fi

echo "[ci] no test target defined; pass"
