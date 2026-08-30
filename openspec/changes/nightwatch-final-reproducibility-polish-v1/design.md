## Context

Prior deep hardening at e0c0c33 had `gate:local` 10/10 but `gate:clean` and isolated parity were deferred. `ONBOARDING.md` says `npm ci && npx playwright install chromium && npm run agent:check && npm run project:check` then gates.

## Goals / Non-Goals

**Goals:** Prove `e0c0c33` reproduces on clean Node20 and isolated topology, and requalify real DEV.

**Non-Goals:** New proof families, mass upgrades, large model download, production.

## Decisions

- `gate:clean` via `bin/quality-gate-clean.mjs` which does `mktemp`, `git clone --shared`, `npm ci --ignore-scripts`, `npm run gate:ci`, and verifies `HEAD` unchanged.
- Isolated via `scripts/isolated-gate.sh` or manual `mkdir -p /tmp/isolated && cp -a` with `read-only sibling symlinks` for `alphauslabs`/`mobingilabs`.
- DEV via serial real launchers with external `~/.nightwatch/auth/ripple-dev-state.json` (valid until 07:59 PST).

## Risks / Trade-offs

- `gate:clean` clones and `npm ci` may be ~60s; isolated may be ~170s; both acceptable for local gate.
