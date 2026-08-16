# Active Task

Task ID: phase-9a-1-real-source-expectation-admission
Phase: 9A.1-REAL-SOURCE-EXPECTATION
Title: Nightwatch Phase 9A.1 — Real-Source Expectation Admission & Semantic Evaluation Observability
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-9a-1-real-source-expectation-admission
Starting SHA: 91a64e597bc0b28653fe53bf46e291126963baa5
Last validated implementation SHA: e74185bf7b83783c2b7421e675ea2d3bb9053482
Current milestone: M6 — test matrices in flight (all green so far); hardening
guards + CI step landed
Last checkpoint: 2026-08-16 — pre-fix gaps reproduced (A NOT_ADMITTED;
B identical {findings: []}; C silent hook); candidate audit (4 ADMISSIBLE /
1 AMBIGUOUS / 1 deferred); implementation: recipe layer + PHP extractors +
admission bridge + atomic resolver + receipts + observer ledger +
no-silent-failure + privacy escalation; 212/212 focused matrix green;
hardening PASS
Next action: finish test matrices, run full local validation + full
Playwright regression, checkpoint push, CI, docs, STOP.
Authorization class: PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Close the Phase 9B readiness gaps locally: real-source expectation admission
(Nightwatch-owned recipe/extractor bridge; no Alphaus annotations), safe
semantic evaluation receipts (PASS/ANOMALY/NOT_APPLICABLE/NO_EXPECTATION/
SOURCE_STALE/SOURCE_UNAVAILABLE/INVALID_INPUT/PROJECTION_LIMIT_EXCEEDED/
INTERNAL_ERROR), NO_EXPECTATION != PASS, no silent semantic hook failure,
observer semantic evaluation ledger, atomic expectation+snapshot resolution,
source-evidence binding + fail-closed currentness, synthetic-rebinding
rejection, conforming/mutated synthetic evaluations, hardening + CI,
full validation + isolated checkout, exact checkpoints + exact CI, Phase 9B
readiness verdict, docs/decision closure (D-55), terminal STOP.
LOCAL / SOURCE-ONLY / SYNTHETIC ONLY. NO DEV/NEXT/production contact, NO
Phase 5 real traffic, NO authenticated journeys, NO product mutations, NO
Alphaus writes, NO DB/infra (Phase 6 freeze), NO AI models, NO selfDev/
catalog/promotion activity, NO variant-B adoption, NO publication.

## Continuity

STARTING_SHA: 91a64e597bc0b28653fe53bf46e291126963baa5
LAST_VALIDATED_IMPLEMENTATION_SHA: e74185bf7b83783c2b7421e675ea2d3bb9053482
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e74185bf7b83783c2b7421e675ea2d3bb9053482
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_9A_1_STATUS: IN_PROGRESS
PHASE_9_STATUS (narrative, unchanged): COMPLETE_LOCAL_SYNTHETIC
PHASE_9B_DEV_READINESS: (decided at the end of this task)
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE
