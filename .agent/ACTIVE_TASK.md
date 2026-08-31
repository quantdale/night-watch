# Active Task

Task ID: nightwatch-dev-requalification-v1
Phase: DEV_REQUALIFICATION_V1
Title: Nightwatch Bounded DEV Requalification
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-dev-requalification-v1
Starting SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
Last validated implementation SHA: f8757303403dffab6039be3f51b807c8631e3c6a
Last checkpoint: successor activation at starting head `e51bf773`
Current milestone: M0 — Successor activation and baseline — IN_PROGRESS
Next action: Run the pre-DEV state/safety checks, then the first serial Phase 2C observation.
Authorization class: NIGHTWATCH_DEV_REQUALIFICATION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
LAST_VALIDATED_IMPLEMENTATION_SHA: f8757303403dffab6039be3f51b807c8631e3c6a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: f8757303403dffab6039be3f51b807c8631e3c6a
LAST_DOCUMENTATION_CHECKPOINT_SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_DEV_REQUALIFICATION_V1_STATUS: IN_PROGRESS

## Routing and safety

This is a new bounded owner-authorized DEV requalification successor. It
preserves the existing `OPERATIONALLY_ACCEPTED` project verdict through the
explicit `PROJECT_VERDICT_EFFECT: PRESERVE` while collecting read-only
evidence. The task is limited to the existing guarded DEV launchers, serial
observations, sanitized owner-local evidence, and local regression repair only
if a Nightwatch defect is found.

No production, NEXT, DEV mutation, data/infra, sibling write, publication,
credential capture, raw authenticated evidence, containment weakening, or
retry-based correctness claim is authorized.
