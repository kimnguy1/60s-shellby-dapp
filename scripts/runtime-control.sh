#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS_DIR="$ROOT_DIR/apps"
RUNTIME_DIR="${RUNTIME_DIR:-$ROOT_DIR/.runtime}"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

API_PORT="${API_PORT:-8787}"
WEB_PORT="${WEB_PORT:-3000}"
API_HOST="${API_HOST:-0.0.0.0}"
WEB_HOST="${WEB_HOST:-0.0.0.0}"

API_PID_FILE="$PID_DIR/api.pid"
WEB_PID_FILE="$PID_DIR/web.pid"
BUN_BIN="${BUN_BIN:-$HOME/.bun/bin/bun}"

mkdir -p "$LOG_DIR" "$PID_DIR"
if [[ -x "$BUN_BIN" ]]; then
  export PATH="$(dirname "$BUN_BIN"):$PATH"
fi

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[runtime] missing required command: $1" >&2
    exit 1
  }
}

spawn_detached() {
  local pid_file="$1"
  local log_file="$2"
  shift 2

  nohup setsid "$@" >"$log_file" 2>&1 < /dev/null &
  echo $! >"$pid_file"
}

is_running_pid_file() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file")"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" >/dev/null 2>&1
}

start_api() {
  if is_running_pid_file "$API_PID_FILE"; then
    echo "[runtime] api already running (pid $(cat "$API_PID_FILE"))"
    return 0
  fi

  pkill -f "bun --watch src/index.ts" >/dev/null 2>&1 || true

  echo "[runtime] starting api on ${API_HOST}:${API_PORT}"
  spawn_detached "$API_PID_FILE" "$LOG_DIR/api.log" \
    bash -lc "cd '$APPS_DIR' && exec env HOST='$API_HOST' PORT='$API_PORT' pnpm dev:api"
}

start_web() {
  if is_running_pid_file "$WEB_PID_FILE"; then
    echo "[runtime] web already running (pid $(cat "$WEB_PID_FILE"))"
    return 0
  fi

  pkill -f "next dev -p ${WEB_PORT}" >/dev/null 2>&1 || true
  pkill -f "pnpm --dir .* dev:web" >/dev/null 2>&1 || true

  echo "[runtime] starting web on ${WEB_HOST}:${WEB_PORT}"
  spawn_detached "$WEB_PID_FILE" "$LOG_DIR/web.log" \
    bash -lc "cd '$APPS_DIR' && exec env HOSTNAME='$WEB_HOST' PORT='$WEB_PORT' pnpm dev:web"
}

stop_service() {
  local name="$1"
  local pid_file="$2"

  if ! [[ -f "$pid_file" ]]; then
    echo "[runtime] $name not running (no pid file)"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "[runtime] stopping $name (pid $pid)"
    kill "$pid" >/dev/null 2>&1 || true
    for _ in {1..20}; do
      kill -0 "$pid" >/dev/null 2>&1 || break
      sleep 0.5
    done
    kill -9 "$pid" >/dev/null 2>&1 || true
  else
    echo "[runtime] $name pid $pid is stale"
  fi

  rm -f "$pid_file"
}

wait_health() {
  local name="$1"
  local url="$2"
  local retries="$3"

  for _ in $(seq 1 "$retries"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[runtime] $name healthy: $url"
      return 0
    fi
    sleep 1
  done

  echo "[runtime] $name failed health check: $url" >&2
  return 1
}

status() {
  if is_running_pid_file "$API_PID_FILE"; then
    echo "[runtime] api running (pid $(cat "$API_PID_FILE"))"
  else
    echo "[runtime] api stopped"
  fi

  if is_running_pid_file "$WEB_PID_FILE"; then
    echo "[runtime] web running (pid $(cat "$WEB_PID_FILE"))"
  else
    echo "[runtime] web stopped"
  fi
}

health() {
  echo "[runtime] api:"
  curl -sS -i "http://127.0.0.1:${API_PORT}/health"
  echo
  echo "[runtime] web:"
  curl -sS -i "http://127.0.0.1:${WEB_PORT}/"
  echo
}

require_cmd pnpm
require_cmd bun
require_cmd curl
require_cmd setsid

ACTION="${1:-}"
case "$ACTION" in
  start)
    start_api
    start_web
    wait_health "api" "http://127.0.0.1:${API_PORT}/health" 90
    wait_health "web" "http://127.0.0.1:${WEB_PORT}/" 120
    status
    ;;
  stop)
    stop_service "web" "$WEB_PID_FILE"
    stop_service "api" "$API_PID_FILE"
    status
    ;;
  restart)
    "$0" stop
    "$0" start
    ;;
  status)
    status
    ;;
  health)
    health
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|health}" >&2
    exit 1
    ;;
esac
