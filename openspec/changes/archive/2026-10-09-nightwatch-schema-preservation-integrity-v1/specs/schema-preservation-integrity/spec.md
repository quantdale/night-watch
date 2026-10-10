## ADDED Requirements

### Requirement: Export receipts account for every candidate
The schema exporter SHALL take a bounded stable inventory and report safe counts for discovered entries, in-scope candidates, exported records, omitted-by-limit records, unreadable records, malformed records, unsupported records, and identity changes. No candidate failure or limit SHALL disappear from the terminal outcome.

#### Scenario: Candidate count exceeds the limit
- **WHEN** the source store contains more in-scope records than the maximum export count
- **THEN** the outcome reports the exact bounded omitted count and cannot claim `COMPLETE` or `truncated: false`

#### Scenario: One matching record is malformed
- **WHEN** a matching record cannot be parsed or validated
- **THEN** the outcome names a safe categorical count/code and does not claim all source records were preserved

### Requirement: Complete preservation requires a stable complete snapshot
A complete preservation receipt SHALL require that every in-scope candidate in the admitted listing was safely opened without link traversal, remained the same regular-file identity through bounded read, parsed, sanitized, serialized, and appeared in the final verified export. Partial diagnostic exports SHALL explicitly carry no migration or ORPHAN authority.

#### Scenario: Record is replaced during export
- **WHEN** a source leaf changes identity or bytes between admission and read verification
- **THEN** complete export refuses with a changed-during-read outcome and publishes no complete receipt

#### Scenario: Directory contains unrelated entries
- **WHEN** entries do not match the closed record-name grammar
- **THEN** they are counted separately from in-scope candidates and cannot be silently confused with malformed records

### Requirement: Export publication is confined exclusive and durable
The destination SHALL be an absolute owner-selected path outside the canonical repository/workspace whose existing ancestry is walked and proven symlink-free. Publication SHALL use owner-only exclusive staging, bounded write, file flush/close/reopen verification, no-replace commit, and directory synchronization before success.

#### Scenario: Ancestor symlink routes outside path into repository
- **WHEN** a lexically external destination traverses an ancestor symlink whose real target is inside the repository/workspace
- **THEN** publication refuses before creating or modifying a file

#### Scenario: Durability cannot be established
- **WHEN** file verification or directory synchronization fails or is unsupported
- **THEN** no durable-success receipt is emitted and the outcome remains explicit non-success/uncertainty

### Requirement: Export surfaces preserve privacy
Export content SHALL remain bounded and sanitized; receipts and diagnostics SHALL contain only safe store IDs, basenames, digests, counts, enums, and bounded timestamps. They SHALL NOT expose source records, secret values, absolute/home paths, raw host errors, credentials, or customer data.

#### Scenario: Read failure embeds a private path
- **WHEN** the host error contains an absolute owner path
- **THEN** durable and console outputs contain only the mapped categorical failure and safe count

### Requirement: Non-destructive migration proves distinct identity
A migration SHALL prove source and destination are distinct filesystem objects/qualified identities, including symlink, relative-path, case-normalization where applicable, and hardlink aliases, before transformation or write. Raw path-string inequality is insufficient.

#### Scenario: Different strings name the same object
- **WHEN** source and destination strings resolve through aliases to the same file identity
- **THEN** migration refuses before transform and write

#### Scenario: Destination appears after admission
- **WHEN** a destination is created or redirected between identity admission and exclusive publication
- **THEN** migration refuses without replacing it or touching the original

### Requirement: Original retention is observed after every write attempt
The migration outcome SHALL claim `originalRetained: true` only after rereading the admitted original identity and proving its exact preimage bytes/digest remain. Write failure, readback failure, process interruption, or identity ambiguity SHALL produce a distinct retention state rather than a constant assertion.

#### Scenario: Injected writer aliases the original
- **WHEN** a faulty or adversarial adapter writes the migrated bytes to the original object
- **THEN** post-write proof detects the changed original and the result cannot claim retention

#### Scenario: New record verifies and original is unchanged
- **WHEN** exclusive new-record publication, readback validation, and original post-check all succeed
- **THEN** `MIGRATED` may report observed original retention with both identities and digests bound in a privacy-safe receipt

### Requirement: Preservation enforcement is non-vacuous
Authoritative tests SHALL exercise real filesystems, separate processes, barriers, and killed-process fault points. Mutation probes SHALL detect pre-slicing away truncation, skipped read/parse failures, symlinked ancestry, direct/non-durable write, string-only path comparison, constant retention truth, and missing post-write original verification.

#### Scenario: Current pre-slice behavior is restored
- **WHEN** a mutation slices candidate names before completeness accounting
- **THEN** a limit test fails because the receipt no longer reports omitted records truthfully

#### Scenario: Process dies at publication boundaries
- **WHEN** an export/migration child is terminated after stage write, file sync, commit, or before terminal receipt
- **THEN** inspection reports exact durable/uncertain state without overwriting, deleting, or retrying source records
