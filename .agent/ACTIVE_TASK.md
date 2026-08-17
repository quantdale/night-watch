# Active Task

Task ID: phase-11a-1-partial-coverage-receipt-correctness-closeout
Phase: 11A.1-PARTIAL-COVERAGE-RECEIPT-CLOSEOUT
Title: Nightwatch Phase 11A.1 — Partial-Coverage Receipt Correctness Closeout
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-11a-1-partial-coverage-receipt-correctness-closeout
Starting SHA: 2c47812335379f2efa56df504098f8618d0b07ea
Last validated implementation SHA: 5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef
Last substantive checkpoint SHA: 5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef
Current milestone: M0 — corrective remote spec package published; executor must fresh-fetch, reproduce semantic PARTIAL_COVERAGE -> receipt PASS, then execute the narrow correctness closeout.
Next action: Execute the canonical remote Phase 11A.1 SPEC. No DEV. If GitHub Actions remains externally blocked by billing/spending-limit after local validation and corrective push, terminalize BLOCKED_EXTERNAL_CI instead of claiming exact CI success.
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Correct only the Phase 11 receipt-layer false-PASS gap and directly affected success consumers. Preserve the existing collection evaluator, 128-item projection bound, historical Phase 9/10 semantics, privacy contract, and all product authority boundaries.

NO DEV/NEXT/production, Phase 11B, product mutation, DB/data plane, infrastructure/Phase 6, new source/product semantics, Alphaus writes, campaign/minimization redesign, differential, AI/model authority, selfDev/promotion/catalog/B adoption, or publication.

## Continuity

STARTING_SHA: 2c47812335379f2efa56df504098f8618d0b07ea
LAST_VALIDATED_IMPLEMENTATION_SHA: 5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_11A_1_STATUS: IN_PROGRESS
PHASE_11A_STATUS: CORRECTNESS_CLOSEOUT_REQUIRED
PHASE_11_COLLECTION_WIDE_SEMANTIC: CORRECTNESS_CLOSEOUT_REQUIRED
PHASE_11B_DEV_ACCEPTANCE: NOT_AUTHORIZED
PHASE_10_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1
CANONICAL_CATALOG_SHA256 (unchanged): sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Confirmed finding

`CONFIRMED_PARTIAL_COVERAGE_RECEIPT_FALSE_PASS`: current semantic `PARTIAL_COVERAGE` is mapped by the hook to receipt `PASS`, while the parent Phase 11 design requires partial coverage to remain distinguishable downstream from full PASS.

## Recovery

The CLI prompt is intentionally short. Fetch the canonical remote and recover all detailed authority from this task's PROPOSAL/SPEC/PLAN/STATE/REPORT plus `docs/design/PHASE_11A_1_PARTIAL_COVERAGE_RECEIPT_CLOSEOUT.md`. Git/source state wins over conversation text.
