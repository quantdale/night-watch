# Active Task

Task ID: phase-11a-2-partial-coverage-acceptance-gate-closeout
Phase: 11A.2-PARTIAL-COVERAGE-ACCEPTANCE-CLOSEOUT
Title: Nightwatch Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-11a-2-partial-coverage-acceptance-gate-closeout
Starting SHA: a6eb3f274a505dc5453dd8422178487f62182929
Last validated implementation SHA: 51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3
Last substantive checkpoint SHA: 51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3
Current milestone: M0 — corrective remote spec package published; executor must fresh-fetch and permanently reproduce the shared acceptance-gate partial-coverage false-PASS before source changes.
Next action: Execute the canonical remote Phase 11A.2 SPEC. No DEV. If GitHub Actions remains externally blocked after local/source correctness is complete, terminalize BLOCKED_EXTERNAL_CI without claiming exact CI success.
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Correct only the remaining downstream acceptance truth gap: PARTIAL_COVERAGE must not be certified by the shared Phase 9B acceptance path or the Phase 10B gate that composes it. Repair stale Phase 11A.1 continuity metadata and establish truthful CI state.

NO DEV/NEXT/production, no Phase 11B, product mutation, DB/data plane, infrastructure/Phase 6, new source/product semantics, Alphaus writes, campaign/minimization redesign, differential, AI/model authority, selfDev/promotion/catalog/B adoption, or publication.

## Continuity

STARTING_SHA: a6eb3f274a505dc5453dd8422178487f62182929
LAST_VALIDATED_IMPLEMENTATION_SHA: 51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_11A_2_STATUS: IN_PROGRESS
PHASE_11A_1_PARTIAL_COVERAGE_RECEIPT_TRUTH: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_11A_1_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED
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

`CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS`: receipt-layer truth is fixed, but current `src/core/phase9b/summary.ts` can still count a partial receipt as decisive and its acceptance gate does not reject partial coverage.

## Recovery

The CLI prompt is intentionally short. Fetch the canonical remote and recover all detailed authority from this task's PROPOSAL/SPEC/PLAN/STATE/REPORT plus `docs/design/PHASE_11A_2_PARTIAL_COVERAGE_ACCEPTANCE_CLOSEOUT.md`. Git/source state wins over conversation text.