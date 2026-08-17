# SPEC — Nightwatch Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout

Task ID: phase-11a-2-partial-coverage-acceptance-gate-closeout
Phase: 11A.2-PARTIAL-COVERAGE-ACCEPTANCE-CLOSEOUT
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## 0. Authority

This is a narrow corrective continuation of the already owner-authorized Phase 11A local/synthetic implementation. It grants no new product/network authority.

Starting source before this spec package: `a6eb3f274a505dc5453dd8422178487f62182929`.

Verified corrective implementation already present: `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`.

Known externally blocked workflow runs:
- implementation: `32001807202` at `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`;
- docs closure: `32001874321` at `a6eb3f274a505dc5453dd8422178487f62182929`.

Both were refused before job execution by GitHub billing/spending-limit, not by code/test execution.

## 1. Confirmed remaining defect

Current `src/core/phase9b/summary.ts`:
- counts `PARTIAL_COVERAGE` internally;
- does not expose `partialCoverageCount` on `Phase9bSemanticSummary`;
- drops the partial count in `summarizePhase9bPass()`;
- defines decisive evaluation as `invariantPassCount > 0 || outcome === ANOMALY`, so PARTIAL_COVERAGE can be decisive;
- `comparePhase9bReplaySummaries()` does not compare partial-coverage counts;
- `evaluatePhase9bAcceptance()` does not reject partial coverage.

Therefore a receipt with outcome `PARTIAL_COVERAGE` and positive invariant-pass count can satisfy the shared acceptance gate.

Classification: `CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS`.

## 2. Required correction

Add safe summary field:

`partialCoverageCount: number`

Required semantics:
- `summarizePhase9bPass()` populates it from `counts.PARTIAL_COVERAGE`;
- replay comparison compares it;
- `evaluatePhase9bAcceptance()` fails when it is nonzero;
- a PARTIAL_COVERAGE receipt is not counted as decisive solely because `invariantPassCount > 0`;
- clean PASS and ANOMALY behavior remains unchanged.

Do not hide partial coverage inside a generic failure count. Keep it explicit and categorical.

## 3. Phase 10B compatibility

`evaluatePhase10bDeepAcceptance()` composes `evaluatePhase9bAcceptance()`. Add a permanent regression proving a synthetic summary carrying partial coverage cannot pass the Phase 10B deep gate, even if all observed invariant counts otherwise look passing.

Historical Phase 10B real acceptance remains truthful because its historical deep expectation did not use collection-wide contracts and produced PASS with no partial coverage.

Do not rewrite D-60 or historical evidence.

## 4. Historical Phase 9B compatibility

Historical Phase 9B shape expectations cannot generate collection partial coverage under their fixed positional semantics. Existing Phase 9B PASS/ANOMALY/N-A tests must remain green.

Do not change journey, target, expectation, source-freshness, or product authority semantics.

## 5. Durable continuity correction

Before terminalization correct stale Phase 11A.1 durable records using actual Git/source evidence:

- `LAST_VALIDATED_IMPLEMENTATION_SHA` = `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`;
- `LAST_SUBSTANTIVE_CHECKPOINT_SHA` = `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`;
- STATE must not say the implementation is unperformed or M0 is current;
- REPORT must not remain `IN_PROGRESS` / `No corrective implementation is claimed yet`;
- confirmed finding text must distinguish historical pre-fix behavior from current fixed source;
- CI blocker must remain explicit and external until exact CI actually runs.

Do not falsify exact-CI success.

## 6. Required tests

Add permanent tests proving at minimum:

1. PARTIAL_COVERAGE receipt appears as `partialCoverageCount = 1`;
2. PARTIAL_COVERAGE receipt is not counted as decisive;
3. `evaluatePhase9bAcceptance()` rejects partial coverage even with invariantPassCount > 0;
4. clean PASS still passes Phase 9B acceptance;
5. ANOMALY remains eligible evaluation evidence under historical semantics;
6. replay comparison detects FIRST/REPLAY partial-count mismatch;
7. replay comparison accepts identical partial summaries;
8. Phase 10B deep acceptance rejects a partial summary;
9. existing Phase 9B harness matrix remains green;
10. existing Phase 10B matrix remains green;
11. Phase 11A.1 receipt-closeout matrix remains green;
12. Phase 11 collection matrix remains green;
13. no raw-value/privacy fields are introduced.

