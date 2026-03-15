#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-8787}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${API_PORT}/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL_SEC="${HEALTH_INTERVAL_SEC:-1}"
RESTART_DELAY_SEC="${RESTART_DELAY_SEC:-1}"
LOG_FILE="${LOG_FILE:-/tmp/cas-api-supervisor.log}"
PID_FILE="${PID_FILE:-/tmp/cas-api-supervisor.pid}"

detect_bun_bin() {
  if [[ -n "${BUN_BIN:-}" ]]; then
    echo "$BUN_BIN"
    return 0
  fi

  if command -v bun >/dev/null 2>&1; then
    command -v bun
    return 0
  fi

  if [[ -x "${HOME}/.bun/bin/bun" ]]; then
    echo "${HOME}/.bun/bin/bun"
    return 0
  fi

  return 1
}

BUN_BIN="$(detect_bun_bin || true)"
if [[ -z "$BUN_BIN" ]]; then
  echo "[api-supervisor] ERROR: Bun not found. Install Bun or set BUN_BIN explicitly." >&2
  exit 1
fi
# Ensure child scripts that invoke `bun` can resolve it even if PATH is misconfigured.
export PATH="$(dirname "$BUN_BIN"):${PATH}"

CHILD_PID=""

cleanup() {
  if [[ -n "$CHILD_PID" ]] && kill -0 "$CHILD_PID" >/dev/null 2>&1; then
    kill "$CHILD_PID" >/dev/null 2>&1 || true
    wait "$CHILD_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$PID_FILE"
}
trap cleanup EXIT INT TERM

wait_for_health() {
  local pid="$1"
  local tries=0

  while (( tries < HEALTH_RETRIES )); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi

    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 1
    fi

    tries=$((tries + 1))
    sleep "$HEALTH_INTERVAL_SEC"
  done

  return 1
}

restart_count=0
echo "[api-supervisor] Using Bun at: ${BUN_BIN}" | tee -a "$LOG_FILE"
echo "[api-supervisor] Health URL: ${HEALTH_URL}" | tee -a "$LOG_FILE"
echo "[api-supervisor] Log file: ${LOG_FILE}" | tee -a "$LOG_FILE"

while true; do
  restart_count=$((restart_count + 1))
  echo "[api-supervisor] Boot attempt #${restart_count} at $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$LOG_FILE"

  "$BUN_BIN" run --cwd "$ROOT_DIR/apps/api" dev >>"$LOG_FILE" 2>&1 &
  CHILD_PID="$!"
  echo "$CHILD_PID" >"$PID_FILE"

  if wait_for_health "$CHILD_PID"; then
    echo "[api-supervisor] API healthy (pid=${CHILD_PID})" | tee -a "$LOG_FILE"
  else
    echo "[api-supervisor] API failed health/startup (pid=${CHILD_PID}), restarting..." | tee -a "$LOG_FILE"
    if kill -0 "$CHILD_PID" >/dev/null 2>&1; then
      kill "$CHILD_PID" >/dev/null 2>&1 || true
    fi
    wait "$CHILD_PID" >/dev/null 2>&1 || true
    sleep "$RESTART_DELAY_SEC"
    continue
  fi

  wait "$CHILD_PID" || true
  echo "[api-supervisor] API process exited (pid=${CHILD_PID}), restarting in ${RESTART_DELAY_SEC}s..." | tee -a "$LOG_FILE"
  sleep "$RESTART_DELAY_SEC"
done
