# C-16 Expected Information Gain + Orphaned Ownership Closure — Report

- Starting SHA: `529b02a8d54a951eda1636e144a05a7442238c5b`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Task objective: resolve two orphaned requirements, then implement a bounded,
  deterministic, explainable LOCAL prioritisation that ranks and grants nothing.
- Safety events: NONE
- Remaining blockers: none.
- Recommended next phase/task: C-07 derived semantics and generated DEV targets.

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | Both orphans have an explicit owner from authoritative definitions; ledger rows closed | PASS | master ledger row closed with G-16 and EIG recorded separately |
| 2 | EIG deterministic; tie-breaking defined and stable | PASS | reversed input yields byte-identical ranking; ties order by target id |
| 3 | Missing facts safe: UNKNOWN neither maximises nor zeroes, per factor | PASS | six per-factor tests; probes E1, E2 |
| 4 | Ranking explainable: factor levels and reason codes per entry | PASS | numerator and denominator recomputed from published levels |
| 5 | Ranking grants no authority | PASS | `grantsAuthority: false` as data; probes E3, E7 |
| 6 | Duplicate risk demotes | PASS | `MANY_PRIOR_CLUSTERS` ranks below `NO_PRIOR_FINDING` with `DEMOTED_BY_PRIOR_FINDINGS` |
| 7 | Novelty and contract depth behave as §9.2 defines | PASS | both orderings asserted end to end |
| 8 | Change recency consumes source-change evidence, never wall-clock | PASS | no level names a duration; probe E6 |
| 9 | Broad shallow sweep scores worse than a deep pass | PASS | asserted directly, with cost in the denominator |
| 10 | G-16 implemented; the check bites | PASS | 4 live figures checked; stale, unknown-measure, exemption and accident cases all covered |
| 11 | Regression, local, clean and exact-head CI green; siblingWrites 0; released | IN_PROGRESS | regression 0 failed; gates re-running after the handoff omission was repaired |

## Defects

None in the implementation. One process omission is recorded under Validation
in `STATE.md`: the first gate attempt failed at `HANDOFF_TRUTH` because C-16's
STATE, REPORT, OpenSpec change and routing had not been written before the
battery was run.

Status: IN_PROGRESS
