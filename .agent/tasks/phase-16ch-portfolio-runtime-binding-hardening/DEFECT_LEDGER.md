# DEFECT LEDGER — Phase 16CH

Populate only from observed hardening failures. Hypotheses are not defects until reproduced.

| ID | Gate | Reproducer | Observed failure | Root cause | Source fix | Permanent regression | Narrow recheck | Broad recheck | Status |
|---|---|---|---|---|---|---|---|---|---|

Status vocabulary: OPEN, FIXED_FOCUSED, FIXED_BROAD_GREEN, BLOCKED_LOCAL, REFUTED_NOT_A_DEFECT.

## Initial hypotheses — test, do not pre-confirm

- HYP-01: field-by-field `portfolioBinding` tamper may expose a non-load-bearing resume field.
- HYP-02: launcher CRLF/no-final-newline/hostile path errors may leak raw detail or parse inconsistently across environments.
- HYP-03: mixed journey/API plans near reserve limits may expose budget-mapping incoherence despite elementwise monotonicity.
- HYP-04: canonical runtime linkage may become ambiguous under duplicate/cross-kind synthetic registry construction.
- HYP-05: schema-optional compatibility may regress historical campaignId/manifestFingerprint byte identity.
- HYP-06: resume reauthorization may be correctly checked in the adapter but bypassable through an alternate local call path.
- HYP-07: Phase-16C source additions may introduce complete-suite import/topology fallout missed by focused tests.
- HYP-08: isolated Node/filesystem/topology behavior may alter runtime-plan byte determinism or external-file rejection.
- HYP-09: static single-executor proof may reveal another runner/import path capable of executing a bound manifest without the portfolio gate.

Every disposition must cite current source/test evidence.