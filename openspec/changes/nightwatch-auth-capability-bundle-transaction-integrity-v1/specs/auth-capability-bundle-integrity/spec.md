## ADDED Requirements

### Requirement: every authentication state writer uses one bundle transaction
Nightwatch SHALL enumerate every production writer of authentication storage state or lifecycle metadata and SHALL require each writer to publish through one shared bundle transaction. Independent low-level publication paths and stale census entries MUST fail structural validation.

#### Scenario: automatic DEV refresh succeeds
- **WHEN** DEV refresh produces and validates replacement storage state
- **THEN** the same transaction commits a lifecycle record derived from those exact bytes
- **AND** the returned capability passes lifecycle preflight immediately without adoption or recapture

#### Scenario: a new writer bypasses the transaction
- **WHEN** production code writes or replaces storage state or a lifecycle sidecar outside the classified transaction boundary
- **THEN** hardening fails with the unclassified writer identity

### Requirement: record and artefact are derived from one immutable generation
The transaction SHALL stage an owner-only immutable generation containing the storage state and non-secret lifecycle record, and SHALL prove schema, environment, origin, validity, permissions, and full artefact-digest agreement before commit.

#### Scenario: staged bytes change during record derivation
- **WHEN** the staged file identity, size, metadata, or digest changes between validation and commit
- **THEN** publication refuses and the previous committed generation remains current

#### Scenario: secret-shaped value reaches lifecycle metadata
- **WHEN** a lifecycle record or transaction diagnostic contains a cookie, token, storage value, credential, unsafe path, or arbitrary parse text
- **THEN** redaction/privacy validation refuses the transaction without echoing the value

### Requirement: bundle publication is crash-consistent and recoverable
Publication SHALL make readers observe either the complete prior committed generation or the complete new committed generation. It SHALL serialize writers per destination, durably commit one versioned current-generation authority, preserve the previous bundle until commit durability is proven, and represent uncertain recovery explicitly.

#### Scenario: interruption at every publication boundary
- **WHEN** execution stops before/after each file write, fsync, rename, pointer update, directory sync, or cleanup step
- **THEN** restart resolves to the complete previous or complete new bundle
- **AND** no mixed artefact/record pair is reported valid or successful

#### Scenario: two refreshes race for one destination
- **WHEN** two valid writers attempt replacement concurrently
- **THEN** at most one owns the commit boundary and the other refuses or retries before publishing
- **AND** neither writer can delete, overwrite, or adopt the other's generation

#### Scenario: durability cannot be proven
- **WHEN** final pointer or directory synchronization fails after staging
- **THEN** the operation does not report success
- **AND** recovery reports a bounded incomplete/uncertain state without inferring that the new generation committed

### Requirement: authenticated consumption is bound to the preflighted generation
A successful preflight SHALL return a versioned bundle identity, and every browser/subprocess/request launcher SHALL revalidate that exact identity at the final boundary before loading storage state. A current-generation change, expiry, alias, or mismatch SHALL refuse before the effect.

#### Scenario: bundle changes after preflight
- **WHEN** the current pointer or artefact changes after preflight but before browser/process creation
- **THEN** final admission refuses with a categorical stale-generation code
- **AND** no child, browser context, socket, request, or evidence file for the authenticated action is created

#### Scenario: browser consumes the admitted bundle
- **WHEN** final revalidation succeeds
- **THEN** the browser receives the exact storage-state generation whose digest, environment, origin, and validity were admitted

### Requirement: legacy migration preserves availability and truth
Nightwatch SHALL strictly validate a legacy artefact/sidecar pair before migration, SHALL retain it until a generated bundle is durably current, and SHALL never synthesize lifecycle age or success from file timestamps or partial state.

#### Scenario: valid legacy pair migrates
- **WHEN** an operator selects a valid digest-matched legacy pair
- **THEN** migration commits an equivalent generation idempotently and only then permits bounded legacy cleanup

#### Scenario: legacy pair is missing or mismatched
- **WHEN** the sidecar is absent, malformed, wrong-environment, expired, or digest-mismatched
- **THEN** migration refuses with the existing lifecycle state/remedy and does not alter either file

### Requirement: validation covers faults, aliases, privacy, and cleanup
The implementation SHALL include deterministic synthetic tests for all writers and readers, each commit fault boundary, concurrent processes, symlink/ancestor/path aliases, stale locks, malformed generations, replacement of an existing valid bundle, redaction, recovery idempotence, and temporary cleanup.

#### Scenario: complete acceptance runs
- **WHEN** the implementation is proposed for integration
- **THEN** focused auth/storage tests, structural writer census, typecheck, hardening, mutation/fault campaign, continuity/workspace/project checks, full local/clean gates, and full regression pass
- **AND** no DEV/NEXT/production contact or real credential handling is required for the proof
