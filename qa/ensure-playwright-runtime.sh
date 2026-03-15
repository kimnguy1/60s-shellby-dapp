#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS_DIR="$ROOT_DIR/apps"
PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-1.52.0}"
PLAYWRIGHT_DEPS_LOG="${PLAYWRIGHT_DEPS_LOG:-/tmp/cas-playwright-deps.log}"

if [[ "${QA_SKIP_DEPS_INSTALL:-0}" == "1" ]]; then
  echo "[qa] skipping playwright dependency install (QA_SKIP_DEPS_INSTALL=1)"
  exit 0
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[qa] non-linux host detected; skipping apt-based playwright dependency install"
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[qa] pnpm is required" >&2
  exit 1
fi

INSTALL_CMD=(pnpm --dir "$APPS_DIR" dlx "playwright@${PLAYWRIGHT_VERSION}" install-deps chromium)

if [[ "${EUID}" -eq 0 ]]; then
  echo "[qa] installing playwright linux dependencies as root"
  DEBIAN_FRONTEND=noninteractive "${INSTALL_CMD[@]}" >"$PLAYWRIGHT_DEPS_LOG" 2>&1
  echo "[qa] playwright dependency install complete (log: $PLAYWRIGHT_DEPS_LOG)"
  exit 0
fi

if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
  echo "[qa] installing playwright linux dependencies with passwordless sudo"
  sudo -n env DEBIAN_FRONTEND=noninteractive "${INSTALL_CMD[@]}" >"$PLAYWRIGHT_DEPS_LOG" 2>&1
  echo "[qa] playwright dependency install complete (log: $PLAYWRIGHT_DEPS_LOG)"
  exit 0
fi

echo "[qa] missing privilege to install playwright linux dependencies." >&2
echo "[qa] run the following once in a privileged shell, then rerun smoke:" >&2
echo "sudo env DEBIAN_FRONTEND=noninteractive pnpm --dir \"$APPS_DIR\" dlx \"playwright@${PLAYWRIGHT_VERSION}\" install-deps chromium" >&2
echo "[qa] expected screenshot verification command:" >&2
echo "pnpm --dir \"$APPS_DIR\" dlx \"playwright@${PLAYWRIGHT_VERSION}\" screenshot --browser=chromium https://example.com /tmp/cas-smoke-shot.png" >&2
exit 1
