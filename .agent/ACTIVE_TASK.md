# Active Task

Task ID: phase-11a-4-source-freshness-full-regression-closeout
Phase: 11A.4-SOURCE-FRESHNESS-FULL-REGRESSION-CLOSEOUT
Title: Nightwatch Phase 11A.4 — Source-Freshness & Full-Regression Closeout
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-11a-4-source-freshness-full-regression-closeout
Starting SHA: 813fabd898f4989c319affcbbe99551e4620903f
Last validated implementation SHA: 578a9917344c70ba96fe9bd8d06a604ca8964108
Last substantive checkpoint SHA: 578a9917344c70ba96fe9bd8d06a604ca8964108
Last checkpoint: 813fabd898f4989c319affcbbe99551e4620903f
Current milestone: M0 — verification-closeout spec package published. Executor must first resolve the current mobingilabs/ripple-api remote SHA fresh; the canonical sibling pin is not remote-current evidence.
Next action: Execute the canonical Phase 11A.4 SPEC. No DEV. Prove fresh-source derivation plus canonical and isolated complete Playwright regressions. If GitHub Actions remains billing-blocked, terminalize BLOCKED_EXTERNAL_CI and keep Phase 11B NOT_READY/NOT_AUTHORIZED.
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Close only the Phase 11A.3 source-freshness and complete-regression proof gaps. Existing Phase 11A.3 implementation remains the substantive baseline unless these checks expose a concrete Nightwatch defect within existing Phase 11A authority.

NO DEV/NEXT/production, no Phase 11B execution, product mutation, DB/data plane, infrastructure/Phase 6, Alphaus writes, new product/source semantics, campaign/minimization redesign, differential, AI/model authority, selfDev/promotion/catalog/B adoption, or publication.

## Continuity

STARTING_SHA: 813fabd898f4989c319affcbbe99551e4620903f
LAST_VALIDATED_IMPLEMENTATION_SHA: 578a9917344c70ba96fe9bd8d06a604ca8964108
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 578a9917344c70ba96fe9bd8d06a604ca8964108
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_11A_4_STATUS: IN_PROGRESS
PHASE_11A_4_SOURCE_FRESHNESS: NOT_VERIFIED
PHASE_11A_4_FULL_REGRESSION: NOT_VERIFIED
PHASE_11A_STATUS: VERIFICATION_CLOSEOUT_REQUIRED
PHASE_11_COLLECTION_WIDE_SEMANTIC: VERIFICATION_CLOSEOUT_REQUIRED
PHASE_11B_DEV_READINESS: NOT_READY_VERIFICATION_AND_EXTERNAL_CI
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_11A_3_STATUS: BLOCKED_EXTERNAL_CI_LOCAL_IMPLEMENTATION_VERIFIED_WITH_PROOF_GAPS
PHASE_11A_2_STATUS: BLOCKED_EXTERNAL_CI_LOCAL_FIX_VERIFIED
PHASE_11A_1_STATUS: BLOCKED_EXTERNAL_CI_LOCAL_FIX_VERIFIED
PHASE_10_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1
CANONICAL_CATALOG_SHA256 (unchanged): sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Confirmed findings

`CONFIRMED_PHASE_11A_3_SOURCE_FRESHNESS_PROOF_GAP`: predecessor SPEC required fresh remote SHA discovery + disposable exact current snapshot, but terminal evidence used the canonical sibling at historical pin `27bb007ad0c798800b6bd3b29760c966422966e7` as “current-source”.

`CONFIRMED_PHASE_11A_3_FULL_REGRESSION_PROOF_GAP`: predecessor SPEC required complete Playwright + isolated/source-equivalent complete regression, but terminal evidence recorded `npm run test:unit` as full Playwright and only a focused isolated matrix.

## Recovery

The CLI prompt is intentionally short. Fetch canonical `origin/main`, then read this task's PROPOSAL/SPEC/PLAN/STATE/REPORT and `docs/design/PHASE_11A_4_SOURCE_FRESHNESS_FULL_REGRESSION_CLOSEOUT.md`. Git/source evidence wins over conversation text.
