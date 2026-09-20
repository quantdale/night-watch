## ADDED Requirements

### Requirement: Complete local publication inventory
The system SHALL maintain a checked inventory of every command that writes an ignored repository-local report or receipt, including its default destination, schema identity, maximum serialized size, and exactly one publication profile. The inventory SHALL cover cache-key contract, record identity, release freshness, silent-zero-output, test-oracle quality, change intelligence, and gate topology, and SHALL reject unclassified or stale entries.

#### Scenario: Declared writers are completely classified
- **WHEN** the publication inventory check compares command artifact metadata, persisted-schema declarations, source writers, and inventory entries
- **THEN** every ignored report/receipt writer has exactly one live caller, schema, bound, destination policy, profile, and focused test owner

#### Scenario: A new direct artifact writer appears
- **WHEN** a command begins writing beneath ignored `artifacts/**` without a complete inventory entry
- **THEN** authoritative hardening fails and identifies the bounded missing publication classification

### Requirement: Admission precedes destination mutation
The system SHALL completely serialize, schema-validate, size-bound, and digest a report or receipt before creating or changing any destination directory, staging file, or published file. Admission failure SHALL leave both the requested destination and any preceding complete report unchanged.

#### Scenario: Payload fails schema validation
- **WHEN** a caller supplies a serializable payload that disagrees with its declared schema
- **THEN** publication fails categorically before any destination filesystem mutation

#### Scenario: Serialized report exceeds its bound
- **WHEN** the complete encoded report is larger than its inventoried maximum
- **THEN** publication fails before directory or file creation and does not attempt a partial write

### Requirement: Destination paths are symlink-safe and type-safe
The system SHALL verify the resolved destination, all relevant existing ancestors, the destination parent, and any existing leaf without following symlinks. Default destinations SHALL remain confined to their declared repository artifact subtree. Explicit operator destinations SHALL authorize only the selected bounded regular file and SHALL NOT authorize traversal through a symlink, path-identity change, or irregular filesystem object.

#### Scenario: Default destination escapes its artifact subtree
- **WHEN** a default path resolves outside the caller's inventoried repository artifact subtree
- **THEN** publication is refused before any external path is changed

#### Scenario: Ancestor symlink targets an external sentinel
- **WHEN** an ancestor of the requested output is a symlink to a regular file or directory outside the admitted root
- **THEN** publication fails categorically and the external sentinel remains byte-identical

#### Scenario: Existing leaf is unsafe
- **WHEN** the destination leaf is a symlink, directory, device, socket, FIFO, or an identity that changes during publication
- **THEN** publication is refused and neither the unsafe leaf nor its target is modified

### Requirement: Current reports replace atomically and privately
The `CURRENT_REPLACE` profile SHALL stage admitted bytes in the verified destination directory through an unpredictable, exclusively created `0600` regular file; durably write and verify its exact type, size, and digest; atomically replace the destination; and order required directory durability before reporting success. At every observable point, the destination SHALL be either the preceding complete report or the newly admitted complete report.

#### Scenario: Failure occurs before atomic commit
- **WHEN** create, write, flush, close, verification, or pre-commit identity validation fails
- **THEN** the preceding complete current report remains byte-identical and the invocation reports non-success

#### Scenario: Current report commit succeeds
- **WHEN** admitted report bytes are staged, verified, atomically replaced, and directory durability completes
- **THEN** the destination is a `0600` regular file whose bytes, schema, size, and digest exactly match the admitted generation

#### Scenario: Concurrent current publishers complete
- **WHEN** two valid processes publish different admitted generations to the same current-report destination
- **THEN** both commits are linearized without torn or mixed bytes and the final destination is exactly one complete schema-valid generation

### Requirement: Historical topology receipts never overwrite
The `APPEND_IMMUTABLE` profile SHALL assign each gate-topology receipt a bounded filename containing sortable time, admitted content digest, and a collision-resistant invocation component, and SHALL commit the receipt with an exclusive no-replace operation. A successful invocation SHALL correspond to one durably verified immutable receipt, unless the operator explicitly selected `--no-receipt`.

#### Scenario: Two runs share a timestamp and payload digest
- **WHEN** concurrent successful topology runs have the same millisecond time and identical serialized receipt bytes
- **THEN** each run commits a distinct valid receipt and neither file overwrites the other

#### Scenario: Candidate receipt name already exists
- **WHEN** exclusive commit detects a filename collision
- **THEN** the publisher either selects a fresh bounded invocation component or fails non-success without changing the existing receipt

#### Scenario: Receipt finalization fails
- **WHEN** receipt verification, no-replace commit, or required directory durability fails
- **THEN** the topology command does not claim persisted-receipt success and no historical receipt is replaced

#### Scenario: Receipt publication is explicitly disabled
- **WHEN** the operator invokes gate topology with `--no-receipt`
- **THEN** the command performs no receipt publication and truthfully reports that no receipt was created

### Requirement: Publication errors and cleanup preserve privacy and ownership
The system SHALL expose only bounded categorical publication results and SHALL NOT emit absolute/home paths, raw host error strings, environment values, payload contents, credentials, or customer data. Cleanup SHALL remove only a staging identity created and still owned by the current invocation; it SHALL NOT broadly traverse or clean the artifact directory.

#### Scenario: Host filesystem error contains a private path
- **WHEN** an underlying filesystem operation fails with a message containing the repository or home path
- **THEN** public stdout, stderr, return data, and durable artifacts contain only the mapped safe category

#### Scenario: Stale staging file belongs to another invocation
- **WHEN** publication discovers a bounded staging file whose owner token or filesystem identity does not match the current invocation
- **THEN** it neither consumes nor deletes that file and does not treat it as a published report

### Requirement: Unsupported durability fails closed
The system SHALL qualify the safe-open, atomic-replace or no-replace, file-flush, verification, and directory-durability primitives required by the selected profile. It SHALL refuse publication on an unqualified platform or filesystem and SHALL NOT fall back to direct, truncating, or best-effort writes.

#### Scenario: Required directory durability is unavailable
- **WHEN** the selected profile cannot establish its required parent-directory durability primitive
- **THEN** publication returns `LOCAL_REPORT_PUBLICATION_UNSUPPORTED`, preserves preceding artifacts, and does not report success

### Requirement: Enforcement proves real writers and negative boundaries
The system SHALL test the shared publisher and every inventoried real command with synthetic local fixtures, external sentinels, injected persistence faults, concurrent child processes, permission checks, and non-vacuous mutation probes. Authoritative validation SHALL fail if a caller bypasses the shared boundary or any mandatory admission, confinement, exclusivity, durability, privacy, or success-coupling control is removed.

#### Scenario: Real CLI encounters a symlinked output path
- **WHEN** each inventoried command is invoked through its real process entrypoint against a leaf or ancestor symlink targeting an external sentinel
- **THEN** it fails safely, preserves sentinel and prior-report bytes, and emits no machine-specific path

#### Scenario: A publication control is mutated away
- **WHEN** a registered probe makes one mandatory control ineffective while proving that implementation bytes changed
- **THEN** the intended focused test or hardening rule fails before the mutation is restored byte-for-byte

#### Scenario: Concurrent topology process test runs
- **WHEN** multiple real gate-topology processes publish under forced timestamp collision
- **THEN** the receipt directory contains one private schema-valid immutable receipt per successful publisher with no overwritten sentinel
