# Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout

Status: AUTHORIZED_CORRECTIVE_CONTINUATION
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Task: `.agent/tasks/phase-11a-2-partial-coverage-acceptance-gate-closeout/`
Parent designs:
- `docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`
- `docs/design/PHASE_11A_1_PARTIAL_COVERAGE_RECEIPT_CLOSEOUT.md`

## Problem

Phase 11A.1 fixed the receipt-layer false-PASS: semantic partial coverage now remains receipt `PARTIAL_COVERAGE`, not receipt `PASS`.

The shared Phase 9B normalized acceptance layer still loses that distinction. `outcomeCounts()` counts partial coverage internally, but `Phase9bSemanticSummary` does not expose the count; the summary drops it, decisive evaluation can count a partial receipt when some inspected invariants pass, and `evaluatePhase9bAcceptance()` has no partial-coverage rejection.

This violates the Phase 11 invariant:

`partial coverage != full semantic acceptance`.

Classification: `CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS`.

## Normative correction

The safe summary must carry an explicit bounded categorical count:

`partialCoverageCount`.

A shared acceptance decision must fail whenever that count is nonzero.

A partial receipt must not contribute to decisive/full-pass evidence merely because some inspected invariants passed. ANOMALY remains decisive; full PASS remains decisive; partial remains incomplete coverage.

FIRST/REPLAY normalized comparison must include the partial count so replay cannot hide a coverage-state mismatch.

## Phase 10B compatibility

Phase 10B composes the Phase 9B acceptance gate. Its historical successful DEV run is unaffected because the historical fixed item-0 deep expectation did not produce collection partial coverage. Permanent synthetic tests must nevertheless prove that a future partial summary cannot pass the composed deep gate.

## Continuity truth

The predecessor Phase 11A.1 durable records must be corrected to point at `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3` as the corrective implementation/substantive checkpoint and must stop describing the implementation as unperformed. Exact CI remains blocked externally until GitHub Actions can actually start jobs.

## CI truth

Known externally blocked runs:
- `32001807202` at `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`;
- `32001874321` at `a6eb3f274a505dc5453dd8422178487f62182929`.

A billing/spending-limit refusal before job start is not code failure and is not green CI. Full Phase 11 completion requires an exact corrective-head CI and exact final-head CI that actually execute and succeed.

## Boundaries

No DEV. No Phase 11B. No product/network authority. No collection/projection/source-contract redesign. No real campaign/minimization fix. No Phase 6. No AI/model authority. No Alphaus writes. No selfDev/promotion/catalog changes.