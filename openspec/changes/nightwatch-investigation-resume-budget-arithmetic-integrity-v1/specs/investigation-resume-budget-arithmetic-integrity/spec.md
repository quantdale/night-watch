## ADDED Requirements

### Requirement: In-flight spend is counted once

Paused investigation usage SHALL reduce remaining campaign budget exactly once on resume.

#### Scenario: Paused investigation used N reasoner calls
- **WHEN** a campaign with ceiling C pauses after N calls in the in-flight investigation and prefix usage is P
- **THEN** resume remaining headroom is C - P - N, not C - P - 2N

### Requirement: Fresh remainder is not used as resume policy

`remainingPolicyFor` MAY derive a zero-usage investigation policy. Resume SHALL NOT pass that remainder as `budgetPolicy` while also restoring checkpoint usage.

#### Scenario: Resume restores usage under a remainder policy
- **WHEN** constructor policy is `remaining(campaign, prefix+usage)` and restored usage is the same in-flight snapshot
- **THEN** resume is invalid

### Requirement: Spend and streak dimensions stay distinct

Cumulative spend dimensions SHALL subtract from ceilings. `consecutiveFailures` SHALL restore as a live streak against the original streak ceiling.

#### Scenario: Two consecutive failures then pause
- **WHEN** the streak ceiling is 3 and restored usage.consecutiveFailures is 2
- **THEN** one further consecutive failure exhausts the streak, and the ceiling is not reduced to 1 before restore

### Requirement: Policy and usage conserve against the campaign ceiling

Resume SHALL refuse when restored usage exceeds the admitted policy or when policy plus prefix usage does not equal the campaign ceiling for spend dimensions.

#### Scenario: Caller widens remainder
- **WHEN** resume supplies a policy larger than campaignPolicy - prefixUsage
- **THEN** resume refuses before a reasoner call

### Requirement: Arithmetic has adversarial proof

Tests SHALL cover reasoner calls, input/output/tool bytes, tool actions, wall time, retries, provider failures, and streak restore on the pause/resume path.

#### Scenario: Double subtraction is restored
- **WHEN** mutation reapplies paused usage to both remainder policy and restored usage
- **THEN** the focused budget-arithmetic suite fails
