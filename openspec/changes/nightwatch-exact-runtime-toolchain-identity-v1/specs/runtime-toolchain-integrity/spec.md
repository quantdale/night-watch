## ADDED Requirements

### Requirement: Certification toolchains have one exact governed identity

Nightwatch SHALL define a versioned, data-only, owned-key manifest that binds
each supported certification platform and architecture to one exact Node
version, exact npm version, deterministic integrity identities for the
governed Node/npm payloads, review provenance, and a canonical toolchain ID.
Unknown, duplicate, missing, malformed, unsupported, non-canonical, major-only,
range, wildcard, channel, or alias values MUST fail closed before dependency
installation or repository gate execution.

#### Scenario: exact manifest entry is admitted

- **WHEN** the current platform has exactly one well-formed manifest entry with exact versions and valid full integrity digests
- **THEN** the validator SHALL return one canonical toolchain identity derived from that entry
- **AND** the result SHALL contain no machine-local path or environment value

#### Scenario: moving selector is rejected

- **WHEN** a Node or npm version is `20`, `20.x`, `latest`, a range, a channel, or another non-exact selector
- **THEN** validation SHALL fail before any installer or gate callback is reached
- **AND** the diagnostic SHALL identify only the fixed invalid-field class

#### Scenario: unsupported or ambiguous entry is rejected

- **WHEN** the current platform has no entry, multiple matching entries, an unknown field, or a missing/malformed integrity value
- **THEN** certification SHALL be unavailable
- **AND** no nearest-platform or default entry SHALL be inferred

### Requirement: Toolchain admission executes no moving resolver

The clean-checkout lane SHALL use only an already provisioned toolchain whose
exact versions and governed payload digests match the manifest. It MUST NOT
invoke `npm exec`, `npx`, a package registry, curl, a version manager, or any
other runtime downloader/resolver to satisfy certification. An absent,
symlinked, irregular, unreadable, mismatched, or ambiguous toolchain SHALL
produce a structured refusal and SHALL run neither `npm ci` nor the quality
gate.

#### Scenario: installed exact toolchain proceeds

- **WHEN** the current or explicitly owner-provisioned toolchain is a safe regular target and its exact observed identity matches the manifest
- **THEN** the clean lane SHALL admit it and MAY proceed to `npm ci --ignore-scripts`
- **AND** the admitted canonical identity SHALL be immutable for the run

#### Scenario: missing toolchain does not bootstrap itself

- **WHEN** no exact admitted toolchain is already present
- **THEN** the clean lane SHALL return `TOOLCHAIN_UNAVAILABLE` without network or package-manager resolution
- **AND** dependency installation and every gate group SHALL remain not run

#### Scenario: version or integrity mismatch fails before installation

- **WHEN** either the exact version or any governed payload digest differs from the selected manifest entry
- **THEN** the clean lane SHALL return `TOOLCHAIN_MISMATCH`
- **AND** it SHALL expose no raw path, payload bytes, command output, or environment value

### Requirement: CI and clean lanes consume the same exact toolchain entry

The authoritative CI workflow SHALL select the exact Node version declared by
the current manifest entry and SHALL verify the full canonical toolchain
identity before `npm ci`. A major, range, wildcard, channel, alias, or value
that disagrees with the manifest MUST fail repository hardening. An immutable
setup-action identity and an exact runtime identity SHALL be independent
mandatory controls.

#### Scenario: exact workflow selector matches the manifest

- **WHEN** the workflow's setup step names the exact manifest Node version and the pre-install observer proves the admitted identity
- **THEN** CI MAY install dependencies and execute the repository gate
- **AND** its receipt SHALL bind that exact canonical identity

#### Scenario: workflow selector drifts

- **WHEN** the workflow selects `20`, `20.x`, `latest`, a range, or an exact version different from the manifest
- **THEN** hardening SHALL fail with a bounded toolchain-identity error
- **AND** an otherwise valid full-SHA setup action SHALL NOT make the workflow acceptable

### Requirement: Certification receipts prove exact toolchain provenance

Every certification-bearing inner quality-gate receipt and outer clean receipt
SHALL contain the same bounded canonical identity: exact Node version, exact
npm version, platform, architecture, manifest-entry digest, observed integrity
digest(s), and stable toolchain ID. Missing, malformed, unsupported, or
conflicting identity SHALL make the result non-PASS. `nodeMajor` alone MUST NOT
authorize or prove certification.

#### Scenario: inner and outer receipts agree

- **WHEN** the exact admitted toolchain runs a clean certification successfully
- **THEN** both receipts SHALL carry field-for-field identical canonical identities
- **AND** the final PASS SHALL be bound to that toolchain ID

#### Scenario: receipt identity is absent or disagrees

- **WHEN** the inner identity is missing or any inner/outer field or digest differs
- **THEN** the outer receipt SHALL fail closed with a fixed mismatch class
- **AND** it SHALL NOT select whichever receipt appears more favorable

#### Scenario: receipt stays privacy-safe

- **WHEN** toolchain identity is serialized or a mismatch is reported
- **THEN** no executable path, home/cache path, registry response, environment value, username, or raw child output SHALL be represented

### Requirement: Toolchain integrity is mutation-proven and manually rotated

Repository validation SHALL include positive tests plus non-vacuous mutations
that alter the executable workflow selector, manifest versions/integrity,
pre-install ordering, moving-fallback ban, and receipt identity/parity. Each
mutation MUST be detected and restored byte-for-byte. Toolchain updates SHALL
be manual, provenance-reviewed, and SHALL require new clean and exact-head CI
evidence; historical receipts SHALL retain their original toolchain identity.

#### Scenario: mutation matrix detects every control loss

- **WHEN** each declared mutation is applied independently to the real governed surface
- **THEN** the expected validator or hardening rule SHALL fail for that mutation
- **AND** the campaign SHALL prove the mutated bytes were restored exactly

#### Scenario: reviewed toolchain rotation advances evidence

- **WHEN** an owner approves a new exact Node/npm toolchain
- **THEN** the manifest, workflow selector, focused evidence, clean receipt, and exact-head CI receipt SHALL advance coherently
- **AND** no runtime command SHALL resolve or rewrite the admitted version automatically
