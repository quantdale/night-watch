# PLAN — Nightwatch Phase 11A.1 — Partial-Coverage Receipt Correctness Closeout

Task ID: phase-11a-1-partial-coverage-receipt-correctness-closeout
Phase: 11A.1-PARTIAL-COVERAGE-RECEIPT-CLOSEOUT
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Correct the Phase 11 receipt-layer false-PASS defect discovered by independent verification, then re-run the required local regression and exact CI truth checks.

## Starting State

- Durable starting SHA before this package: `2c47812335379f2efa56df504098f8618d0b07ea`.
- Phase 11A implementation SHA: `5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`.
- Phase 11A local validation was reported green.
- GitHub Actions remains externally blocked by billing/spending-limit before jobs start.
- Confirmed defect: semantic PARTIAL_COVERAGE is converted to receipt PASS.

## Scope

Receipt-layer correctness fix only. Narrow changes to receipts.ts, hook.ts, and directly affected type consumers.

## Non-Goals

No DEV/NEXT/production. No Phase 11B. No new invariant kind. No collection scan behavior change. No projection schema change. No recipe/source semantics change. No campaign/triage redesign. No Phase 6. No AI/model execution. No selfDev/promotion/catalog/B adoption. No Alphaus writes.

## Safety Constraints

- Historical v1 receipts must remain readable/valid.
- v2 coherence validation must reject contradictory combinations.
- PARTIAL_COVERAGE must never be treated as PASS by any consumer.
- No new product/network authority path.

## Architecture / Approach

Add PARTIAL_COVERAGE to receipt outcome vocabulary as a distinct non-pass outcome. Add bidirectional coherence validation. Fix hook mapping. Audit downstream consumers. Add permanent tests.

## Milestones

- M0 — fresh Git bootstrap; recover this remote spec package; verify live source contains the confirmed mapping defect.
- M1 — permanent pre-fix regression proving a truncated/no-violation semantic evaluation becomes receipt PASS.
- M2 — add explicit receipt PARTIAL_COVERAGE outcome and strict non-pass classification.
- M3 — enforce receipt-v2 coverage coherence and historical v1 compatibility.
- M4 — audit/update every downstream PASS consumer required to preserve partial coverage as non-pass.
- M5 — focused receipt/hook/Phase 11A.1 tests including 129-row and first-uninspected-row cases.
- M6 — historical Phase 9/9A.1/9B/10/10B/11 regression, privacy, determinism, campaign synthetic, owner provenance.
- M7 — full Playwright + isolated/source-equivalent regression, continuity/project/catalog checks, git diff check.
- M8 — substantive corrective checkpoint; push fast-forward; verify current GitHub Actions condition.
- M9 — if Actions runs: require exact green CI. If external billing still blocks job start: terminalize as BLOCKED_EXTERNAL_CI without claiming CI verification.
- M10 — update task/report/current-state docs truthfully; STOP. Phase 11B remains not authorized.

## Implementation constraints

- Keep collection evaluator and projection semantics unchanged unless a direct defect is proven.
- Do not change the 128-item projection bound.
- Do not create a new product/network authority path.
- Do not make receipt coverage metadata optional for PARTIAL_COVERAGE in a way that recreates ambiguity.
- Do not weaken historical v1 receipt validation.

## Validation Strategy

The load-bearing proof is end-to-end:

semantic `PARTIAL_COVERAGE`
→ hook mapping `PARTIAL_COVERAGE`
→ receipt v2 `PARTIAL_COVERAGE`
→ non-pass consumer behavior
→ no full semantic PASS.

Also prove full non-truncated collections still produce PASS and observed violations still produce ANOMALY.

## Decision Log

- D-62: added PARTIAL_COVERAGE as explicit non-pass receipt outcome.
- Coverage coherence validation is bidirectional (PASS cannot carry partial-coverage metadata).

## Discoveries

- Phase 9B acceptance gate does not explicitly reject PARTIAL_COVERAGE (by design).
- Phase 10B deep acceptance gate same gap (mitigated by current target expectations).
- Phase9bSemanticSummary lacks partialCoverageCount field.

## Deferred Work

- CI finalization after GitHub billing unblock.
- Phase 11B remains NOT_AUTHORIZED.

## Completion Criteria

All SPEC gates pass locally. Exact CI is green for full completion; if Actions remains externally blocked before execution, the task ends `BLOCKED_EXTERNAL_CI` and Phase 11A remains local-validated but not CI-verified.
