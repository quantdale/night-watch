# Active Task

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Title: Nightwatch Reliability, Yield, and State Protocol Campaign
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
Last checkpoint: task/OpenSpec scaffold validated and pushed at `d11dae2`
Current milestone: M1 — Phase 2C replay diagnosis and identity — IN_PROGRESS
Next action: Inspect the existing replay identity, observation settlement, and divergence paths; create a deterministic reproducer before modifying them
Authorization class: NIGHTWATCH_RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
LAST_VALIDATED_IMPLEMENTATION_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d12b1d75886987356f3ab6d80ca5b25f0723c471
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1_STATUS: IN_PROGRESS
## Routing and safety

This is the active post-acceptance hardening successor. It preserves the
existing `OPERATIONALLY_ACCEPTED` project verdict through explicit
`PROJECT_VERDICT_EFFECT: PRESERVE` while active. Work is limited to local,
source, synthetic, deterministic replay/campaign/state hardening and bounded
owner-gated DEV read-only observations. No production, NEXT, data/infra,
sibling writes, publication, credential capture, or containment weakening is
authorized.
