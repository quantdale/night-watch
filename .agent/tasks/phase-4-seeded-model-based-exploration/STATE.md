# Task State

## Identity

Task ID: phase-4-seeded-model-based-exploration
Phase: 4
Status: IN_PROGRESS
Starting SHA: acdb4a27a953dbff2c3408815efe634468d4ad20
Current SHA: 8916e91ca3f983808f1385d27bd79e2aa54c4d5e
Last validated implementation SHA: 8916e91ca3f983808f1385d27bd79e2aa54c4d5e
Branch: main
Last checkpoint: 2026-08-12 — Phase 4 pre-real checkpoint `8916e91ca3f983808f1385d27bd79e2aa54c4d5e`.

## CURRENT_GOAL

Build and validate a bounded deterministic read-only explorer around trusted
Ripple J1/J2/J3 anchor journeys without widening Nightwatch's safety boundary.

## CURRENT_PHASE

M0 through M5 complete; M6 current — pre-real validation and adversarial
review passed locally, checkpoint pending before DEV.

## CURRENT_EVIDENCE

- Phase 3 reports reconcile with Git: `427f1029 → 8d72ec9 → 058a1ab → acdb4a2`.
- Current Nightwatch worktree was clean before this task's documentation.
- Phase 3 focused suite: 28 passed; typecheck: PASS; agent continuity: PASS
  with the expected prior-document checkpoint warning.
- Phase 3 current shadow was empty and accepted; no Phase 3 DEV run occurred.
- Source review found J1/J2 bounded selector actions and J3 local table-sort
  actions. J3 vendor switching is stale against the local tracking delta and
  is rejected pending semantic review.
- Phase 4 engine, typed schemas, catalog, browser adapter, seed corpus, and
  synthetic fixture are implemented at `72dd9c276945bb0081b613b00bdeff6b11d66808`.
- Focused Phase 4 matrix: 16 passed; full Nightwatch suite: 308 passed;
  typecheck: PASS; no real context yet.
- Pre-real adversarial review: PASS; no unproven action, host-policy
  relaxation, privacy leak, planner nondeterminism, budget bypass, or Phase 5
  scope was found.

## SOURCE_BASELINES

- Ripple UI: `mobingilabs/ripple-ui@d80b161b`; tracking `origin/dev` is
  `f6b2d2f6`, 0 ahead/21 behind; freshness `LOCAL_TRACKING_REF_ONLY`.
- Ripple API: `mobingilabs/ripple-api@27bb007a`; tracking `origin/master` is
  4 commits ahead; freshness remains local-tracking only.
- Ouchan: `mobingilabs/ouchan@565f00a8`; tracking `origin/master` is
  55 commits ahead; local-tracking only.
- Blue API: `alphauslabs/blueapi@691422e5`; tracking 2 commits ahead of
  checkout; local-tracking only.
- Blue Go SDK: `alphauslabs/blue-sdk-go@8883ee3d`; tracking 1 commit ahead;
  local-tracking only.
- grpc-chunk-parser: `alphauslabs/grpc-chunk-parser@66802f28`; tracking equal;
  local-tracking only.
- Alphaus dirty counts at audit: 8, 1, 71, 1, 1, 0 respectively; preserved.

## ANCHOR_JOURNEYS

- J1 `ripple-payer-exchange-read`, route `/payer-exchange-rate-v2`.
- J2 `ripple-common-exchange-read`, route `/global-exchange-rate-v2`.
- J3 `ripple-account-inventory`, route `/accounts`.

## ACTION_CATALOG_VERSION

`nightwatch.safe-actions.phase4.v1`; source-reviewed catalog is recorded in
`ACTIONS.md`; implementation is at `72dd9c276945bb0081b613b00bdeff6b11d66808`.

## STATE_MODEL_VERSION

`nightwatch.exploration-state.phase4.v1`.

## EXPLORATION_MODEL_VERSION

`nightwatch.exploration-model.phase4.v1` with SplitMix64 v1 planner; generic
engine and browser adapter implemented.

## CURRENT_EXPLORATION_ENVELOPES

