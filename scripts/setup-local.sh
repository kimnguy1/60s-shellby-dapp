#!/usr/bin/env bash
set -euo pipefail

echo "[setup] Bootstrapping local environment"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[setup] Created .env from .env.example"
fi

if [ -f package.json ]; then
  if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile || pnpm install
  elif command -v npm >/dev/null 2>&1; then
    npm ci || npm install
  fi
fi

echo "[setup] Complete"
