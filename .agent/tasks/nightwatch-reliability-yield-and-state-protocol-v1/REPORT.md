# Final Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: a5ff79f921bbc8e5477df7d66f10d9504f3eb3da
Last substantive checkpoint SHA: a5ff79f921bbc8e5477df7d66f10d9504f3eb3da

This report is a live handoff. The campaign has completed its authoritative
local baseline and M1 replay hardening. The first M2 planner/yield slice is
also validated: planner v2 exposes bounded proof-aware selection signals,
metadata-sensitive plan identity, diversity/redundancy selection, stable
protocol clustering, and order-independent yield attribution. The campaign
has not yet completed current-inventory backtesting, state-protocol,
repeated-operation, or release validation.

Current project verdict: `OPERATIONALLY_ACCEPTED`.

Exact evidence and the next action are maintained in `STATE.md`. M1 closed
two Nightwatch-owned defects: premature settlement could omit a delayed
oracle response, and response-time intent could alter replay attribution.
The final report will be completed only after the yield, state,
persisted-execution, DEV, reproducibility, CI, and closure milestones settle.
