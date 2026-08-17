# Task State

## Identity

Task ID: phase-11a-3-real-source-collection-admission-wiring
Phase: 11A.3-REAL-SOURCE-COLLECTION-ADMISSION
Title: Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Status: IN_PROGRESS
Starting SHA: 5669146332d357b09a49b29404a603e3fa1e828e
Last validated implementation SHA: f763f3c42447c0c566f536ce6bdb38f2673ededc
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

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
PHASE_10_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1
CANONICAL_CATALOG_SHA256 (unchanged): sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Objective

Close `CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`: current real-source derivation still emits historical positional item-0 expectations, while the Phase 11 collection evaluator is only exercised by synthetic helper-created collection expectations. Add an explicit deterministic collection-admission bridge, prove it through existing real-source derivation and resolver machinery, validate locally, and establish truthful CI/readiness state. No DEV.

## Current Milestone

M0 — remote corrective spec package is being published. The fresh executor must fetch the final package head, verify clean current Git state, and reproduce the real-source admission gap before source changes.

## Work In Progress

Spec-driven Phase 11A.3 bootstrap only. No Phase 11A.3 implementation source change is claimed by this STATE.

## Exact Next Action

Fresh CLI executor:

1. fetch origin in the canonical Nightwatch repository;
2. require clean `main` and `HEAD == origin/main`; Git wins;
3. read `AGENTS.md`, `.agent/ACTIVE_TASK.md`, this task's PROPOSAL/SPEC/PLAN/STATE/REPORT, and `docs/design/PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION.md`;
4. permanently reproduce that `deriveRealSourceExpectation(s)` returns positional item-0 expectations while Phase 11 collection expectations are only fixture-helper-created;
5. execute SPEC M1 onward without DEV.

## Confirmed Finding

`CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`

Evidence at the pre-task source:

- `src/oracles/expectations/admission.ts` emits positional invariants using `String(recipe.blueprint.itemIndex)`;
- `src/oracles/expectations/recipes/registry.ts` retains `itemIndex: 0` and historical IDs;
- the Phase 11 implementation checkpoint did not modify admission, registry, or resolver;
- `tests/unit/phase11CollectionWide.test.ts` builds collection expectations from `corpus/phase11/source-fixture/phase11Fixtures.ts` helpers.

Therefore a real-source derivation/resolver path has no current collection-wide expectation to supply to a future Phase 11B run.

## Scope Boundaries

No DEV/NEXT/production, no Phase 11B, no product mutation, no DB/data layer, no infra/Phase 6, no Alphaus writes, no new source semantics, no campaign/minimization redesign, no differential, no AI/model authority, no selfDev/promotion/catalog/B adoption, no publication.

## External CI Condition

GitHub Actions is currently known to be blocked before job start by the account billing/spending-limit condition. The executor must re-check after its substantive checkpoint and must not claim exact CI success unless jobs actually execute and pass at the exact SHA.

## Decisions Made Before Execution

- Historical derivation semantics/IDs are immutable.
- Collection admission must be additive and explicit.
- Same source proof/evidence is reused; evaluation breadth changes, source authority does not.
- Resolver receives an explicit expectation generation/set; no hidden priority between historical and collection expectations.
- Phase 11B remains NOT_AUTHORIZED.

## Blockers

None yet beyond the known external CI dependency. Source implementation has not started.

## Safety Events

None.

## Deferred / Follow-Up

- Phase 11B contained DEV collection-wide acceptance, only after Phase 11A.3 + exact CI readiness and separate owner authorization.
- High-confidence real semantic triage remains NEXT_AFTER Phase 11.

## Resume Recipe

Task is IN_PROGRESS. Recover from remote Git state and execute the frozen SPEC from M0 onward.
