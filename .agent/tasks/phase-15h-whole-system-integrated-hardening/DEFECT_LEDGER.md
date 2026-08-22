# DEFECT LEDGER — Phase 15H

Populate only from observed hardening failures. Do not pre-fill hypothetical defects as confirmed.

| ID | Gate | Reproducer / command | Observed failure | Root cause | Source fix SHA | Permanent regression | Narrow recheck | Broad recheck | Status |
|---|---|---|---|---|---|---|---|---|---|

Status vocabulary:
- OPEN
- FIXED_FOCUSED
- FIXED_BROAD_GREEN
- BLOCKED_LOCAL
- REFUTED_NOT_A_DEFECT

## Mandatory preloaded hypotheses to test, not assume

- HYP-01 CLUSTERED state-list/exhaustiveness fallout.
- HYP-02 A02 provenance/vocabulary stale pinned cardinalities.
- HYP-03 retry ceiling fourth/fifth-attempt behavior.
- HYP-04 snapshot required-field compatibility/version policy.
- HYP-05 readiness optional movement byte stability.
- HYP-06 A13 narrowed categorical constructor compatibility.
- HYP-07 A15 missed callers after de-export/file removal.
- HYP-08 duplicate private/sentinel screening divergence.
- HYP-09 artifact registration order/completeness.
- HYP-10 checkpoint/orchestrator CLUSTERED + resume-refusal integration.

A hypothesis becomes a defect only after a shown reproducer fails.
