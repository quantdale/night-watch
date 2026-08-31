# Active Task

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Title: Nightwatch Reliability, Yield, and State Protocol Campaign
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-reliability-yield-and-state-protocol-v1
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: bf35bf31414bcac91e8a297ee9c9c4f6b1647871
Last checkpoint: replay settlement and attribution fix validated and pushed at `bf35bf3`
Current milestone: M2 — Campaign yield and finding stability — IN_PROGRESS
Next action: Audit current campaign scoring, selection inputs, diversity behavior, and cluster identity; build a deterministic selection backtest
Authorization class: NIGHTWATCH_RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
LAST_VALIDATED_IMPLEMENTATION_SHA: bf35bf31414bcac91e8a297ee9c9c4f6b1647871
LAST_SUBSTANTIVE_CHECKPOINT_SHA: bf35bf31414bcac91e8a297ee9c9c4f6b1647871
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
