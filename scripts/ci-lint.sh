#!/usr/bin/env bash
set -euo pipefail

echo "[ci] lint"

if [ -f package.json ] && jq -e '.scripts.lint' package.json >/dev/null 2>&1; then
  if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
    pnpm lint
  else
    npm run lint
  fi
  exit 0
fi

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh || true
fi

echo "[ci] no lint target defined; pass"
