# Final Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: bf35bf31414bcac91e8a297ee9c9c4f6b1647871
Last substantive checkpoint SHA: bf35bf31414bcac91e8a297ee9c9c4f6b1647871

This report is a live handoff. The campaign has completed its authoritative
local baseline and M1 replay hardening. It has not yet completed campaign
selection, state-protocol, repeated-operation, or release validation.

Current project verdict: `OPERATIONALLY_ACCEPTED`.

Exact evidence and the next action are maintained in `STATE.md`. M1 closed
two Nightwatch-owned defects: premature settlement could omit a delayed
oracle response, and response-time intent could alter replay attribution.
The final report will be completed only after the yield, state,
persisted-execution, DEV, reproducibility, CI, and closure milestones settle.
