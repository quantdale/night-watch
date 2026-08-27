# Task State

## Identity

Task ID: nightwatch-variant-b-adoption-and-cli-hardening
Phase: VARIANT-B-ADOPTION-AND-CLI-HARDENING-V1
Status: COMPLETE
Starting SHA: 9372ec81caf9a23816c1d5b5a1eca5f20e6208bc
Last validated implementation SHA: 544e90e68f4c850853abafaa04e80c2a0e405504
Last substantive checkpoint SHA: 544e90e68f4c850853abafaa04e80c2a0e405504
Last documentation checkpoint SHA: 2ed41e184f475e7dece5b06edb45419690c29c52
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 9372ec81caf9a23816c1d5b5a1eca5f20e6208bc
LAST_VALIDATED_IMPLEMENTATION_SHA: 544e90e68f4c850853abafaa04e80c2a0e405504
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 544e90e68f4c850853abafaa04e80c2a0e405504
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_VARIANT_B_ADOPTION_AND_CLI_HARDENING_V1_STATUS: COMPLETE

## Objective

Adopt variant B (EXPAND_THEN_COLLAPSE) into the canonical adopted-case catalog and fix Control Center CLI for Node 22.

## Current Milestone

COMPLETE — both workstreams finished; catalog 2 entries (A+B), portfolio EXHAUSTED; Control Center CLI runs on Node 22.
## Completed Milestones

### M1 — Fix Control Center CLI loader for Node 22

- Added `Module._resolveFilename` override in `withTypeScriptHook` to try `.ts` extension fallback when CommonJS `require()` from compiled TS modules cannot resolve bare sibling imports.
- Verified: `node bin/nightwatch-control-center.mjs --port 7317` serves `/healthz` (status UP), `/api/v1/meta` (all features), and UI.
- 51 Control Center unit tests pass.

### M2 — Execute variant B canonical promotion

- Fresh selfdev session: selected `EXPAND_THEN_COLLAPSE`, passCount 1.
- Sandbox: plan + run, all 5 probes PASS.
- Promotion prepare → approve (CANONICAL_ONE_FILE_ONLY) → apply (1 write) → verify (4/4 probes PASS).
- Commit `d2c0830`: catalog count 1→2, hardening-check updated.
- Pushed to origin/main, clean worktree.

### M3 — Post-commit validation

- Catalog count: 2. Typecheck: PASS. Hardening: PASS. Post-commit selfdev: portfolio EXHAUSTED, selectedVariant null, passCount 0.
- Control Center verified functional on Node 22.

## Work In Progress

NONE.

## Exact Next Action

STOP — task complete. Portfolio EXHAUSTED. Any future portfolio expansion requires separate design and owner authorization.

## Files Changed

- `bin/lib/typescript-runtime-loader.mjs` — Module._resolveFilename hook for Node 22
- `bin/hardening-check.mjs` — catalog count assertion 1→2
- `src/core/selfDev/adoptedCaseCatalog.generated.ts` — 2 entries (A + B)
- `.agent/ACTIVE_TASK.md`, `.agent/tasks/nightwatch-variant-b-adoption-and-cli-hardening/*.md`

## Validation Ledger

- `npm run typecheck` — PASS
- `npm run hardening:check` — PASS (catalog count 2)
- `git diff --check` — PASS
- Control Center CLI: `/healthz` UP, `/api/v1/meta` all features, UI served
- Control Center unit tests: 51/51 PASS
- Post-commit selfdev: portfolio EXHAUSTED, passCount 0
- `git push origin main` — PASS (68232b1..d2c0830)
- Local HEAD == origin/main, clean worktree — PASS

## Decisions Made During This Task

- Module._resolveFilename hook is the correct fix for Node 22 resolution (vs modifying tsconfig which would ripple across the codebase).
- Used the proven Phase 8B.1-R1 promotion mechanism for variant B; no new mechanism code needed.
- Hardening-check catalog count updated from 1→2.

## Discoveries

- The Module._resolveFilename hook approach works well for Node 22 and is scoped to the loader lifecycle.
- The selfdev portfolio correctly transitions to EXHAUSTED after adopting both A and B.

## Blockers

None.

## Deferred / Follow-Up

- Portfolio expansion beyond A+B (requires separate design and owner authorization).
- `currentCheckoutState()` contract-digest process-binding characteristic (historical, unrelated).

## Safety Events

NONE.

## Resume Recipe

Task complete. Do not resume. Any follow-up starts as a new authorized task.

## Completion Snapshot

COMPLETE. Both workstreams terminal. Catalog 2 entries (A+B), portfolio EXHAUSTED. Control Center works on Node 22. d2c0830 (variant B) + 68232b1 (loader fix) pushed to origin/main, HEAD == origin/main, clean tree.
