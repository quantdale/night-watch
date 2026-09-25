## ADDED Requirements

### Requirement: Admissions are durable, identity-bound records
Every mechanically admitted candidate SHALL be written atomically as an
owner-local agent finding record before any campaign checkpoint is deleted.
The record SHALL carry a content-addressed dossier ID, the campaign ID, the
candidate ID, per-source repository HEAD and tree digest, the current-failure
fingerprint, the failing test identity, the reproduction receipt IDs, and the
reasoner identity.

#### Scenario: NO_PROGRESS termination after an admission
- **WHEN** a campaign admits a candidate and then terminates NO_PROGRESS
- **THEN** the agent finding record exists in the owner-local store and is
  listed by `campaign findings`

#### Scenario: Write failure
- **WHEN** the admission record cannot be written
- **THEN** the campaign reports the admission as not persisted, exits
  non-zero, and does not delete its checkpoint

### Requirement: Terminated resume never recomputes admissions
Resuming a TERMINATED campaign SHALL return the persisted admission records
verbatim. When none exist, it SHALL report `UNAVAILABLE_NOT_PERSISTED`, and it
SHALL NOT re-derive admissions from absent history.

#### Scenario: Idempotent resume
- **WHEN** a campaign with a VERIFIED_REPRODUCTION admission is resumed after
  termination
- **THEN** the result reports the same admission, not a refusal

### Requirement: Resume is bound to the recorded reasoner identity and budget
Reasoner identity SHALL consist of the digests of the reasoner executable,
adapter, print CLI and print arguments, plus the provider and model labels.
Resume SHALL refuse with `REASONER_IDENTITY_MISMATCH`, before any turn, when
the identity differs. The resumed budget SHALL count in-flight usage exactly
once, and resume SHALL use the persisted per-investigation turn limit.

#### Scenario: Model changed between run and resume
- **WHEN** NIGHTWATCH_REASONER_MODEL differs from the checkpoint identity
- **THEN** resume refuses before running any investigation

#### Scenario: Paused investigation resumed
- **WHEN** an investigation paused with usage U is resumed
- **THEN** its remaining budget is computed from the prefix without U counted
  twice, and no false BUDGET_EXHAUSTED occurs

### Requirement: Provider failure is never zero yield or budget exhaustion
Every failed reasoner call SHALL record its provider-failure class. The
campaign SHALL derive a termination class of VALID_PROVIDER_RUN,
PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION or PROVIDER_DEGRADED. It SHALL NOT report
a provider-blocked campaign as BUDGET_EXHAUSTED or as zero yield. Failure
ceilings SHALL scale by duration tier. Transient failures SHALL use bounded
backoff with jitter.

#### Scenario: Dead provider on an overnight campaign
- **WHEN** every reasoner call fails with a provider error before any source
  action
- **THEN** the result's termination class is
  PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION and no yield denominator counts it

#### Scenario: Unreachable failover order
- **WHEN** a provider-resilience policy lists candidates the engine ceilings
  can never reach
- **THEN** the validator refuses it with `PROVIDER_POLICY_UNREACHABLE_CANDIDATES`

### Requirement: Campaigns are bounded, interruptible and leak-free
The product dispatcher SHALL forward long-running agent commands with
inherited stdio, no fixed timeout, signal pass-through and the declared
consumer environment. SIGINT and SIGTERM SHALL pause the campaign, write a
PAUSED checkpoint, and terminate the reasoner process group. A progress
checkpoint SHALL be written after each absorbed investigation. The print
adapter SHALL remove its prompt file and working directory on every exit path.

#### Scenario: Ctrl-C during a campaign
- **WHEN** the operator interrupts a running campaign
- **THEN** a PAUSED checkpoint exists, no reasoner process survives, and
  resume continues from it

#### Scenario: Failing print CLI
- **WHEN** the configured print CLI exits non-zero
- **THEN** TMPDIR contains no prompt file or adapter directory afterwards

### Requirement: Reproduction inputs match their provenance label
Reproduction SHALL materialize source from the Git object store at the
recorded HEAD, not from the working tree. A failure matching a known
environment signature SHALL be classified ENVIRONMENT_DEPENDENT and SHALL NOT
be admitted.

#### Scenario: Dirty sibling working tree
- **WHEN** the sibling repository has uncommitted changes in the reproduced
  module
- **THEN** the reproduced bytes equal the HEAD bytes and the admission's HEAD
  label is true

#### Scenario: Network-dependent test failure
- **WHEN** a reproduced test fails with `dial tcp` under the unshared network
- **THEN** the candidate is refused with ENVIRONMENT_DEPENDENT

### Requirement: Findings output reports measured state
`campaign findings` and `nightwatch findings` SHALL report per-campaign rows
with candidate ID, admission state and refusal reason, read from persisted
records. They SHALL NOT present proposals as findings, and they SHALL NOT emit
a constant count. `nightwatch-agent status` SHALL report measured state.

#### Scenario: Non-empty store
- **WHEN** the owner-local store holds an admitted record
- **THEN** `findings` never reports zero actionable findings

### Requirement: Every campaign run emits a product run receipt
`campaign run` SHALL emit a run receipt containing provider health,
per-call attribution counts, sibling identity before and after (HEAD plus
porcelain and diff digests) for every approved repository, the leak-scan
result, and the persisted admission record IDs.

#### Scenario: Sibling working tree modified during a run
- **WHEN** any approved sibling's porcelain or diff digest changes between
  start and end
- **THEN** the receipt reports `SIBLING_IDENTITY_CHANGED` and the run is not
  certified as source-unchanged
