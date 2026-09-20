## ADDED Requirements

### Requirement: Profile deletion requires exact generation authority

Creation SHALL produce an exclusive owner-only profile generation, private marker/lease, and non-constructible cleanup capability bound to the verified base and exact filesystem identity. Cleanup SHALL revalidate those bindings and SHALL NOT accept a filename prefix or plain path as authority for recursive deletion.

#### Scenario: Arbitrary directory has the expected prefix
- **WHEN** a caller passes an absolute directory named `nightwatch-prod-profile-*` without the matching capability and marker
- **THEN** cleanup refuses and leaves it byte-identical

#### Scenario: Profile path is replaced
- **WHEN** the profile directory, ancestor, marker, ownership, type, or identity changes after creation
- **THEN** cleanup refuses without following or deleting the replacement

### Requirement: Stale sweeping preserves live and ambiguous profiles

The stale sweeper SHALL use validated generation markers and liveness/lease proof, safe resolved base confinement, owner/type/mode checks, and bounded inventory. It SHALL delete only conclusively inactive generations and SHALL report every retained ambiguous or invalid entry categorically.

#### Scenario: Old profile is still active
- **WHEN** a profile exceeds an age threshold but its lease is live
- **THEN** it is retained and cannot be classified stale by time alone

#### Scenario: Inventory is unreadable or over budget
- **WHEN** any required entry cannot be classified or the bound is reached
- **THEN** sweep reports incomplete/non-success and does not delete the uncertain entry

### Requirement: Production findings are immutable and durably committed

The store SHALL validate/serialize before mutation, serialize capacity admission, stage privately and exclusively, verify/fsync admitted bytes, commit without replacement, fsync the parent directory, and report success only after durable commit. Existing different content SHALL never be overwritten.

#### Scenario: Destination already exists
- **WHEN** publication targets an existing finding identity
- **THEN** exact identical content is reported idempotently without rewrite, while different content is refused and existing bytes remain unchanged

#### Scenario: Concurrent writers approach capacity
- **WHEN** multiple processes reserve the last available slots
- **THEN** committed plus reserved findings never exceeds the declared maximum and successful files remain distinct and complete

### Requirement: Persistence audit clean means complete

The audit SHALL report a closed completeness status and bounded counts for every requested root/profile base, traversal outcome, file outcome, omission, and unknown remainder. `CLEAN` SHALL require safe admission and complete inspection of every required entry plus zero violations.

#### Scenario: File budget is exceeded
- **WHEN** more files exist than the audit can inspect
- **THEN** omitted/remaining-unknown truth is recorded and the result is `INCOMPLETE`, never clean

#### Scenario: Root or directory cannot be read
- **WHEN** a required root is missing, inaccessible, changes identity, or a directory/stat/read operation fails
- **THEN** the result records the categorical gap and cannot certify clean

### Requirement: Results and errors preserve privacy

Profile, store, and audit results SHALL expose only safe relative identities, categorical codes, counts, and bounded digests. They SHALL NOT expose absolute/home paths, host error strings, credentials, customer values, raw evidence, or profile contents.

#### Scenario: Host error contains a private path
- **WHEN** an underlying filesystem operation fails with a sensitive message
- **THEN** only a stable categorical failure is returned or persisted

### Requirement: Validation exercises destructive and incomplete boundaries

Tests SHALL use disposable roots and cover active/stale/replaced profiles, prefix-only targets, symlink/alias/type/owner/mode attacks, concurrent cleanup/publication, capacity races, every commit/durability fault, missing/unreadable/changed roots, >limit trees, and mutations removing each check.

#### Scenario: Audit silently skips an entry mutation
- **WHEN** a mutation restores catch-and-continue without incompleteness accounting
- **THEN** the focused completeness suite fails
