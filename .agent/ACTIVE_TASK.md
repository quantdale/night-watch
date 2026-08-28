# Active Task

Task ID: nightwatch-operational-acceptance-v1
Phase: OPERATIONAL_ACCEPTANCE_V1
Title: Nightwatch Operational Acceptance
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-operational-acceptance-v1
Starting SHA: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
Last validated implementation SHA: e278da19f5fbc62107528033716f271cbb64e1de
Last checkpoint: successor pairing committed `b83282b`; local/clean preflight PASS; owner CLI stdio forwarding repaired
Current milestone: M4 — real DEV owner workflow
Next action: Run `npm run journey:phase2c -- --env=dev --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json` then phase4, phase5, and campaign:real prepare/resume serially
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
remain forbidden.
