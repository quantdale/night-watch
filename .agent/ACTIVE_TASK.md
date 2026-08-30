# Active Task

Task ID: nightwatch-operational-acceptance-v1
Phase: OPERATIONAL_ACCEPTANCE_V1
Title: Nightwatch Operational Acceptance
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-operational-acceptance-v1
Starting SHA: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
Last validated implementation SHA: e278da19f5fbc62107528033716f271cbb64e1de
Last checkpoint: successor pairing committed `b83282b`; local/clean preflight PASS; owner CLI stdio forwarding repaired; 2026-08-30 DEV probes fail closed at auth refresh
Current milestone: M4 — real DEV owner workflow
Next action: Human owner runs the existing guarded auth capture into the external DEV state, then reruns phase2c, phase4, phase5, and campaign prepare/resume serially
Authorization class: NIGHTWATCH_OPERATIONAL_ACCEPTANCE_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
LAST_VALIDATED_IMPLEMENTATION_SHA: e278da19f5fbc62107528033716f271cbb64e1de
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_OPERATIONAL_ACCEPTANCE_V1_STATUS: IN_PROGRESS

## Routing and safety

This is the successor operational-acceptance campaign. The predecessor
`nightwatch-final-completion-and-l6-containment-v1` remains COMPLETE historical
local/clean certification and must not be rewritten as operational acceptance.
Work is bounded to Git topology cleanup, truthful reclassification, local
preflight, and contained DEV owner workflow. Production, DEV mutation,
infrastructure/data-layer operations, credential leakage and Alphaus writes
remain forbidden. The 2026-08-30 DEV probes reached the guarded auth boundary
but did not create a browser/product session; the external state must be
refreshed by a human owner before the real workflow can continue.
