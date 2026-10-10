## ADDED Requirements

### Requirement: Owner policy is first at every real execution seam

Every Phase 6 path that can invoke a non-synthetic callback SHALL consult the permanent owner policy before plan compilation, scope use, authentication, tool construction, or callback invocation.

#### Scenario: Caller injects a permissive invoker
- **WHEN** a real adapter is constructed with an arbitrary callback
- **THEN** owner policy refuses before the callback is entered

#### Scenario: All legacy gate facts are favorable
- **WHEN** environment, auth, scope, privacy, and budget checks pass
- **THEN** the permanent owner freeze still returns `OWNER_POLICY_BLOCKED`

### Requirement: Validated plans are runtime capabilities

Only the exact immutable object minted by current plan validation SHALL be executable. A public marker or structural copy SHALL NOT confer authority.

#### Scenario: Marker is forged
- **WHEN** a caller supplies `{ __validatedReadPlan: true, plan: ... }`
- **THEN** execution refuses before compilation or callback invocation

### Requirement: Synthetic execution is explicitly isolated

Synthetic fixtures SHALL use a distinct runtime capability and synthetic-only target/provenance contract that cannot enter real adapters or satisfy real gate evidence.

#### Scenario: Synthetic plan is relabeled real
- **WHEN** a caller pairs synthetic authority with a real datastore adapter
- **THEN** the adapter refuses categorically

### Requirement: Query permits are ledger-bound and one-shot

Each permit SHALL bind its exact ledger, plan, scope, oracle, phase, and lifecycle. Completion SHALL be accepted exactly once and SHALL reject foreign, copied, fabricated, or already-completed permits without changing counters.

#### Scenario: Same permit completes twice
- **WHEN** completion is invoked a second time
- **THEN** it refuses and row/byte counters remain unchanged

### Requirement: Quarantine has negative proof

Tests and hardening SHALL cover arbitrary invokers, forged/copy plans, synthetic relabeling, gate-order changes, foreign/replayed permits, and mutations removing owner-policy calls.

#### Scenario: Adapter owner check is removed
- **WHEN** a mutation deletes the effect-seam policy call
- **THEN** the focused owner-scope suite detects callback entry and fails
