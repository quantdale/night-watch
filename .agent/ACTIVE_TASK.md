# Active Task

Task ID: nightwatch-exact-head-ci-baseline-repair-v1
Phase: EXACT_HEAD_CI_BASELINE_REPAIR_V1
Title: Nightwatch Exact-Head CI Baseline Repair and Truth Reconciliation
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-exact-head-ci-baseline-repair-v1
Starting SHA: c3fed38abd281e8648c039ac3befe8034c13e868
Last validated implementation SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
Last checkpoint: both CI defects reproduced under runner-shaped topology and repaired, with each repaired suite passing in BOTH topologies and zero skips; bounded synthetic-campaign diagnostics landed with 14 new tests; project truth reconciled and a stale-CI-evidence validator added
Current milestone: M7 — full required-stack regression in the owned session worktree
Next action: run the required validation stack, repair any failure, then integrate and certify the exact-head GitHub run
Authorization class: NIGHTWATCH_EXACT_HEAD_CI_BASELINE_REPAIR_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: c3fed38abd281e8648c039ac3befe8034c13e868
LAST_VALIDATED_IMPLEMENTATION_SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 7ce2cf91a00f1916ea1e04790dc395a809ef8727
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXACT_HEAD_CI_BASELINE_REPAIR_V1_STATUS: IN_PROGRESS

## Routing and safety

This is a bounded prerequisite/repair campaign before C-10. Exact-head Actions
run `33572572053` executed `gate:ci` and failed two synthetic-campaign cases.
Both are host-topology defects in TEST code; in each case the production path
was already correct and already fail-closed, and neither implicates C-06.

The campaign repairs root causes rather than suppressing them. No `test.skip`
was added, no required group was made optional, no file was removed from
`campaign:synthetic`, no fail-closed state became a pass, and no test was
deleted. Every repaired suite runs at full strength on a host that can provide
the capability under test and proves the fail-closed path on a host that
cannot, so adversarial coverage increased rather than shrank.

C-10, C-11 through C-14 and `PROD_OBSERVE` are NOT implemented here. No
production, NEXT or DEV contact, credential or auth-state inspection,
datastore, cloud/IAM/Kubernetes access, sibling-repository write, or
publication is authorized or used. Sibling Alphaus repositories are read only,
through the existing confined read-only access object, and their ABSENCE must
never masquerade as valid evidence.

All work happens in the owned session worktree
`session/nightwatch-exact-head-ci-baselin-5b773376`; the canonical checkout is
never used for implementation.
