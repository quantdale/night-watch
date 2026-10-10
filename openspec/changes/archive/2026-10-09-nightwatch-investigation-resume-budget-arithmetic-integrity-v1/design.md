## Context

`remainingPolicyFor` exists so a later investigation cannot restart a full HOUR_1 wall clock after earlier spend. That is correct when the runtime starts at zero. Resume restores `checkpoint.state.budget.usage` and then applies a remainder that already subtracted that usage.

## Goals / Non-Goals

**Goals:** exact conservation of campaign ceilings across pause/resume; one accounting of in-flight spend; tests that fail if double subtraction returns.

**Non-Goals:** changing ceiling values, v1 transport-migration carry, or provider-identity binding (NW-AUD-044).

## Decisions

### Fresh vs resume are different derivations

Fresh investigation: `policy' = remaining(campaignPolicy, prefixUsage)`, `usage = 0`.
Resume: `policy' = campaignPolicy` (or the stored investigation policy if it is already that remainder from start), `usage = restoredUsage`. Never both shrink the policy and restore the same usage.

### Pause prefix stays prefix-only

Persisted campaign usage continues to exclude the paused investigation. Resume reapplies paused usage once, as restored runtime usage, not as a second policy subtraction.

### Streak dimensions are not spends

`consecutiveFailures` is a live streak, not a cumulative budget spend. Resume SHALL restore the streak as usage against the original streak ceiling, not subtract it from the ceiling.

### Runtime must reconcile policy and usage

`resumeFromCheckpoint` SHALL refuse when caller policy and restored usage cannot be conserved against the campaign ceiling (`usage[d] <= policy[d]` and `policy[d] + prefix[d] == campaignPolicy[d]` for spend dimensions).

## Risks / Trade-offs

A previously over-restrictive resume may run longer, up to the original ceiling. That is restoration of the declared budget, not an expansion.

## Migration Plan

1. Split remaining-policy helpers for fresh vs resume.
2. Bind resume policy/usage conservation in the runtime constructor.
3. Add arithmetic tests around the existing pause/resume path.
4. Run agent-runtime and local-campaign suites without a real campaign.

## Open Questions

None. Double subtraction is observable from current control flow.
