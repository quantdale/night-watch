# Active Task

Task ID: phase-11a-3-real-source-collection-admission-wiring
Phase: 11A.3-REAL-SOURCE-COLLECTION-ADMISSION
Title: Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-11a-3-real-source-collection-admission-wiring
Starting SHA: 5669146332d357b09a49b29404a603e3fa1e828e
Last validated implementation SHA: f763f3c42447c0c566f536ce6bdb38f2673ededc
Last substantive checkpoint SHA: f763f3c42447c0c566f536ce6bdb38f2673ededc
Current milestone: M0 — corrective remote spec package published; executor must fresh-fetch and permanently reproduce that the production real-source admission path still emits historical positional item-0 expectations and no current collection-wide expectation.
Next action: Execute the canonical remote Phase 11A.3 SPEC. No DEV. If GitHub Actions remains externally blocked after local/source correctness is complete, terminalize BLOCKED_EXTERNAL_CI and keep Phase 11B readiness NOT_READY_EXTERNAL_CI.
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope

Close only the missing real-source collection expectation admission wiring. Preserve historical positional expectation IDs/semantics, existing recipe source authority, resolver currentness behavior, 128-item bounded collection evaluation, receipt/acceptance truth, and all product authority boundaries.

NO DEV/NEXT/production, Phase 11B execution, product mutation, DB/data plane, infrastructure/Phase 6, new Alphaus source semantics, Alphaus writes, campaign/minimization redesign, differential, AI/model authority, selfDev/promotion/catalog/B adoption, or publication.

## Continuity

STARTING_SHA: 5669146332d357b09a49b29404a603e3fa1e828e
LAST_VALIDATED_IMPLEMENTATION_SHA: f763f3c42447c0c566f536ce6bdb38f2673ededc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: f763f3c42447c0c566f536ce6bdb38f2673ededc
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_11A_3_STATUS: IN_PROGRESS
PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION: NOT_VERIFIED
PHASE_11A_STATUS: CORRECTNESS_CLOSEOUT_REQUIRED
PHASE_11_COLLECTION_WIDE_SEMANTIC: CORRECTNESS_CLOSEOUT_REQUIRED
PHASE_11B_DEV_READINESS: NOT_READY_REAL_SOURCE_COLLECTION_ADMISSION
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_11A_2_STATUS: BLOCKED_EXTERNAL_CI_LOCAL_FIX_VERIFIED
PHASE_11A_1_STATUS: BLOCKED_EXTERNAL_CI_LOCAL_FIX_VERIFIED
PHASE_10_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1
CANONICAL_CATALOG_SHA256 (unchanged): sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Confirmed finding

`CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`: the Phase 11 collection evaluator is implemented, but current `deriveRealSourceExpectation()` / recipe registry still produce the historical positional item-0 expectations. The permanent Phase 11 collection matrix constructs `...real-source-collection` expectations from synthetic fixture helpers instead of the production real-source admission bridge. A future Phase 11B run would therefore not yet have a mechanically source-derived collection expectation to resolve.

## Recovery

The CLI prompt is intentionally short. Fetch canonical `origin/main` and recover all detailed authority from this task's PROPOSAL/SPEC/PLAN/STATE/REPORT plus `docs/design/PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION.md`. Git/source state wins over conversation text.
