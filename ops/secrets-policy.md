# Secrets and Environment Policy

## Rules
- Never commit real secrets to git.
- Keep required variables documented in `.env*.example`.
- Use GitHub Environments for deployment secrets:
  - `staging` environment for testnet/staging values.
  - `production` environment for mainnet/prod values.
- Restrict production deploy to manual dispatch and protected reviewers.

## Variable model
- Non-secret config: committed in `.env*.example`.
- Secret config: stored in GitHub Actions Secrets/Environment secrets.
- Local secret overrides: only in untracked `.env`.

## Rotation
- Rotate staging secrets at least quarterly.
- Rotate production secrets immediately after incident/suspected leak.
