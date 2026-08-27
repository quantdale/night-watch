# Nightwatch — Variant B Adoption + Control Center CLI Hardening

## Purpose

Close the proven Phase 8B.1 promotion loop by adopting variant B (EXPAND_THEN_COLLAPSE), and make the Control Center standalone CLI operable on Node 22 by fixing the TypeScript runtime loader's module resolution.

## Starting State

- SHA: `9372ec81caf9a23816c1d5b5a1eca5f20e6208bc`, branch `main`, clean tree (2 stale-status doc files dirty)
- Catalog: 1 entry (variant A EXPAND_SUMMARY), digest `401b2c67...`
- Portfolio: variant B AVAILABLE_NOT_ADOPTED, NEXT_PROMOTION_AUTHORITY: NONE
- Node 22.22.1, npm 10.9.4, WSL2 Linux
- Control Center: UI builds, 51 unit tests pass, `nightwatch-control-center.mjs` fails with `CONTROL_CENTER_START_FAILED` (ERR_MODULE_NOT_FOUND for bare re-exports)

## Scope

1. Fix the TypeScript runtime loader for Node 22 module resolution
2. Execute variant B canonical promotion chain
3. Update durable docs

## Milestones

### M1 — Fix Control Center CLI loader

- Status: COMPLETE
- Added Module._resolveFilename hook for Node 22 .ts resolution
- Verified: Control Center CLI starts and serves on Node 22

### M2 — Execute variant B canonical promotion

- Status: COMPLETE
- Full chain: session → sandbox → prepare → approve → apply → verify → commit
- Catalog count 1→2, portfolio EXHAUSTED

### M3 — Documentation and closure

- Status: COMPLETE
- STATE.md, REPORT.md, ACTIVE_TASK.md updated; pushed to origin/main

## Validation Strategy

At each milestone: `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`, `git diff --check`.
Final: `npm run gate:local`, `npm run project:check`, catalog-integrity, focused selfDev suite, full Playwright regression.

## Non-Goals

No second adoption beyond variant B; no generic runtime Git write; no product, AI, database, infrastructure, publication, or DEV/NEXT/production contact; no changes to Phase 8B.1-R1 historical records; no architectural changes to the promotion mechanism.

## Safety Constraints

Zero DEV/NEXT/production contact, zero product mutation, zero database/infrastructure queries, zero external AI/model calls, zero publication, zero Alphaus writes. Exactly one canonical source write, one approval consumption, one development Git commit. No runtime Git write authority.

## Architecture / Approach

M1: Add Module._resolveFilename hook in withTypeScriptHook for .ts extension fallback. M2: Use the proven Phase 8B.1-R1 promotion mechanism: fresh selfdev session → sandbox proof → promotion prepare → approve (CANONICAL_ONE_FILE_ONLY) → apply → fresh-process verify → commit.


## Decision Log

- 2026-08-27 — Created this task for two bounded workstreams: variant B adoption + Node 22 CLI fix.
- 2026-08-27 — The loader fix uses `Module._resolveFilename` override rather than modifying tsconfig (which would affect all consumers).
- 2026-08-27 — Variant B uses the exact same promotion mechanism proven in Phase 8B.1-R1; no new mechanism code needed.

## Discoveries

- (to be filled)

## Deferred Work

- Any third adoption; redesign of the TypeScript loader architecture; generic `currentCheckoutState()` contract-digest fix.

## Completion Criteria

- Control Center CLI starts on Node 22 and serves health endpoint
- Catalog count=2, variant B ADOPTED, portfolio EXHAUSTED
- Full local regression, typecheck, hardening, agent:check, project:check, catalog-integrity all pass
- Docs reflect new catalog state
- Promotion commit pushed, HEAD==origin/main, clean worktree