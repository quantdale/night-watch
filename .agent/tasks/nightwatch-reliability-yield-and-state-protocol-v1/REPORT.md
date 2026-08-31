# Final Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: 82e661bae45424573c3ea06a20900e342047b849
Last substantive checkpoint SHA: 82e661bae45424573c3ea06a20900e342047b849

This report is a live handoff. The campaign has completed its authoritative
local baseline, replay hardening, current-inventory selection backtest,
explicit state protocol, persisted interruption boundary, cache audit, and
canonical-digest property audit. Implementation checkpoint 82e661b is
validated by focused replay, state, planner, campaign, cache, property, and
hardening checks. The campaign remains active only for bounded DEV
requalification, clean/isolated parity, CI observation, and final closure.

Current project verdict: `OPERATIONALLY_ACCEPTED`.

Exact evidence and the next action are maintained in `STATE.md`. M1 closed
two Nightwatch-owned defects: premature settlement could omit a delayed
oracle response, and response-time intent could alter replay attribution.
The campaign closed two earlier replay defects and two current defects: raw
replay serialization made object-key order identity-bearing, and accepted-
project authorization/status parsing relied on brittle task-name/free-text
conventions. The fixes are fail closed and regression-covered; this report
will be completed after bounded real operation and release evidence.
