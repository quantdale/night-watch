# C-16 Expected Information Gain + Orphaned Ownership Closure — Report

- Starting SHA: `529b02a8d54a951eda1636e144a05a7442238c5b`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Substantive implementation anchor: `7fff8159fd044ca19933caa2a2bef6052fad143c`
- Certified exact-head checkpoint: `d863a7fe4c55e9172a473d925f9c131560a23be7`, run `33811693944`
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
| 11 | Regression, local, clean and exact-head CI green; siblingWrites 0; released | PASS | regression 3,556/3,543/13/**0 failed**; `gate:local` PASS; `gate:clean` PASS with `siblingWrites: 0`; exact-head CI PASS at `d863a7f`; session released |

## What each orphan turned out to be

| | G-16 | EIG |
|---|---|---|
| Kind | documentation truth | prioritisation |
| Definition source | master-plan gap matrix | master-plan `design.md §9.2` |
| Previous owner | none | none |
| Now owned by | **C-16** | **C-16** |
| Implemented | yes — `censusFigureLedger.ts` | yes — `expectedInformationGain.ts` |

They share only the property of being orphaned. The ledger row's phrasing
("G-16 and EIG owners") invites reading them as one prioritisation concern,
which would have produced an EIG module and left the documentation-truth
requirement unimplemented — while the condition it polices was actively
worsening, since this campaign has been writing measured figures into
`docs/CURRENT_STATE.md` all night. Four of those figures are now tagged and
checked against the ledger.

G-16's gap-matrix row also records that **manual correction was considered and
REJECTED because it recurs**, so a mechanical check was the required shape of
the fix, not a stylistic preference.

## CI skip accounting

| `SYNTHETIC_CAMPAIGN` | total | passed | skipped | failed |
|---|---|---|---|---|
| `68f479b` (post-C-09) | 829 | 790 | 39 | 0 |
| `d863a7f` (certified) | 866 | 827 | **39** | 0 |
| delta | +37 | **+37** | **0** | 0 |

Predicted before the run and confirmed: the skip count does not move, because
the C-16 suite reads only its own fixtures and `docs/CURRENT_STATE.md`, both
present in a clean checkout. **All 37 new cases execute in CI** — including
every G-16 case, so the documentation-truth check is gate-enforced rather than
locally verified.

## Defects

None in the implementation.

One flaw of my own was caught during implementation and is recorded because it
would have silently defeated the check it belonged to: G-16's first draft
exempted any line containing `historical`, `refuted`, `superseded`,
`previously`, `no longer` or `was ` — and `was ` alone would have exempted a
large fraction of English prose, including lines carrying live figures. An
exemption that fires by accident is worse than no exemption, because the check
then passes while proving nothing. It is now one explicit marker, and a test
asserts the exemption cannot fire on ordinary prose.

One process omission: the first gate attempt failed at `HANDOFF_TRUTH` because
C-16's STATE, REPORT, OpenSpec change and routing had not been written before
the battery was run. The regression had already passed, so the implementation
was sound throughout; what was missing was the record that makes it auditable.
Recorded rather than quietly repaired, because the sequence matters —
scaffolding before battery, not after.

Status: COMPLETE
