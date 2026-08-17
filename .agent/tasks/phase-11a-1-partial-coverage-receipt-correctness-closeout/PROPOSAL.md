# PROPOSAL — Phase 11A.1 Partial-Coverage Receipt Correctness Closeout

Task ID: phase-11a-1-partial-coverage-receipt-correctness-closeout
Phase: 11A.1-PARTIAL-COVERAGE-RECEIPT-CLOSEOUT
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Continuity: nightwatch.agent-continuity.v2

## Why this task exists

Independent verification of the Phase 11A terminal report found a load-bearing contradiction between the frozen Phase 11 design and the committed receipt adapter.

Current semantic evaluation can produce `PARTIAL_COVERAGE`, but `semanticOutcomeToReceiptOutcome()` maps that state to receipt `PASS`. `SemanticReceiptOutcome` has no `PARTIAL_COVERAGE` member. This means a downstream consumer that keys on receipt outcome can treat a truncated collection with no observed violation as semantic PASS, even though the Phase 11 design requires partial coverage to remain distinguishable from full PASS.

This is classified:

`CONFIRMED_PARTIAL_COVERAGE_RECEIPT_FALSE_PASS`

The original Phase 11A task also required exact implementation and final CI to be green. GitHub Actions is currently blocked before job start by an external billing/spending-limit condition, so Phase 11A cannot truthfully be considered CI-verified yet.

## Objective

Close the receipt-layer false-PASS gap without changing product authority, source semantics, collection scan breadth, projection schema, or Phase 11 finding behavior. Preserve historical v1 receipt compatibility. Re-run all local Phase 11 and historical regression gates. If GitHub Actions remains externally unavailable, stop with an explicit external-CI blocker instead of claiming exact CI success.

## Fixed implementation direction

1. Add explicit `PARTIAL_COVERAGE` to the receipt outcome vocabulary.
2. Treat it as a non-PASS outcome.
3. Map semantic `PARTIAL_COVERAGE` to receipt `PARTIAL_COVERAGE`, never `PASS`.
4. Make receipt validation enforce coherent coverage-state/outcome combinations.
5. Preserve historical receipt-v1 readability and reject v2-only collection fields on v1 receipts.
6. Audit downstream consumers for `outcome === 'PASS'` or equivalent success logic so partial coverage cannot regain PASS status later.
7. Add end-to-end hook/receipt tests for 129+ valid rows and first-uninspected-row cases.

## Non-goals

No DEV/NEXT/production. No Phase 11B. No new invariant kind. No new collection scan behavior. No projection schema change. No recipe/source semantics change. No campaign/triage redesign. No Phase 6. No AI/model execution. No selfDev/promotion/catalog/B adoption. No Alphaus writes.

## Success condition

A truncated/no-observed-violation collection must remain `PARTIAL_COVERAGE` from invariant aggregation through semantic hook, receipt, observer-safe metadata, and every success consumer. It must never be accepted as full semantic PASS. Historical v1 receipts remain valid/readable. Local regression is green. Exact CI must be green before Phase 11A is declared fully CI-verified; otherwise terminal state is external-CI-blocked.
