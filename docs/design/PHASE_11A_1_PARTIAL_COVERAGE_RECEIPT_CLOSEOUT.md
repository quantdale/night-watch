# Phase 11A.1 — Partial-Coverage Receipt Correctness Closeout

Status: AUTHORIZED_CORRECTIVE_CONTINUATION
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Task: `.agent/tasks/phase-11a-1-partial-coverage-receipt-correctness-closeout/`
Parent design: `docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`

## Problem

Phase 11A correctly introduced a semantic-level `PARTIAL_COVERAGE` outcome and explicit collection coverage states, but the hook currently maps semantic `PARTIAL_COVERAGE` to receipt `PASS`. Receipt v2 carries coverage metadata but its outcome vocabulary omits `PARTIAL_COVERAGE`.

That is insufficient because any downstream PASS-only consumer can erase the partial state. The parent design explicitly requires partial coverage to remain load-bearing downstream and never be indistinguishable from full semantic PASS.

Classification:

`CONFIRMED_PARTIAL_COVERAGE_RECEIPT_FALSE_PASS`.

## Normative correction

The safe semantic receipt layer must expose `PARTIAL_COVERAGE` as its own non-pass outcome.

Required chain:

`PARTIAL_COVERAGE_NO_VIOLATION`
→ semantic `PARTIAL_COVERAGE`
→ receipt `PARTIAL_COVERAGE`
→ downstream non-pass / incomplete-coverage treatment.

Never:

`PARTIAL_COVERAGE`
→ receipt `PASS`.

## Receipt-v2 rules

Receipt v2 may carry:

- coverageState
- inspectedItemCount
- violatingItemCount

Coherence must be strict. `PARTIAL_COVERAGE` requires `PARTIAL_COVERAGE_NO_VIOLATION`, zero violations, and zero findings. PASS cannot carry partial coverage. Violation counts cannot exceed inspected counts.

Historical receipt v1 remains readable under its original shape and must not accept Phase-11 coverage metadata.

## Downstream rule

Every consumer that decides whether semantic evaluation is fully passing must treat receipt `PARTIAL_COVERAGE` as non-pass/incomplete. It is not an anomaly, but it is not semantic certainty.

## CI truth

Exact CI remains a mandatory Phase 11 completion gate. GitHub Actions is currently externally blocked before execution by a billing/spending-limit condition. A locally green corrective implementation may be recorded as local-validated, but full Phase 11 completion requires exact green CI once Actions can run.

## Boundaries

No DEV. No Phase 11B. No product/network authority change. No projection schema change. No collection scan redesign. No Phase 6. No AI/model execution. No Alphaus writes. No selfDev/promotion/catalog changes.