## 7. Allowed files

Expected narrow source changes:
- `src/core/phase9b/summary.ts`;
- focused Phase 9B/10B/11A.2 tests;
- directly related comments/types only if mechanically required;
- `.agent/**` and `docs/**` for continuity truth;
- workflow only if a dedicated local matrix step is required.

No collection evaluator, projection, receipt-v2, source recipe, journey, endpoint, or environment-policy redesign unless a directly proven blocker requires stopping.

## 8. Forbidden scope

No DEV/NEXT/production. No Phase 11B execution. No product mutation. No DB/data plane. No infra/Phase 6. No Alphaus writes. No real campaign/minimization repair. No differential. No AI/model execution or authority. No selfDev/promotion/catalog/B adoption. No publication.

## 9. Validation

Run at minimum:
- `npm run typecheck`;
- `npm run hardening:check`;
- Phase 11A.2 focused tests;
- Phase 9B matrix;
- Phase 10B matrix;
- Phase 11A.1 matrix;
- Phase 11 matrix;
- historical Phase 9/9A.1/10 focused matrices required by current repo conventions;
- `npm run campaign:synthetic`;
- `npm run test:owner-provenance`;
- `npm run agent:check`;
- `npm run agent:audit`;
- `npm run project:check`;
- catalog integrity;
- `git diff --check`;
- full Playwright and isolated/source-equivalent regression if source changed.

## 10. CI protocol

After corrective source checkpoint:
- push fast-forward;
- if GitHub Actions can start jobs, require exact completed/success for the corrective HEAD;
- also re-run or otherwise obtain exact completed/success for the Phase 11A.1 implementation checkpoint if repository checkpoint policy requires it;
- after docs terminalization require exact final-head CI green.

If Actions again refuses to start jobs with the known billing/spending-limit annotation, terminalize `BLOCKED_EXTERNAL_CI` and keep Phase 11 as local-validated/not-CI-verified.

A real test/code failure is `PHASE_11A_2_BLOCKED_CI_FAILURE`, not the billing blocker.

## 11. Terminal states

Full success:
- `PHASE_11A_2_STATUS: COMPLETE`
- `PHASE_11A_1_STATUS: COMPLETE`
- `PHASE_11A_STATUS: COMPLETE`
- `PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE`
- `PHASE_11B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION`
- `PHASE_11B_STATUS: NOT_AUTHORIZED`
- `NEXT ACTION: STOP`

External CI still blocked:
- `PHASE_11A_2_STATUS: BLOCKED_EXTERNAL_CI`
- `PHASE_11A_1_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11A_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11B_STATUS: NOT_AUTHORIZED`
- `NEXT ACTION: STOP`

## 12. Stop conditions

- `PHASE_11A_2_STOPPED_SOURCE_ADVANCED`
- `PHASE_11A_2_BLOCKED_PARTIAL_ACCEPTANCE_STILL_PASSES`
- `PHASE_11A_2_BLOCKED_HISTORICAL_COMPATIBILITY`
- `PHASE_11A_2_BLOCKED_PRIVACY`
- `PHASE_11A_2_BLOCKED_CONTINUITY`
- `PHASE_11A_2_BLOCKED_CI_FAILURE`
- `PHASE_11A_2_BLOCKED_EXTERNAL_CI`
- `PHASE_11A_2_BLOCKED_SCOPE_EXPANSION`

## 13. Success token

`PHASE_11_PARTIAL_COVERAGE_END_TO_END_NON_PASS_TRUTH: VERIFIED`

Then STOP. No Phase 11B under this task.