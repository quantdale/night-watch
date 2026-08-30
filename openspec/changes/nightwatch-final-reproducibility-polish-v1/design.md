## Context

Prior deep hardening at e0c0c33 had `gate:local` 10/10 but `gate:clean` and isolated parity were deferred. The validated implementation checkpoint for this successor is d12b1d7. `ONBOARDING.md` says `npm ci && npx playwright install chromium && npm run agent:check && npm run project:check` then gates.

## Goals / Non-Goals

**Goals:** Prove the validated implementation checkpoint reproduces on clean Node20 and isolated topology, and requalify real DEV.

**Non-Goals:** New proof families, mass upgrades, large model download, production.

## Decisions

- `gate:clean` via `bin/quality-gate-clean.mjs` which does a fresh local no-hardlink clone, `npm ci --ignore-scripts`, `npm run gate:ci`, and verifies `HEAD` unchanged.
- Isolated via a fresh no-hardlink Nightwatch checkout and six detached no-hardlink clones of the approved source repositories beneath the expected `REPOSITORIES/<org>/<repo>` topology. Aggregate sibling symlinks are not valid because `src/core/source/siblingSource.ts` intentionally rejects symlink paths.
- DEV via serial real launchers with external owner-managed auth; auth bytes and expiry are never recorded in the repository.

## Risks / Trade-offs

- `gate:clean` clones and `npm ci` may be ~60s; isolated may be ~170s; both acceptable for local gate.
