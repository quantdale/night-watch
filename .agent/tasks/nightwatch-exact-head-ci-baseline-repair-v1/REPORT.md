# REPORT.md

**Task:** nightwatch-exact-head-ci-baseline-repair-v1
**Status:** IN_PROGRESS

This report is finalized at campaign closure. It is intentionally not marked
complete before the exact-head GitHub evidence exists.

## What this campaign is

Exact-head Actions run `33572572053` at
`c3fed38abd281e8648c039ac3befe8034c13e868` was the first run to bootstrap the
runner and execute `gate:ci`. It failed on two real synthetic-campaign cases.
The campaign root-causes and repairs both, makes such a failure debuggable from
its own receipt, and reconciles project truth.

## Root causes

`DEF-CI-01` and `DEF-CI-02` are recorded in full in `STATE.md`. Both are
host-topology defects in TEST code; in each case the production path was
already correct and already fail-closed. Neither implicates C-06.

`DEF-CI-03` is the diagnostic blindness that made the other two expensive to
find: the gate's detail parser served exactly one schema, and its count parser
could not see Playwright's "did not run" bucket.

## Outcome

Pending M7 and M8. The final report will carry the starting SHA, the final
substantive SHA, the final `origin/main` SHA, files changed, tests added and
changed, before/after synthetic counts, the complete regression count, the
local and clean gate receipts, the GitHub run and job IDs with the exact CI
receipt, the group-by-group CI result, the project-truth corrections, and
confirmation that no safety authority was expanded.
