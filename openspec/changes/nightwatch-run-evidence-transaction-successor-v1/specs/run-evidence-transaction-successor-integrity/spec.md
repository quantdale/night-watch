## ADDED Requirements

### Requirement: Run identity is exclusive

A recorder SHALL reserve its run directory with exclusive creation and SHALL
refuse an existing identity before any second recorder can write into it.

#### Scenario: Two recorders claim one run
- **WHEN** a second recorder receives an already-reserved run identity
- **THEN** it fails with a categorical identity error and existing bytes remain
  unchanged

### Requirement: Durable append failures cannot become clean events

Primary, view, and in-memory event publication SHALL be treated as one
latched operation. Append acknowledgement SHALL include an fsync barrier, and
any failure SHALL prevent later terminal PASS.

#### Scenario: View append fails after primary append
- **WHEN** the primary event is durable but its view append fails
- **THEN** the recorder latches non-clean state and finalize refuses

### Requirement: Terminal summaries derive from validated durable state

Before proxy synchronization or summary publication, the recorder SHALL parse
bounded complete JSONL records, reject duplicate/malformed/torn/mismatched
sequences, compare durable count/order with memory, and derive summary truth
from the validated durable stream.

#### Scenario: External durable mutation occurs
- **WHEN** a test or competing writer changes the durable event stream
- **THEN** finalization refuses rather than publishing a passing summary

### Requirement: Recovery limitations remain explicit

The successor SHALL not claim arbitrary SIGKILL journal recovery when only
exclusive identity, durable acknowledgement, and fail-closed validation are
implemented; residual recovery work remains separately scoped.

#### Scenario: Process is killed during append
- **WHEN** a later reader encounters a torn or incomplete durable record
- **THEN** the result is explicitly non-clean and never PASS