E1/J1, E2/J2, and E3/J3 are source-reviewed in `EXPLORATION.md`; implementation,
synthetic tripwires, full local validation, and adversarial pre-real review
pass. DEV remains blocked until this documentation checkpoint is committed.

## SEED_LEDGER

Fixed before DEV and not tuned to product findings: E1/J1
`0x0000000000000101`, `0x0000000000000102`; E2/J2
`0x0000000000000201`, `0x0000000000000202`; E3/J3
`0x0000000000000301`, `0x0000000000000302`. Canonical seed format is lowercase
`0x` plus 16 hex digits; SplitMix64 v1 and model/catalog fingerprints are
recorded per run. Six exploration contexts plus at most three exact replays.

## COVERAGE_LEDGER

Synthetic coverage ledger is implemented in exploration evidence; real ledger
is empty. Required dimensions remain per-envelope; no product-wide coverage
claim is permitted.

## REAL_RUN_LEDGER

No Phase 4 real contexts yet. Auth state was not read, printed, or used. The
fixed serial corpus is authorized only after the checkpoint commit; no
diagnostic retries are included in the budget.

## REPRODUCTION_LEDGER

Synthetic seed replay and exact-sequence replay pass. Real reproduction ledger
is empty; up to one exact fresh-context replay per envelope is allowed only
when that envelope produces a nontrivial, safety-zero sequence.

## BUG_CANDIDATES

None for Phase 4. Historical J2 font-502 remains `L0_NOT_REPRODUCED`; historical
malformed JSON remains `GENUINE_PROTOCOL_ANOMALY` with unresolved semantics.

## REJECTED_ACTIONS

Inventory is complete in `ACTIONS.md`; rejected candidates are durable. No live
control discovery is permitted.

## REJECTED_HYPOTHESES

- Phase 3's empty shadow does not block explicit Phase 4 validation mode.
- Source checkout freshness is not deployment verification.
- A label, HTTP method, or visible control is not semantic read proof.

## FILES_CHANGED

Phase 4 task docs plus typed engine/catalog/runner/fixture/tests; all changes
are Nightwatch-only.

## VALIDATION_LEDGER

- Phase 3 SHA/object/ancestry audit: PASS.
- Nightwatch status before task creation: clean.
- Alphaus read-only integrity snapshot: PASS; recorded SHAs and dirty counts
  unchanged from Phase 3 ledger.
- `npm run agent:check`: PASS before task creation.
- `npx tsc --noEmit`: PASS before task creation.
- Phase 3 focused suite: 28 passed.
- Full inherited Playwright suite: launched as a read-only audit; exact final
  result is to be confirmed after this documentation checkpoint.
- Relevant Ripple UI tracking delta reviewed; J3 supplementary AOR POST
  identified and excluded from the v1 action catalog.
- Phase 4 focused suite: 16 passed; `npx tsc --noEmit`: PASS; full
  Playwright suite: 308 passed; `git diff --check`: PASS.
- Hardening regression: failed actions retain invalidated transition evidence;
  structural/read contracts are independently enforced; privacy state scalars
  are canonicalized.
- Pre-real adversarial review: PASS; durable review is in
  `ADVERSARIAL_REVIEW.md`.

## SAFETY_EVENTS

NONE. No browser context, DEV target, production target, database, or Alphaus
write was used. Synthetic mutation, UNKNOWN, new-host, route-escape, runtime,
stale, and unavailable tripwires all pass.

## PRIVACY_STATUS

PASS. No auth state, credentials, customer data, bodies, DOM, screenshots, or
traces entered Phase 4 task state.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`72dd9c276945bb0081b613b00bdeff6b11d66808` (Phase 4 hardening checkpoint; inherited Phase 3
implementation remains `8d72ec9`).

## LAST_CHECKPOINT_SHA

`72dd9c276945bb0081b613b00bdeff6b11d66808` — deterministic engine, catalog,
synthetic fixture/tests, browser adapter, bounded real runner, and transition
evidence hardening.

## NEXT_EXACT_ACTION

