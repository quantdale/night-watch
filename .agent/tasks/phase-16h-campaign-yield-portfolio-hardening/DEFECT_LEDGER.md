# DEFECT LEDGER — Phase 16H

Populate only from observed hardening failures. Hypotheses are not defects until reproduced.

| ID | Gate | Reproducer | Observed failure | Root cause | Source fix | Permanent regression | Narrow recheck | Broad recheck | Status |
|---|---|---|---|---|---|---|---|---|---|

Status vocabulary:
- OPEN
- FIXED_FOCUSED
- FIXED_BROAD_GREEN
- BLOCKED_LOCAL
- REFUTED_NOT_A_DEFECT

## Initial hypotheses to test, not pre-confirm

- HYP-01: input-order permutation may affect tie/allocation ordering.
- HYP-02: starvation floor may interact incorrectly with hard stale/authority blockers.
- HYP-03: reserve budget can over-constrain exact-fit portfolios or produce unstable unselected reasons.
- HYP-04: zero-denominator yield metrics may produce non-finite values.
- HYP-05: manifest/replan identity may overreact to SHA-only source movement.
- HYP-06: derivation/authority changes may not be load-bearing enough in replan invalidation.
- HYP-07: CLI malformed-input/error surfaces may leak arbitrary raw strings.
- HYP-08: DEV handoff may carry enough data to be mistaken for execution authority.
- HYP-09: focused Phase-16A tests may miss complete-suite import/topology fallout.
- HYP-10: Node/version/topology differences may change byte determinism or CLI output.
