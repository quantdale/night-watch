# Active Task

Task ID: nightwatch-dev-requalification-v1
Phase: DEV_REQUALIFICATION_V1
Title: Nightwatch Bounded DEV Requalification
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-dev-requalification-v1
Starting SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
Last validated implementation SHA: 20184770015129fe2138dd1e18a853d34bef7274
Last checkpoint: fresh repaired campaign prepared at `2fe5dc5`
Current milestone: M3 — Reconciliation and closure — IN_PROGRESS
Next action: Resume only campaign `2fe5dc56383e03f493f41efc`, then run final local and clean validation.
Authorization class: NIGHTWATCH_DEV_REQUALIFICATION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
LAST_VALIDATED_IMPLEMENTATION_SHA: 20184770015129fe2138dd1e18a853d34bef7274
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 20184770015129fe2138dd1e18a853d34bef7274
LAST_DOCUMENTATION_CHECKPOINT_SHA: 27fd5cb2de059f21dfcbd7fd4deb028aa412096d
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
