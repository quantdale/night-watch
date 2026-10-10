## ADDED Requirements

### Requirement: Retention prepares an exact durable operation before mutation
The retention apply command SHALL create, durably commit, and verify one
versioned prepared operation record before any deletion callback is reachable.
The record SHALL bind an unpredictable operation identity, exact source SHA,
reviewed plan digest, refusal-set digest, confirmation-token digest, ordered
candidate-relative identities and byte sizes, and creation time. Unknown,
duplicate, missing, malformed, oversized, non-canonical, or inconsistent data
MUST fail closed before mutation.

#### Scenario: Prepared record authorizes the first mutation boundary
- **WHEN** an eligible plan and exact owner confirmation are supplied and the journal is healthy
- **THEN** apply durably commits and re-verifies the complete prepared record before invoking the first removal callback

#### Scenario: Preparation cannot be made durable
- **WHEN** record creation, serialization, flush, directory flush, close, reopen, or verification fails
- **THEN** apply returns `BLOCKED`, exits non-zero, and invokes no removal callback

#### Scenario: Plan or confirmation differs from the prepared authority
- **WHEN** the current plan, refusal set, confirmation token, source SHA, candidate order, identity, or size differs from the prepared record
- **THEN** apply refuses before mutation with a fixed safe mismatch reason

### Requirement: Only one retention mutation operation may be active
Retention apply SHALL acquire an exclusive, symlink-safe operation lease and
SHALL reject every concurrent, incomplete, uncertain, corrupt, or unsupported
journal state before mutation. PID liveness or elapsed time alone MUST NOT
authorize takeover, journal deletion, or another apply.

#### Scenario: Two applies race for authority
- **WHEN** two processes attempt retention apply against the same journal root
- **THEN** at most one process commits a prepared operation and every loser exits non-zero without invoking removal

#### Scenario: Previous operation lacks a valid terminal record
- **WHEN** journal discovery finds a prepared operation without one valid terminal record
- **THEN** a new apply returns `RETENTION_RECONCILIATION_REQUIRED` before planning or deletion

#### Scenario: Journal or lease path is unsafe
- **WHEN** the journal root, operation directory, lease, or any record is a symlink, irregular file, duplicate identity, corrupt structure, or unsupported schema
- **THEN** apply fails closed with a bounded safe reason and performs no mutation

### Requirement: Every target outcome is append-only and crash-consistent
After each removal attempt, retention SHALL durably commit and verify one
ordered immutable outcome record before another target is attempted. Each
outcome SHALL bind the prepared-record digest, target identity, sequence,
attempt class, safe result code, and bounded observed postcondition. Existing
prepared, outcome, terminal, and recovery records MUST never be overwritten.

#### Scenario: Target deletion is recorded before the next target
- **WHEN** a target removal attempt returns
- **THEN** its outcome is durably committed and verified before any later target removal callback is invoked

#### Scenario: Outcome persistence fails after a removal attempt
- **WHEN** the removal callback has been invoked and its outcome cannot be durably committed or verified
- **THEN** apply stops immediately, invokes no later removal callback, returns `MUTATION_RECORD_INCOMPLETE`, and exits non-zero

#### Scenario: Process dies after removal and before outcome commit
- **WHEN** the process terminates after a target may have been removed but before a valid outcome record exists
- **THEN** the prepared record remains discoverable and recovery classifies that target as `OUTCOME_UNCERTAIN` rather than deleted successfully

### Requirement: Successful results require verified terminal truth
Retention SHALL commit one immutable terminal record only after the exact
prepared candidate sequence and every required outcome are valid and
consistent. `APPLIED`, `PARTIAL`, or `PRESERVED` SHALL be returned with a zero
exit only after that terminal record is durably committed, re-read, and
verified. Console output and an in-memory result MUST NOT substitute for the
terminal record.

#### Scenario: All admitted deletions and records complete
- **WHEN** every planned attempt has a valid outcome and the terminal totals and digest chain verify
- **THEN** apply may return the matching terminal `APPLIED` or `PARTIAL` result and exit zero

#### Scenario: Final record write or verification fails
- **WHEN** mutation has been attempted but terminal serialization, creation, flush, directory flush, close, reopen, or verification fails
- **THEN** the command returns `MUTATION_RECORD_INCOMPLETE`, exits non-zero, and does not report `APPLIED`, `PARTIAL`, or `PRESERVED`

#### Scenario: Terminal totals disagree with operation records
- **WHEN** a terminal record omits, duplicates, reorders, or miscounts any prepared candidate or outcome
- **THEN** the operation is corrupt/nonterminal, success is refused, and a later apply remains blocked

