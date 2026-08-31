# Active Task

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Title: Nightwatch Replay Budget and Dossier Closure
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-replay-budget-and-dossier-closure-v1
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Last validated implementation SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a
Last checkpoint: M0 starvation regression committed and pushed; M1 design recorded
Current milestone: M2 — implement and adversarially validate bounded replay reservations
Next action: implement durable normalized replay reservations and adversarial tests
Authorization class: NIGHTWATCH_REPLAY_BUDGET_DOSSIER_CLOSURE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
LAST_VALIDATED_IMPLEMENTATION_SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_REPLAY_BUDGET_DOSSIER_CLOSURE_V1_STATUS: IN_PROGRESS

## Routing and safety

This successor exists specifically to remove the proven Phase 7 reproduction
budget starvation while preserving bounded execution and strict DVR-011
admission. The completed soak remains historical and must not be reopened.

No production, NEXT, DEV mutation, datastore/database, infrastructure,
sibling-repository write, publication, credential persistence, raw
authenticated evidence in Git, containment weakening, historical-candidate
replay, or unbounded retry authority is granted.
