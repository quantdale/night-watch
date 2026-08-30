# Active Task

Task ID: nightwatch-operational-acceptance-v1
Phase: OPERATIONAL_ACCEPTANCE_V1
Title: Nightwatch Operational Acceptance
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-operational-acceptance-v1
Starting SHA: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
Last validated implementation SHA: 56d3c247626547b4d30812ae510f4d8f4e47f173
Last checkpoint: validated repair `56d3c24` (response-oracle settlement) pushed and synchronized; DEV auth valid until 2026-08-31; Phase 4 serial rerun interrupted and ready to resume
Current milestone: M4 — IN_PROGRESS: serial real DEV owner workflow with valid auth
Next action: Resume serial real DEV workflow (phase2c → phase4 → phase5 → campaign prepare/resume) from current HEAD
Authorization class: NIGHTWATCH_OPERATIONAL_ACCEPTANCE_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
LAST_VALIDATED_IMPLEMENTATION_SHA: 56d3c247626547b4d30812ae510f4d8f4e47f173
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
remain forbidden. The 2026-08-30 DEV probes initially required human auth, which
was subsequently captured and remains valid (expires 2026-08-31 07:59 PST); later
phase2c/phase5/campaign probes passed while phase4 exposed real selector and
response-oracle defects repaired through `56d3c24`. The serial DEV workflow is
now resumable with the same external state.
