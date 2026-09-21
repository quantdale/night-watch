## Why

A fresh investigation receives `remainingPolicyFor(campaignPolicy, prefixUsage)` and starts usage at zero, so remaining ceilings are exact. A paused investigation is different: its checkpoint already stores absolute usage, and `AgentRuntime.resumeFromCheckpoint` restores that usage. Resume still subtracts the same in-flight usage from the campaign policy before handing the remainder to the runtime.

The paused-investigation comment says pre-pause consumption is left out of persisted campaign usage and re-applied to the remaining-budget basis. Combined with restored usage, every in-flight dimension is counted twice. Headroom shrinks by the paused spend, so a legal resume can hit `BUDGET_EXHAUSTED` before the original campaign ceiling is actually consumed. Consecutive-failure and wall-clock remainders are mixed into the same subtraction even though they are not all cumulative spends.

## What Changes

- Distinguish remaining-policy derivation for a zero-usage fresh investigation from resume under a restored usage snapshot.
- On resume, the runtime policy SHALL be the campaign ceiling (or an identity-equal stored policy) and remaining SHALL be computed as `policy - restoredUsage`, never `remainingPolicy(policy, prefix+restored) - restoredUsage`.
- Keep prefix-only campaign usage on pause; do not also fold paused spend into the remainder twice.
- Add pause/resume arithmetic regressions for reasoner calls, bytes, tool actions, wall time, and streak dimensions.

## Capabilities

### New Capabilities

- `investigation-resume-budget-arithmetic-integrity`: Defines exact remaining-budget arithmetic across pause and resume.

### Modified Capabilities

None.

## Impact

- Affects `remainingPolicyFor`, `runOneInvestigation` resume, and `AgentRuntime` policy/usage restore.
- Does not raise campaign ceilings, contact DEV, or alter synthetic fixture budgets.
