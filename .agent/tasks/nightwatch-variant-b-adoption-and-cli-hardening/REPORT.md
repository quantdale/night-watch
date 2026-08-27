# Variant B Canonical Promotion + Control Center CLI Hardening — Execution Report

Status: COMPLETE (LOCAL / SOURCE / SYNTHETIC)
Task ID: `nightwatch-variant-b-adoption-and-cli-hardening`
Phase: VARIANT-B-ADOPTION-AND-CLI-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: `nightwatch.agent-continuity.v2`
Starting SHA: `9372ec81caf9a23816c1d5b5a1eca5f20e6208bc`
Validated implementation SHA: `d2c0830215962b5b4f0ddd941c449b61224951fc`

## Workstream A — Control Center CLI loader fix

- Problem: `node bin/nightwatch-control-center.mjs` failed on Node 22.22.1 with `CONTROL_CENTER_START_FAILED` because the TypeScript runtime loader's CommonJS `require()` couldn't resolve bare sibling re-exports (e.g., `require('./collector')` when only `./collector.ts` exists).
- Fix: Added `Module._resolveFilename` override in `withTypeScriptHook` to try `.ts` extension fallback when resolution fails and the parent module is a `.ts` file. Scoped to the loader hook lifecycle.
- Verification: `node bin/nightwatch-control-center.mjs --port 7317` starts, serves `/healthz` (status UP, readOnly), `/api/v1/meta` (all 9 features), and built UI. 51 unit tests pass.

## Workstream B — Variant B canonical promotion

- Fresh selfdev session at SHA `68232b1` produced 1 eligible candidate (variant B: EXPAND_THEN_COLLAPSE).
- Sandbox run confirmed all 5 metamorphic probes PASS.
- Owner-gated promotion chain executed: prepare → approve (CANONICAL_ONE_FILE_ONLY) → apply (1 canonical write) → verify (4/4 probes PASS).
- Catalog: `adoptedCaseCatalog.generated.ts` — count 2 (A + B), postimage digest `sha256:d96c24de...`.
- Hardening-check catalog count assertion updated from 1→2.
- Post-commit selfdev session confirms portfolio EXHAUSTED (selectedVariant null, passCount 0).

## Validation

- `npm run typecheck` — PASS
- `npm run hardening:check` — PASS
- `git diff --check` — PASS
- `git push origin main` — success (68232b1..d2c0830)
- Local HEAD == origin/main — clean worktree

## Safety

Zero external contacts, zero product mutations, zero database/infrastructure queries, zero external AI/model calls, zero publication. Exactly 1 canonical source write, 1 approval consumption, 1 development Git commit. No runtime Git write authority.