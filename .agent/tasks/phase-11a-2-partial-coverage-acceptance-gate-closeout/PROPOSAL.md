# PROPOSAL — Nightwatch Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout

Task ID: phase-11a-2-partial-coverage-acceptance-gate-closeout
Phase: 11A.2-PARTIAL-COVERAGE-ACCEPTANCE-CLOSEOUT
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Continuity: nightwatch.agent-continuity.v2

## Why this task exists

Independent verification of the Phase 11A.1 result confirmed that the receipt-layer defect is fixed at source commit `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`: semantic `PARTIAL_COVERAGE` now maps to receipt `PARTIAL_COVERAGE`, the receipt outcome is non-pass, and receipt-v2 coherence rules reject contradictory PASS/partial combinations.

A second load-bearing gap remains in the shared Phase 9B acceptance summary/gate. `outcomeCounts()` knows about `PARTIAL_COVERAGE`, but `Phase9bSemanticSummary` exposes no partial-coverage count, `summarizePhase9bPass()` drops that count, `decisiveEvaluationCount` still treats a partial receipt with invariant passes as decisive, and `evaluatePhase9bAcceptance()` does not reject partial coverage. A collection-wide receipt can therefore be non-PASS at the receipt layer and still be certified by the shared acceptance gate.

Classification:

`CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS`.

The Phase 11A.1 durable records also contain stale continuity metadata: they still point `LAST_VALIDATED_IMPLEMENTATION_SHA` / `LAST_SUBSTANTIVE_CHECKPOINT_SHA` at the pre-fix `5f1889...`, and parts of STATE/REPORT still describe the corrective implementation as not performed. This task must repair that durable truth as part of closeout.

GitHub Actions is still externally blocked before job execution by the account billing/spending-limit condition. Exact CI remains mandatory before Phase 11 is declared fully CI-verified.

## Objective

Make `PARTIAL_COVERAGE` impossible to certify as full semantic acceptance through the shared Phase 9B acceptance path, preserve historical Phase 9B/10B behavior for their fixed non-collection expectations, correct stale Phase 11A.1 continuity records, and establish truthful exact-CI state.

## Fixed implementation direction

1. Add explicit `partialCoverageCount` to the safe Phase 9B summary.
2. Populate it from receipt outcome counts.
3. Include it in FIRST/REPLAY normalized comparison.
4. Make `evaluatePhase9bAcceptance()` fail when `partialCoverageCount != 0`.
5. Define decisive evaluation so `PARTIAL_COVERAGE` is never counted as decisive merely because some inspected invariants passed.
6. Add regression tests showing a partial receipt cannot pass Phase 9B acceptance or the Phase 10B deep gate that composes it.
7. Preserve existing historical clean PASS and ANOMALY behavior.
8. Correct Phase 11A.1 STATE/REPORT/ACTIVE_TASK metadata to the actual corrective implementation SHA and actual terminal blocker.

## Non-goals

No DEV/NEXT/production. No Phase 11B. No new collection semantics. No projection change. No source-contract change. No campaign/minimization redesign. No differential work. No Phase 6. No AI/model execution. No Alphaus writes. No selfDev/promotion/catalog/B adoption. No publication.

## Success condition

`PARTIAL_COVERAGE` remains non-pass from semantic evaluation through receipt, normalized acceptance summary, replay comparison, and acceptance gate. A partial receipt can never satisfy `evaluatePhase9bAcceptance()` or a Phase 10B gate that composes it. Historical non-collection Phase 9B/10B tests remain green. Durable continuity points at the real corrective source checkpoint. Exact CI must be green before Phase 11 becomes fully CI-verified; otherwise terminalize with the external CI blocker.