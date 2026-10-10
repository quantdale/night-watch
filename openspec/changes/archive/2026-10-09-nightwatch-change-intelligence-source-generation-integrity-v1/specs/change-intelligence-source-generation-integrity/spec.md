## ADDED Requirements

### Requirement: ChangeSet admission is exact and canonical

Every authoritative selector SHALL exact-validate bounded versions, repositories, baselines, files, paths, statuses, windows, and collection relationships and SHALL recompute `changesetId`. Typed or digest-shaped structural input SHALL NOT bypass parsing.

#### Scenario: Changed file is added without resealing
- **WHEN** a changed file is inserted while the retained changeset ID is unchanged
- **THEN** selection refuses the ChangeSet

### Requirement: Each changed repository has one coherent baseline

Every changed file SHALL belong to exactly one approved repository baseline, and changed-repo/file/baseline sets SHALL agree. Duplicate, missing, or divergent ranges SHALL fail closed.

#### Scenario: Combined set has two ranges for one repository
- **WHEN** two baselines name the same repo with different heads
- **THEN** the combined ChangeSet is invalid rather than last-writer or multi-generation input

### Requirement: Dependency-map currentness binds the actual source interval

An edge SHALL be current only when the selector proves that the complete interval from the map's authored SHA through the ChangeSet head is represented, or a canonical re-derivation receipt binds the map to the exact range baseline.

#### Scenario: Range begins after the map SHA
- **WHEN** a known-path change uses a baseline newer than the map SHA without a re-derivation receipt
- **THEN** the edge is stale and selection triggers conservative fallback

### Requirement: Selection generations cannot be composed

Map generation, repo baseline/head, changed-file digest, and selector version SHALL form one selection generation. Evidence from different generations SHALL NOT combine into selective confidence.

#### Scenario: One repo uses a different map generation
- **WHEN** a multi-repo ChangeSet contains one unbound map/range pair
- **THEN** the bounded selection falls back for the whole decision

### Requirement: Static checkout pins are not live currentness evidence

Equality among configured `checkedOutSha`, `sourceMapSha`, and edge SHA SHALL NOT establish that a live ChangeSet uses that generation.

#### Scenario: All pins match but head moved
- **WHEN** configured pins agree and the actual ChangeSet head/range is later
- **THEN** currentness is decided from interval evidence, not the pin equality

### Requirement: Rename classification preserves runtime endpoints

Old and new rename paths SHALL be classified independently. A rename SHALL be non-runtime only when both endpoints are proven non-runtime; otherwise every runtime endpoint SHALL participate in dependency matching or conservative fallback.

#### Scenario: Runtime source moves into docs
- **WHEN** a mapped runtime path is renamed to a documentation or CI path
- **THEN** the source-path dependency remains an impact and cannot be suppressed as docs/test-only

### Requirement: Source-generation integrity has adversarial proof

Tests SHALL cover moved heads/bases, skipped history, duplicates, forged IDs, unknown fields, dirty-window incoherence, mixed map generations, reorderings, both rename directions across runtime/non-runtime boundaries, and the actual real-campaign caller.

#### Scenario: Baseline comparison is removed
- **WHEN** mutation restores pin-only staleness logic
- **THEN** the focused selection-authority suite fails
