# Active Task

Task ID: nightwatch-exact-head-ci-baseline-repair-v1
Phase: EXACT_HEAD_CI_BASELINE_REPAIR_V1
Title: Nightwatch Exact-Head CI Baseline Repair and Truth Reconciliation
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-exact-head-ci-baseline-repair-v1
Starting SHA: c3fed38abd281e8648c039ac3befe8034c13e868
Last validated implementation SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
Last checkpoint: exact-head GitHub run 33590645175 at b99ce4e passed all eleven required groups with receipt receipt:sha256:120582acb7bb971190a3a05d, including the first-ever execution of PATCH_INTEGRITY and WORKSPACE_INTEGRITY; local and clean Node 20 gates green and a 2,839-test canonical regression green
Current milestone: COMPLETE / STOP — M1 through M8 are closed
Next action: STOP — this campaign is complete; do not begin another campaign in this task, and do not run any implementation session in the canonical checkout
Authorization class: NIGHTWATCH_EXACT_HEAD_CI_BASELINE_REPAIR_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: c3fed38abd281e8648c039ac3befe8034c13e868
LAST_VALIDATED_IMPLEMENTATION_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXACT_HEAD_CI_BASELINE_REPAIR_V1_STATUS: COMPLETE

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
