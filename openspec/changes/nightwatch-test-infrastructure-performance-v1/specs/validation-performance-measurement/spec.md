## ADDED Requirements

### Requirement: Validation lanes SHALL emit durable timing telemetry

Every test-executing validation lane SHALL record per-file and per-suite
durations in a machine-readable timing document under the lane's own output
directory, and the quality-gate receipt SHALL carry additive per-group
duration fields, without changing the meaning of any existing field. A
read-only offline reporting surface SHALL render those documents plus
persisted gate receipts as a text summary and JSON, ranking the slowest files
and suites and reporting gate-group totals and each group's share of lane
runtime.

#### Scenario: A lane run leaves timing evidence

- **GIVEN** a test-executing lane invoked locally
- **WHEN** the lane completes
- **THEN** a timing document exists under that lane's output directory
- **AND** it names per-file durations and the lane total
- **AND** no network access was required to produce it

#### Scenario: Gate duration evidence is additive

- **GIVEN** a persisted quality-gate receipt before this change
- **WHEN** a consumer reads a receipt produced after this change
- **THEN** every pre-existing field retains its meaning
- **AND** per-group duration fields are present
- **AND** a gate that would have passed still passes

#### Scenario: A missing or unreadable timing document never fabricates a duration

- **GIVEN** a lane whose timing document is missing or malformed
- **WHEN** the timing report is rendered
- **THEN** the lane's duration is reported as unavailable with a reason
- **AND** no zero, estimate, or placeholder duration is presented as measured

### Requirement: Optimization SHALL be preceded by a committed baseline

Before any performance-changing implementation lands, the campaign SHALL
record, for every named lane, the wall time, CPU time where practical,
worker/test counts, and a host-load receipt, plus a ranked list of the
slowest files and suites. The baseline SHALL distinguish inherited
predecessor measurements from freshly measured values.

#### Scenario: An optimization without a baseline is not accepted

- **GIVEN** a proposed change that reduces a lane's work or increases its
  concurrency
- **WHEN** the campaign has no committed baseline for that lane
- **THEN** the change is not merged as a measured improvement
- **AND** it is either preceded by its baseline or reported as unmeasured

#### Scenario: Contended measurements are labelled

- **GIVEN** a benchmark window where competing processes are running
- **WHEN** the measurement is recorded
- **THEN** the host load and competing-process observation is attached to the
  measurement
- **AND** the report does not present a contended value as a clean baseline

### Requirement: Duplicated expensive work SHALL be classified before removal

The campaign SHALL trace what each command actually executes (command, gate
group, script, manifest, discovered files, expensive setup) and SHALL classify
every identified duplication as exactly one of
`REQUIRED_INDEPENDENT_REEXECUTION`, `SAFE_TO_SHARE_WITHIN_ONE_RUN`,
`SAFE_TO_CACHE_BY_CONTENT_DIGEST`, `SAFE_TO_SKIP_IN_FAST_DEV_LANE`, or
`ACCIDENTAL_DUPLICATION` before any duplication is removed or reused.

#### Scenario: Clean-checkout re-execution is not deduplicated away

- **GIVEN** a clean-checkout qualification and a prior local validation of the
  same commit
- **WHEN** duplication classification is performed
- **THEN** the clean re-execution is classified
  `REQUIRED_INDEPENDENT_REEXECUTION`
- **AND** no local state is reused across the clean boundary

#### Scenario: An accidental duplication is removed only with evidence

- **GIVEN** the same expensive setup observed twice inside one lifecycle
- **WHEN** it is classified `ACCIDENTAL_DUPLICATION`
- **THEN** its removal is backed by evidence that neither execution has
  independent semantic value
- **AND** a coverage or gate-group invariant is not weakened to achieve it

### Requirement: Deterministic reuse SHALL be keyed by content identity

Any cache or reuse of expensive work SHALL key on source SHA, configuration
digest, tool version, and schema version, SHALL store only deterministic
immutable inputs or outputs, SHALL never reuse mutable runtime state, and
SHALL never key on a filename alone. A stale or unverifiable cache entry
SHALL be treated as a miss, not as a result.

#### Scenario: A changed input cannot reuse a stale artifact

- **GIVEN** a cached artifact produced from an earlier source SHA or config
  digest
- **WHEN** the input identity differs
- **THEN** the cache reports a miss
- **AND** the lane recomputes the artifact

#### Scenario: Mutable runtime state is never shared

- **GIVEN** a cache identity that is satisfied
- **WHEN** the cached artifact would carry mutable process, port, or
  owner-local state
- **THEN** it is not reused
- **AND** the lane constructs fresh runtime state
