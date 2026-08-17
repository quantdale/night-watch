# REPORT — Nightwatch Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout

Task ID: phase-11a-2-partial-coverage-acceptance-gate-closeout
Phase: 11A.2-PARTIAL-COVERAGE-ACCEPTANCE-CLOSEOUT
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Verified starting facts

Independent review established:

- live predecessor source fix exists at `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`;
- semantic `PARTIAL_COVERAGE` maps to receipt `PARTIAL_COVERAGE`;
- `PARTIAL_COVERAGE` is in the receipt non-pass set;
- receipt-v2 coherence validation rejects PASS with partial-coverage metadata;
- current `src/core/phase9b/summary.ts` still drops partial coverage from the public summary and acceptance checks;
- Phase 11A.1 durable STATE/REPORT metadata is stale relative to the corrective implementation;
- GitHub Actions runs `32001807202` and `32001874321` were blocked before job execution by the billing/spending-limit condition.

Classification:

`CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS`.

## Required final evidence

Populate from actual execution:

- fresh bootstrap and starting/final SHA;
- pre-fix acceptance-gate reproduction;
- `partialCoverageCount` implementation;
- decisive-evaluation behavior;
- Phase 9B acceptance partial rejection;
- replay comparison partial-count behavior;
- Phase 10B composed-gate partial rejection;
- historical Phase 9B/10B compatibility;
- Phase 11A.1/11 regression;
- privacy/determinism;
- continuity correction of predecessor STATE/REPORT;
- catalog integrity;
- substantive corrective checkpoint;
- exact GitHub Actions result or exact external blocker annotation;
- final continuity state;
- Phase 11B authority status.

## Final-state rule

Do not declare Phase 11 fully COMPLETE while either:

1. a PARTIAL_COVERAGE receipt can pass a shared acceptance gate, or
2. exact CI has not actually completed successfully.

If source/local correctness is complete but Actions remains externally unavailable, terminalize `BLOCKED_EXTERNAL_CI` and keep Phase 11 local-validated/not-CI-verified.

Phase 11B remains NOT_AUTHORIZED in all branches.