# Deploy and Rollback Runbook

## Local preflight (before staging/prod work)
1. Ensure Bun is installed (`bun --version`).
2. If missing (`bun: not found`), install and reload shell:
   - `curl -fsSL https://bun.sh/install | bash`
   - `source ~/.bashrc`
3. Verify API boots locally: `cd apps && pnpm dev:api`
4. Confirm health endpoint: `curl http://localhost:8787/health` (expect `{"ok":true}`).

## VPS runtime operations
Use a single controller script to avoid duplicate orphan dev processes:

1. Start services:
   - `./scripts/runtime-control.sh start`
2. Check status:
   - `./scripts/runtime-control.sh status`
3. Health probes:
   - `./scripts/runtime-control.sh health`
4. Restart services:
   - `./scripts/runtime-control.sh restart`
5. Stop services:
   - `./scripts/runtime-control.sh stop`

Runtime artifacts:
- PIDs: `.runtime/pids/api.pid`, `.runtime/pids/web.pid`
- Logs: `.runtime/logs/api.log`, `.runtime/logs/web.log`

## Staging deploy
1. Merge to `main`.
2. Confirm `CI` workflow passed.
3. `CD Staging` triggers automatically on push.
4. Verify app health checks and logs.

## Production deploy (placeholder process)
1. Confirm staging is green for the same commit.
2. Trigger `CD Prod Placeholder` manually from Actions.
3. Validate smoke checks and key user flows.

## Rollback
1. Identify last known good commit SHA.
2. Re-run deploy workflow for that SHA (or revert commit and redeploy).
3. Verify service recovery via health checks.
4. Record incident notes and follow-up action items.

## Failure handling
- If deployment fails, mark issue status `blocked` with root cause and owner.
- If rollback fails, escalate immediately to CEO and freeze further deploys.
