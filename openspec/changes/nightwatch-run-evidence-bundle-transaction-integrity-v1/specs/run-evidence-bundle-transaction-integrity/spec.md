## ADDED Requirements

### Requirement: Every run owns one exclusive immutable bundle generation

The system SHALL create a collision-resistant generation through exclusive no-follow primitives beneath an owner-only verified root. It SHALL bind exactly one writer and SHALL refuse pre-existing, aliased, symlinked, irregular, incorrectly owned, or unsafe-mode paths before runtime authority is exposed.

#### Scenario: Logical run ID is reused
- **WHEN** a caller supplies a label already associated with an existing bundle
- **THEN** the existing bytes remain unchanged and the new run receives a distinct generation or fails before execution

#### Scenario: Concurrent writers claim one generation
- **WHEN** two processes race the same generation identity
- **THEN** at most one obtains writer authority and no records are mixed

### Requirement: One durable journal is evidence authority

The system SHALL append bounded, versioned, integrity-linked records for manifest identity/amendments, events, proxy facts, repository facts, publication failures, and terminal intent. An append SHALL be acknowledged only after the required durability barrier. Derived files SHALL NOT outrank the validated journal.

#### Scenario: Event mirror publication fails
- **WHEN** the canonical event append succeeds but a network/console view update fails
- **THEN** the event remains recoverable from the journal and the bundle cannot finalize clean until the view is rebuilt and verified

#### Scenario: Manifest is corrupt
- **WHEN** a manifest materialization cannot be parsed or matched to the immutable header
- **THEN** it is not replaced with an empty object; the bundle is non-clean and recovery uses the canonical journal

### Requirement: Completion and recovery are crash-consistent

The system SHALL derive summary and materialized views from a validated durable journal prefix, commit exactly one terminal state after their verification and directory durability, and classify any non-terminal or ambiguous generation as `INCOMPLETE` rather than PASS.

#### Scenario: Process exits during finalization
- **WHEN** interruption occurs at any append, materialization, rename, file-flush, or directory-flush boundary
- **THEN** readers observe either the preceding complete generation or an explicit incomplete generation, never a mixed clean result

#### Scenario: In-memory events diverge
- **WHEN** process memory omits or reorders a record already in the journal
- **THEN** finalization derives from the journal and rejects the inconsistent in-memory view

### Requirement: Evidence failures cannot be swallowed into success

Every observer and publisher SHALL propagate persistence failure to a bounded coordinator failure latch independent of the failing writer. Once evidence completeness is uncertain, runtime authority SHALL stop as required and terminal PASS SHALL be impossible. Diagnostics SHALL contain only categorical codes and safe counts.

#### Scenario: Console observer recorder call throws
- **WHEN** an observer catches a recorder exception to protect the browser callback
- **THEN** it records the categorical failure through the independent latch and the run terminates non-clean

#### Scenario: Download evidence fails before cancellation
- **WHEN** evidence publication fails during a download callback
- **THEN** mandatory cancellation still runs and the run is non-clean

### Requirement: Bundle publication is bounded, private, and path-safe

The system SHALL enforce owner-only directory/file modes, exact regular-file identity, no-follow ancestors/leaves, record/count/byte limits, exclusive staging, atomic materialization replacement, required file/directory durability, and cleanup limited to owned staging identities.

#### Scenario: Bound would be exceeded
- **WHEN** the next record or materialization exceeds its declared bound
- **THEN** it is refused before partial publication and the bundle becomes explicitly incomplete/non-clean

### Requirement: Validation proves the full failure matrix

Tests SHALL cover identifier collision, concurrent processes, unsafe paths, every write/flush/rename boundary, truncated/corrupt/conflicting records, mirror failures, observer swallowing, recovery, bounds, historical compatibility, and mutations removing each control.

#### Scenario: Current success claim is mutated to use summary alone
- **WHEN** a mutation accepts `summary.json` without a valid terminal journal state
- **THEN** focused validation fails
