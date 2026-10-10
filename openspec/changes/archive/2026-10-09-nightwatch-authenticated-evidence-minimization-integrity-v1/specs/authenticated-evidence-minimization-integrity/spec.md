## ADDED Requirements

### Requirement: Authenticated URL identity is provenance-bound
The system SHALL persist an authenticated URL only as an allowed origin plus an exact source/provenance-bound route template. Lexical appearance SHALL NOT classify a segment as safe. Query, fragment, userinfo, and concrete parameter values SHALL never persist; unavailable template proof SHALL reduce to a categorical unknown-route identity.

#### Scenario: Lowercase identifier resembles a route word
- **WHEN** an authenticated URL contains a segment such as acme1234 or accountabc
- **THEN** the literal is not persisted unless it is a proven static route segment

#### Scenario: Route proof is absent
- **WHEN** no exact admitted template matches the URL
- **THEN** only the allowed origin and unknown-route category persist

### Requirement: Every authenticated writer uses one closed persistence firewall
Every manifest, event, network/proxy record, repository fact, summary, note, diagnostic, semantic auxiliary artifact, screenshot/trace decision, and future writer under an authenticated run SHALL be discovered and SHALL publish only a closed bounded DTO through the final authenticated persistence firewall. Unknown fields, free text, nested raw objects, or unclassified writers SHALL fail closed.

#### Scenario: Summary note contains a customer value
- **WHEN** a caller supplies an arbitrary note containing an ordinary-looking private value
- **THEN** publication is refused or the note is replaced by a closed categorical representation before any bytes are written

#### Scenario: New direct writer is added
- **WHEN** code writes beneath an authenticated run directory outside the registered publisher
- **THEN** hardening fails until the writer is classified and converted

### Requirement: Authenticated storage is private before first publication
Authenticated mode SHALL be fixed before first publication or transition irreversibly through an identity-checked hardening transaction. Directories SHALL be owner-only, files SHALL be owner-only regular non-symlinks, publication SHALL be bounded and crash-consistent, and unsafe pre-existing paths SHALL be refused.

#### Scenario: Recorder switches after construction
- **WHEN** storage-state discovery changes an existing recorder to authenticated mode
- **THEN** its directory and existing owned files are safely hardened before the next write or the run fails closed

### Requirement: Authenticated diagnostics are categorical
Failures SHALL contain only closed codes, safe counts, proven route IDs, and bounded safe digests. Native errors, absolute paths, raw URLs, snapshots, notes, page text, headers, bodies, credentials, and customer values SHALL NOT enter durable or terminal diagnostics.

#### Scenario: Publisher receives a native error with private text
- **WHEN** a write or validation operation fails with private material in its message
- **THEN** only an allowlisted categorical failure is emitted

### Requirement: Authenticated minimization enforcement is non-vacuous
Tests SHALL cover ordinary lowercase/mixed identifier shapes, every writer profile, nested unknown keys, mode transitions, permissions/symlinks, collisions/concurrency/interruption, and direct-writer mutations. The suite SHALL prove that each planted value entered its intended input channel and is absent from every durable/public output.

#### Scenario: Identifier heuristic is reintroduced
- **WHEN** mutation preserves a path literal based only on a character regex
- **THEN** the ordinary-looking identifier corpus fails the privacy gate

#### Scenario: Final sanitizer is bypassed
- **WHEN** mutation routes any registered writer directly to filesystem output
- **THEN** writer-census and planted-sentinel tests fail
