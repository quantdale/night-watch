## MODIFIED Requirements

### Requirement: Provider selection SHALL follow the frozen provider-resilience policy

W13 SHALL select and, when a failover-eligible failure occurs, transition
between providers strictly according to the committed provider-resilience
policy (the `provider-resilience-policy` capability) rather than freezing a
single provider for the entire wave. The active provider at any point in the
wave SHALL be exactly the one the policy's deterministic rules select; W13
SHALL NOT choose, retain, or return to a provider based on the quality or
presence of its investigative results.

#### Scenario: The active provider is exactly the one the policy selects

- **WHEN** a W13 run is executing
- **THEN** the active provider is exactly the provider the frozen
  provider-resilience policy's deterministic rules currently select
- **AND** no other candidate is probed out of order

#### Scenario: The first candidate satisfies the policy without further probing

- **WHEN** the first candidate in the frozen order returns a valid
  structured response and remains healthy under the policy's failure
  thresholds
- **THEN** no other candidate is probed for that run

#### Scenario: A failover-eligible failure moves to the next candidate mid-run

- **WHEN** the active provider fails in a way the frozen policy marks
  failover-eligible, to the policy's declared threshold
- **THEN** the next candidate in the frozen order becomes active for the
  remainder of the run
- **AND** the transition and both providers' attribution are recorded in
  the run receipt

### Requirement: Provider failures SHALL be classified by a complete taxonomy, and run validity SHALL follow policy exhaustion

W13 SHALL classify every provider outcome as exactly one of:
`PROVIDER_ABSENT`, `PROVIDER_PROBE_TIMEOUT`, `PROVIDER_RUNTIME_TIMEOUT`,
`PROVIDER_NONZERO_EXIT`, `PROVIDER_INVALID_STRUCTURED_RESPONSE`,
`PROVIDER_NAMESPACE_OR_QUOTA_UNAVAILABLE`, `PROVIDER_AUTH_FAILURE`,
`LOCAL_CLI_FAILURE`, `VALID_PROVIDER_RESPONSE`, or, when the exact external
cause cannot be determined, `UNKNOWN_EXTERNAL_PROVIDER_FAILURE`. Failed
calls SHALL remain preserved per-provider and SHALL NOT be converted to
zero actions, zero candidates, or zero yield. A run stays VALID under
policy-governed failover as long as the frozen provider-resilience policy
has not been exhausted and at least one provider returns positive response
bytes with positive source activity; a run is `PROVIDER_BLOCKED` only once
the entire frozen policy is exhausted before sufficient investigation.

#### Scenario: A failure is classified into exactly one taxonomy member

- **WHEN** a provider call does not return a valid structured response
- **THEN** the failure is classified as exactly one of the nine defined
  failure classes or, when the exact cause cannot be determined,
  `UNKNOWN_EXTERNAL_PROVIDER_FAILURE`
- **AND** it is never left unclassified

#### Scenario: Failover keeps a run valid past a single provider's failure

- **WHEN** the active provider fails in a failover-eligible way and the
  frozen policy still has an eligible remaining candidate
- **THEN** the run remains valid and continues investigation on the next
  candidate
- **AND** it is not classified `PROVIDER_BLOCKED` on that basis alone

#### Scenario: Policy exhaustion, not a single provider's failure, is what blocks a run

- **WHEN** every candidate in the frozen provider-resilience policy has
  failed before sufficient investigation
- **THEN** the run is `PROVIDER_BLOCKED` with sanitized per-provider failure
  evidence
- **AND** it contributes no false progress and no zero-yield denominator

### Requirement: Metrics SHALL be mechanically derived with explicit denominators, per-provider breakdowns, and a proven candidate/admission invariant

The aggregate SHALL derive planned, attempted, valid, provider-blocked runs,
investigations, calls, failures by taxonomy class, retries, provider
transitions, tool actions, unique repositories, paths and targets,
hypotheses, reproduction outcomes, candidates, refusals, admissions, novelty
classes, leakage, provider/tool-payload bytes, wall time, and termination
reasons from preserved machine evidence. It SHALL state every rate
denominator, use `NOT_CAPTURED` only when capture is genuinely impossible
and the reason is part of the schema, and SHALL treat a `TRUNCATED` source
population's count as a floor, never as a complete denominator. A record
with `admitted: true` and no qualifying reproduction receipt SHALL be
rejected by the aggregation's own validation, not merely omitted by
convention.

#### Scenario: Candidate/admission aggregation is checked

- **WHEN** a candidate has no dossier or proof identity
- **THEN** it appears only in `candidatesProposed` and the appropriate
  refusal distribution
- **AND** `mechanicalAdmissions` remains unchanged

#### Scenario: An inconsistent admission fixture is mechanically rejected

- **WHEN** a fixture record declares `admitted: true` with no reproduction
  receipt, evidence reference, or dossier identity
- **THEN** aggregation fails closed on that record rather than counting it
  as an admission
- **AND** the rejection is proven by a dedicated negative-probe test, not
  only by the absence of such a record in real evidence

#### Scenario: Valid zero yield is measured

- **WHEN** the fixed matrix completes with valid runs and no qualifying
  admissions
- **THEN** W13 reports zero admissions with the valid-run denominator
- **AND** it does not claim that the repositories contain no defects

#### Scenario: A truncated population never inflates a denominator

- **WHEN** a repository's source population carries a `TRUNCATED`
  completeness state
- **THEN** any metric denominator derived from that population is reported
  as a floor
- **AND** no report presents it as if it were an exhaustive count

### Requirement: W13 SHALL produce a truthful closure report

The final report SHALL contain baseline, provider-resilience policy
freeze/fingerprint, evaluation freeze/fingerprint, coverage, per-run,
per-repository, and per-provider yield metrics with denominators, findings
and refusals, zero-yield interpretation, Nightwatch defects/repairs,
provider health and transition history, safety, validation, C-00
integration/release, Group 12 reconciliation, and exactly one wave verdict.
Exhaustion of the entire frozen provider-resilience policy before sufficient
execution SHALL be `PARTIAL — BLOCKED`; a completed valid matrix with zero
admissions SHALL be a complete zero-admission verdict. A single provider's
failure that the policy successfully failed over from SHALL NOT, by itself,
produce a `PARTIAL — BLOCKED` verdict.

#### Scenario: Matrix completes with zero admissions

- **WHEN** all frozen runs are validly attempted (with or without mid-run
  failover) and no candidate is admitted
- **THEN** the report states `COMPLETE — CURRENT-SOURCE YIELD MEASURED,
  ZERO MECHANICAL ADMISSIONS`
- **AND** it preserves all limits and does not imply absence of defects

#### Scenario: Full policy exhaustion blocks the matrix

- **WHEN** the entire frozen provider-resilience policy is exhausted before
  sufficient valid execution
- **THEN** the report states `PARTIAL — BLOCKED`
- **AND** it preserves every invalid run, names the exact unblock
  condition, and reports the full per-provider transition history that led
  to exhaustion

#### Scenario: A successful failover does not itself block the wave

- **WHEN** a run fails over between providers per the frozen policy and
  reaches a valid response and source investigation
- **THEN** that run is not, by itself, evidence for a `PARTIAL — BLOCKED`
  verdict
- **AND** its per-provider attribution is reported in the final report
