# Nightwatch Phase 8B.1.0.1 — Continuity Ledger & Clean Full-Regression Closeout

Task ID: `phase-8b-1-0-1-continuity-full-regression-closeout`
Phase: 8B.1.0.1 — Continuity Ledger & Clean Full-Regression Closeout
Status: IN_PROGRESS
Starting SHA: 10ecea296cf639b65e8a260fee54814737285c2d
Authorization class: PHASE_8B_1_0_1_CONTINUITY_AND_REGRESSION_ONLY

## Owner authorization (frozen)

This authorization covers ONLY the Phase 8B.1.0 closure-integrity task
`phase-8b-1-0-1-continuity-full-regression-closeout`:

- read current Nightwatch repository state;
- run local deterministic tests;
- create isolated full-history checkouts;
- correct Nightwatch continuity/task documentation;
- correct documentation-only stale ledger values;
- commit/push those documentation corrections to private Nightwatch main;
- run/read exact GitHub CI;
- perform read-only checks of historical Phase 8B.1 private promotion state
  when already available locally.

It does NOT authorize: a Phase 8B.1 retry, canonical promotion prepare/
approve/apply, a new canonical-promotion approval, reuse/reset/delete of the
spent approval, canonical adopted-case runtime writes, changing the proposal
portfolio, changing evaluator/replay/trust/planner/sandbox/promotion source
semantics, adding a third proposal candidate, broad test rewrites, weakening
assertions, production/DEV/NEXT product access, database work,
infrastructure work, external AI/model calls, Alphaus repository writes, or
publication. The real canonical adopted-case catalog MUST remain empty.

## Mission

Two closure issues remain after Phase 8B.1.0's accepted implementation:

1. durable continuity/task records contain stale, internally contradictory
   milestone/checkpoint/report prose;
2. the previous "full Playwright" evidence was `682 passed / 1 skipped /
   2 failed`, with the two failures later attributed to running CLI tests
   against a dirty development checkout (the affected clean-tree slice
   passed 17/17).

The Phase 8B.1.0 implementation is NOT redesigned here. This task must:

- A. independently prove the COMPLETE test suite passes from a clean source
  state (first at the starting SHA, then again at the final SHA);
- B. reconcile every durable Phase 8B.1.0 continuity record with what
  actually happened;
- C. re-run exact final repository gates;
- D. leave Phase 8B.1 requiring a completely separate fresh owner
  authorization.

## Accepted architecture (frozen, not to be changed)

- Bounded portfolio: EXPAND_SUMMARY, EXPAND_THEN_COLLAPSE.
- Empty catalog → EXPAND_SUMMARY; expansion adopted → EXPAND_THEN_COLLAPSE;
  both adopted → EXHAUSTED (zero PASS, not eligible, normal terminal state).
- Controller persists concrete replay fixtures; contract manifest v2 binds
  portfolio and selection semantics; explicit test source fixtures for
  EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE.

## Continuity anchors (frozen intent)

- STARTING_SHA: 10ecea296cf639b65e8a260fee54814737285c2d
- LAST_VALIDATED_IMPLEMENTATION_SHA:
  e02aebeb42b2b95995dc20f4123dade866ed71cd (unless Git evidence proves
  otherwise; do NOT relabel the documentation-only commit 01dbadf8 as
  implementation; do NOT move the validated implementation SHA merely
  because this task edits docs).
- LAST_SUBSTANTIVE_CHECKPOINT_SHA:
  e02aebeb42b2b95995dc20f4123dade866ed71cd
- LAST_DOCUMENTATION_CHECKPOINT_SHA:
  01dbadf8e8d9d83936df545e7e7a4b169db19914
- Final prior Phase 8B.1.0 live SHA before this closeout:
  10ecea296cf639b65e8a260fee54814737285c2d

## Completion criteria

- Complete unfiltered Playwright suite passes (failed = 0) from a clean
  isolated full-history checkout at the starting SHA AND at the final SHA.
- All durable continuity records (ACTIVE_TASK, 8B.1.0 STATE/REPORT/PLAN)
  are internally consistent and truthful; no live recovery instruction may
  claim stale milestones (M12/M17/M18) are pending.
- Canonical adopted-case catalog byte-identical and empty before and after
  (digest sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334).
- Exact final GitHub CI completed success with actual execution of every
  existing critical step, including the Phase 8B.1.0 matrix and the
  checkout-cleanliness step.
- Final HEAD == origin/main, final worktree clean.
- PHASE_8B_1_RETRY_READINESS: READY_FOR_SEPARATE_FRESH_OWNER_AUTHORIZATION;
  Phase 8B.1 retry NOT started, old approval stays spent.
- Final verdict: PHASE_8B_1_0_1_COMPLETE; next action STOP.