Commit this passing pre-real checkpoint, rerun `agent:check` against the clean
checkpoint, then run `npm run explore:phase4 -- --env=dev` exactly once within
the fixed six-context plus three-replay budget. Do not inspect or print auth
state contents.

## RESUME_RECIPE

1. Read `AGENTS.md`, `docs/CURRENT_STATE.md`, `.agent/ACTIVE_TASK.md`, then
   this task's SPEC, PLAN, and STATE.
2. Inspect `git status --short`, current SHA, and this task's diff.
3. Confirm the pre-real checkpoint and fixed seed ledger; use a fresh context
   for every seed and replay.
4. Run the fixed serial DEV corpus and exact replays only within the declared
   budget.
5. Update this STATE after each milestone before implementation changes.

## Decision Log

- Phase 4 acceptance is frozen before action implementation.
- Current Phase 3 baseline is consumed only for provenance/staleness; Phase 4
  validation does not advance Phase 3 baselines.

## Blockers

None yet. A safe-frontier blocker remains an allowed outcome if source proof
cannot establish meaningful branching.

## Deferred / Follow-Up

Phase 5 and all broader autonomous/fuzzing/datastore work remain deferred.

## Completion Snapshot

Not complete.

## Objective

Build and validate a bounded deterministic read-only explorer around trusted
Ripple J1/J2/J3 anchor journeys without widening Nightwatch's safety boundary.

## Current Milestone

Milestone ID: M6. Status: COMPLETE. Local validation and adversarial review
passed; the pre-real checkpoint is `8916e91ca3f983808f1385d27bd79e2aa54c4d5e`.

## Completed Milestones

- M0: Phase 3 closure SHA, validation, freshness, and Alphaus integrity audit
  passed before Phase 4 task creation.
- M1: native task and frozen Phase 4 acceptance docs created.
- M2: J1/J2/J3 source archaeology, rejected-action ledger, and freshness delta
  review completed.
- M3: deterministic Phase 4 engine, catalog, browser adapter, seed corpus,
  synthetic hostile fixture, and focused tests implemented.
- M4: deterministic RNG/planner, budget, coverage, novelty, and strict replay
  validated by the synthetic matrix.
- M5: action attribution, mutation/UNKNOWN/new-host tripwires, model staleness,
  privacy constraints, and local fixture validation completed.
- M6: full 308-test suite, typecheck, diff check, continuity gate, and
  adversarial review passed; `PHASE_4_PRE_REAL_EXPLORATION_READY` checkpointed.

## Work In Progress

Implementation, synthetic validation, full local validation, and adversarial
review are checkpointed. No real context has started.

## Exact Next Action

Run `npm run explore:phase4 -- --env=dev` once, serially, with the fixed seed
corpus and declared six-context plus three-replay maximum. Do not inspect auth
state contents or exceed the frozen budget.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | route the active task to Phase 4 | changed |
| `.agent/tasks/phase-4-seeded-model-based-exploration/` | native task docs and durable design ledgers | created |

## Validation Ledger

- Phase 3 SHA/object/ancestry audit: PASS.
- `npx tsc --noEmit`: PASS before task creation.
- Phase 3 focused suite: 28 passed.
- `npm run agent:check`: PASS before task creation; rerun after checkpoint.

## Decisions Made During This Task

- Freeze Phase 4 acceptance before action implementation.
- Consume Phase 3 only for source provenance/staleness; do not advance its
  baseline through validation exploration.

## Discoveries

- Current Phase 3 shadow is empty; Phase 4 validation must be explicitly named
  `PHASE_4_VALIDATION_EXPLORATION` and cannot manufacture source changes.

## Safety Events

NONE. No browser context, DEV target, production target, database, or Alphaus
write was used for Phase 4 task creation.

## Resume Recipe

1. Read `AGENTS.md`, `docs/CURRENT_STATE.md`, `ACTIVE_TASK.md`, then this
   task's SPEC, PLAN, and STATE.
2. Inspect status/current diff and confirm the checkpoint SHA.
3. Run the narrow shared health audit, then source archaeology.
4. Update STATE before each new milestone or implementation change.