### Requirement: Interrupted operations are inspected without inventing certainty
The system SHALL provide a bounded read-only inspection that validates the
journal and reports proven, incomplete, uncertain, corrupt, and terminal facts
separately. Missing paths without a durable successful outcome MUST remain
uncertain. Inspection MUST NOT remove targets, modify journals, acquire
mutation authority, or treat absence as proof of Nightwatch deletion.

#### Scenario: Prepared target is absent without an outcome
- **WHEN** inspection finds an absent prepared candidate with no valid outcome record
- **THEN** it reports `OUTCOME_UNCERTAIN` and does not report the target as successfully deleted

#### Scenario: Prepared target remains present without an outcome
- **WHEN** inspection finds a present prepared candidate with no valid outcome record
- **THEN** it reports the target as incomplete or uncertain and does not retry removal

#### Scenario: Inspection encounters malformed or tampered data
- **WHEN** any digest, sequence, schema, size bound, identity, or terminal relationship fails validation
- **THEN** inspection returns a bounded corrupt/uncertain report and a non-zero result without modifying any path

### Requirement: Reconciliation preserves the immutable historical record
Any reconciliation action SHALL require explicit owner invocation and SHALL
write only new immutable recovery and terminal-recovery records. It MUST NOT
edit or remove prior records, repeat a deletion, upgrade uncertainty to proven
success, or enable another apply until the selected fail-closed reconciliation
policy is durably complete.

#### Scenario: Owner reconciles an uncertain interrupted operation
- **WHEN** the owner explicitly reconciles a valid prepared operation containing an uncertain target
- **THEN** the new recovery record preserves the uncertainty and no removal callback is invoked

#### Scenario: Reconciliation record cannot be finalized
- **WHEN** recovery persistence or verification fails
- **THEN** the operation remains incomplete, subsequent apply remains blocked, and the command exits non-zero

#### Scenario: Recovery is invoked against a completed operation
- **WHEN** a valid immutable terminal record already closes the operation
- **THEN** reconciliation performs no write or deletion and reports the existing terminal authority

### Requirement: Journal storage is private, bounded, path-confined, and integrity-checked
The retention journal SHALL live outside every evidence candidate root, use
owner-only directories and files, reject symlinks and path escapes at every
component, use exclusive regular-file creation, and bind canonical records
through full cryptographic digests. Discovery, record counts, record sizes,
candidate counts, and diagnostics SHALL be bounded. The journal MUST NOT store
artifact contents, credentials, environment values, usernames, home or
absolute paths, raw errors, or unbounded output.

#### Scenario: Journal root aliases evidence or escapes its allowed root
- **WHEN** path resolution shows the journal inside an evidence candidate, outside its configured owner-local root, or reachable through a symlink
- **THEN** every retention mutation and reconciliation write is refused before opening a record

#### Scenario: Journal bounds are exhausted
- **WHEN** operation count, record count, byte size, candidate count, or diagnostic limits are exceeded
- **THEN** apply fails closed without pruning history or invoking removal

#### Scenario: Safe receipt data is emitted
- **WHEN** preparation, application, inspection, or reconciliation returns a structured result
- **THEN** the result contains only fixed enums, bounded counts/sizes, safe relative identities, timestamps, SHAs, and digests permitted by the privacy contract

### Requirement: Adversarial tests prove the mutation-recording boundary
The retention implementation SHALL have deterministic fault-injection,
child-process interruption, concurrency, tampering, hardening, and mutation
tests covering every prepared/outcome/terminal persistence boundary and every
removal boundary. Negative tests MUST prove that forbidden later callbacks are
not reached and mutation probes MUST target production surfaces non-vacuously.

#### Scenario: Fault matrix interrupts every boundary
- **WHEN** each injected persistence or process-interruption fault is exercised before and after preparation, removal, outcome, and terminal transitions
- **THEN** the test proves the exact durable journal state, non-success exit where terminal truth is absent, and zero unauthorized later removals

#### Scenario: Real-surface safety control is weakened
- **WHEN** a registered mutation disables durable verification, permits success after terminal failure, bypasses incomplete-operation blocking, reorders outcomes, accepts a symlink, or retries deletion during recovery
- **THEN** the authoritative validation suite detects the mutation and restores the original bytes exactly

#### Scenario: Unchanged positive path is exercised
- **WHEN** a bounded synthetic operation completes without injected failure
- **THEN** the suite proves the prepared record, ordered outcomes, terminal record, structured result, and exit status agree exactly
