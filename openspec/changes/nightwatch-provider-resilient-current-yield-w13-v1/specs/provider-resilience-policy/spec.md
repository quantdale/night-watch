## ADDED Requirements

### Requirement: The provider order and failover contract SHALL be declared before any probe

Before any W13 provider probe, Nightwatch SHALL commit a machine-readable
provider-resilience policy binding: the ordered candidate provider/model
list; the allowed CLI(s) and required structured-response schema; the probe
timeout and the runtime timeout; the per-provider retry count; the maximum
consecutive-failure count before a transition; the failure classes that
permit failover and those that do not; the maximum number of provider
transitions for the wave; whether recovery to an earlier, previously
degraded provider is permitted; and the behavior once every candidate is
exhausted. The order SHALL be fixed by criteria decided before probing, not
by comparing probe results.

#### Scenario: The policy is committed before the first probe

- **GIVEN** no W13 investigative or probe call has yet been made
- **WHEN** the provider-resilience policy is authored
- **THEN** it is committed with all bound fields present
- **AND** the commit precedes every subsequent probe or investigative call

#### Scenario: Probe results cannot reorder the frozen candidate list

- **GIVEN** a committed provider-resilience policy
- **WHEN** a later candidate in the frozen order responds faster, cheaper, or
  with an apparently stronger result than an earlier candidate
- **THEN** the frozen order is unchanged
- **AND** the earlier candidate remains first unless it fails a
  failover-eligible way

### Requirement: Failover SHALL trigger only on a frozen failover-eligible failure class

A transition to the next provider in the frozen order SHALL occur only when
the active provider's observed failure belongs to the policy's declared
failover-eligible failure classes and the provider has reached the frozen
maximum consecutive-failure count for that class. A failure class the policy
does not mark eligible SHALL NOT trigger a transition.

#### Scenario: An eligible failure class triggers exactly one step of failover

- **WHEN** the active provider's consecutive failures of a failover-eligible
  class reach the frozen maximum
- **THEN** the active provider is marked degraded for the remainder of the
  wave
- **AND** exactly the next provider in the frozen order is probed

#### Scenario: An ineligible failure class does not trigger failover

- **WHEN** the active provider fails in a way the policy does not mark
  failover-eligible
- **THEN** no transition occurs
- **AND** the failure is recorded against the active provider without
  changing which provider is active

### Requirement: Provider transitions SHALL be deterministic and result-independent

Given a fixed sequence of observed provider failures, the sequence of
provider transitions SHALL be identical on every replay. Nightwatch SHALL
NOT select, reorder, or return to a provider because it produced, or is
expected to produce, a different investigative result than another
provider.

#### Scenario: Replaying a fixed failure sequence reproduces the same transitions

- **GIVEN** a frozen provider-resilience policy and a fixed sequence of
  synthetic provider failures
- **WHEN** the sequence is replayed against the policy more than once
- **THEN** the resulting sequence of provider transitions is identical every
  time

#### Scenario: A provider is never chosen because another provider found something

- **GIVEN** two providers have both been probed during a wave
- **WHEN** one of them has produced a candidate and the other has not
- **THEN** the choice of active provider for subsequent turns is unaffected
  by which one produced a candidate

### Requirement: Recovery to an earlier provider requires explicit policy permission

A provider marked degraded during a wave SHALL NOT become active again
unless the frozen policy explicitly declares recovery permitted for that
transition. When the policy does not declare recovery permitted, a degraded
provider SHALL remain excluded for the remainder of the wave even if it
would later respond successfully to an out-of-band probe.

#### Scenario: Recovery is forbidden by default

- **GIVEN** a policy that does not declare recovery permitted
- **WHEN** a degraded provider would otherwise be reachable again
- **THEN** it is not reactivated
- **AND** investigation continues with the next eligible provider in the
  frozen order

#### Scenario: Recovery is explicit when permitted

- **GIVEN** a policy that explicitly permits recovery for a named provider
- **WHEN** that provider's declared recovery condition is met
- **THEN** the reactivation is recorded as a transition
- **AND** the reason cites the explicit policy clause that permits it

### Requirement: Every investigation receipt SHALL carry per-provider attribution

Every W13 run receipt SHALL report, per provider that was probed during that
run: call count, valid-response count, failures by class, retries, response
bytes, wall time, and the transitions into and out of that provider.
Aggregate metrics SHALL NOT merge distinct providers into a single
attribution-free figure.

#### Scenario: A multi-provider run reports separate provider figures

- **GIVEN** a run in which failover occurred between two providers
- **WHEN** the run receipt is produced
- **THEN** it reports calls, failures, bytes, and wall time separately for
  each provider that was probed
- **AND** it records the transition between them

### Requirement: The policy fingerprint SHALL change with any bound dimension

A canonical fingerprint SHALL be computed over every field the policy binds:
provider order, provider identity, probe/runtime timeouts, retry counts,
failover-eligible failure classes, maximum consecutive failures, maximum
transitions, and recovery permission. Changing any one of these fields
SHALL change the fingerprint.

#### Scenario: A mutation to any bound field changes the fingerprint

- **GIVEN** a committed provider-resilience policy and its fingerprint
- **WHEN** any one bound field is changed and the fingerprint is recomputed
- **THEN** the recomputed fingerprint differs from the committed one

#### Scenario: A mutated policy fails a resume closed

- **GIVEN** a wave that was interrupted after freezing its policy
- **WHEN** a resume is attempted with a policy whose fingerprint no longer
  matches the committed one
- **THEN** the resume fails closed before any further provider call
- **AND** the mismatch is reported by field, not merely as "changed"

### Requirement: Exhaustion of the entire policy is a distinct terminal state

A run is `PROVIDER_BLOCKED` only when every candidate in the frozen order has
failed in a way, and to an extent, that leaves no eligible provider before
sufficient investigation occurred. Exhaustion of the whole policy SHALL NOT
be reported as, or merged into, a zero-yield result.

#### Scenario: One remaining eligible provider keeps the run out of policy exhaustion

- **GIVEN** a frozen order of three providers
- **WHEN** the first two are marked degraded but the third has not yet been
  probed
- **THEN** the run is not `PROVIDER_BLOCKED`
- **AND** the third provider is probed before any exhaustion classification

#### Scenario: Exhaustion after zero valid responses is provider-blocked, not zero yield

- **GIVEN** every candidate in the frozen order has failed before any valid
  structured response
- **WHEN** the run terminates
- **THEN** it is classified `PROVIDER_BLOCKED`
- **AND** it does not contribute to a zero-yield denominator
