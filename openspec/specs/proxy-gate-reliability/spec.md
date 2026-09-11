# proxy-gate-reliability Specification

## Purpose
TBD - created by archiving change nightwatch-proxy-gate-reliability-r11-v1. Update Purpose after archive.
## Requirements
### Requirement: Preferred proxy ports are a preference, not a guarantee

Proxy port allocation SHALL return an owned lease for a currently admissible
candidate within a bounded search space, and SHALL NOT be required to return
the preferred port.

#### Scenario: Preferred endpoint is free

- **WHEN** the preferred candidate's lease state is absent or reclaimable and
  its TCP endpoint is available
- **THEN** allocation SHALL return the preferred port
- **AND** the lease SHALL report `preferredOutcome: PREFERRED_REUSED`

#### Scenario: Preferred endpoint is occupied by an unrelated listener

- **WHEN** the preferred candidate's TCP endpoint is occupied
- **THEN** allocation SHALL NOT return that port
- **AND** SHALL advance within the bounded candidate space
- **AND** the lease SHALL report `preferredOutcome: PREFERRED_UNAVAILABLE_ADVANCED`
- **AND** SHALL leave no lease file behind for the rejected candidate

#### Scenario: Bounded space exhausted

- **WHEN** every candidate in the bounded space is inadmissible
- **THEN** allocation SHALL fail closed with `PROXY_PORT_LEASE_EXHAUSTED`

### Requirement: Candidate selection is pure and deterministic

Candidate selection SHALL be a pure function of the preferred port alone.

#### Scenario: No ambient input

- **WHEN** candidates are computed for a preferred port
- **THEN** the result SHALL NOT depend on process id, clock, randomness, the
  filesystem or the network

#### Scenario: Wraparound stays in range

- **WHEN** the preferred port is close to 65535
- **THEN** every candidate SHALL remain within `[1024, 65535]`

### Requirement: The production allocation path uses the real OS availability probe

The production allocation entry point SHALL bind a real operating-system TCP
availability probe and SHALL NOT accept a substitutable availability predicate.

#### Scenario: Test seam is unreachable from production code

- **WHEN** any file outside `tests/**` other than the defining module
  references the availability seam
- **THEN** `hardening:check` SHALL fail

#### Scenario: Real probe removed

- **WHEN** the real TCP bind probe is replaced by a stub
- **THEN** `hardening:check` SHALL fail

### Requirement: Allocator safety properties are preserved

Allocation SHALL retain exclusive lease creation, process and token ownership,
fail-closed handling of malformed and symlinked lease state, system-temp
coordination across clones and worktrees, a bounded candidate count, and SHALL
NOT delete a lease owned by a live process.

#### Scenario: Live lease is not reclaimed

- **WHEN** a candidate's lease record names a live process
- **THEN** the lease file SHALL be left byte-identical and allocation SHALL advance

#### Scenario: Suspicious state is not deleted

- **WHEN** a candidate's lease state is malformed or a symlink
- **THEN** it SHALL NOT be deleted or written through, and allocation SHALL advance

### Requirement: Quality-gate receipts are durable

The authoritative quality gate SHALL persist its canonical receipt bytes to a
confined safe path in addition to standard output.

#### Scenario: Digest identity

- **WHEN** a gate run completes
- **THEN** the persisted receipt SHALL be byte-identical to the stdout receipt
- **AND** their `receiptDigest` values SHALL be equal

#### Scenario: Failure receipts persist

- **WHEN** a required group fails, times out, is interrupted, or the
  environment is rejected
- **THEN** a receipt SHALL still be persisted, retaining group statuses,
  counts, `didNotRun` and `failedLocations`

#### Scenario: Unsafe receipt path

- **WHEN** the requested receipt path is relative, contains `..`, lies inside
  the repository, lies outside the permitted temporary roots, has an invalid
  parent, or names an existing non-regular file or symlink
- **THEN** the gate SHALL fail closed before running any group

#### Scenario: Stdout noise cannot alter the persisted receipt

- **WHEN** a child prints arbitrary text, including a forged line containing
  the receipt schema token
- **THEN** the persisted receipt SHALL be unaffected

### Requirement: The clean-checkout gate consumes the structured receipt

The clean-checkout wrapper SHALL recover the inner gate's receipt from the
persisted structured file rather than by scraping standard output.

#### Scenario: Missing or malformed inner receipt

- **WHEN** the persisted inner receipt is absent or unparseable
- **THEN** the wrapper SHALL fail closed

#### Scenario: Disagreement between file and stdout

- **WHEN** the file and stdout receipt digests disagree
- **THEN** the wrapper SHALL fail closed

#### Scenario: Stale receipt

- **WHEN** the persisted receipt names a different `gitHead` than the run
  requested
- **THEN** the wrapper SHALL fail closed

