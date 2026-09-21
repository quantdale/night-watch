## ADDED Requirements

### Requirement: Source authority is one closed transaction

Every current real-source result SHALL bind a supported repository identity before observation and revalidate the same identity after enumeration, content reads, analysis, and projection. A changed, unavailable, ambiguous, or unsupported terminal identity SHALL make the result non-current and non-promotable.

#### Scenario: HEAD changes during route discovery
- **WHEN** repository HEAD changes after inventory begins and before discovery closes
- **THEN** no surface or candidate from that transaction is classified current or eligible

### Requirement: Only inventory-matching bytes reach analyzers

Every parser and semantic analyzer SHALL consume source bytes only through a verified read whose content digest equals the unique eligible inventory record. Digest-mismatched bytes SHALL NOT be returned as analyzable text.

#### Scenario: Route file changes after inventory
- **WHEN** a route file's later bytes differ from its inventory digest
- **THEN** no operation is parsed from those bytes and the transaction records a safe mismatch

### Requirement: Snapshot-match claims are derived

Surface currentness, cache eligibility, and Phase 24 `sourceSnapshotMatches` SHALL be derived from successfully closed transaction evidence. No adapter SHALL substitute a constant for that evidence.

#### Scenario: Joins remain unchanged but the route mismatches
- **WHEN** handler and contract joins remain valid but the route source changed
- **THEN** snapshot match is false and the candidate is ineligible

### Requirement: Path identity is race resistant

Source and Git metadata traversal SHALL use no-follow, descriptor-relative identity or an equivalently race-resistant mechanism, retain object identity across use, and fail closed when the platform cannot provide the required guarantees.

#### Scenario: A parent directory is replaced after validation
- **WHEN** a validated parent is exchanged for a symlink or different directory before the file read
- **THEN** the read is refused and no replacement bytes reach the inventory or analyzer

### Requirement: Real and synthetic access authority is explicit

Real sibling-source access SHALL require an explicit owner-approved repository capability. Synthetic fixture access SHALL be a separate non-promotable class. Omitting an admission option SHALL NOT mean unrestricted real access.

#### Scenario: Caller omits an admission set
- **WHEN** a caller requests real-source access without an explicit approved capability
- **THEN** construction or access fails closed before filesystem observation

### Requirement: Source observation is totally accounted and bounded

The source ledger SHALL account for currentness, enumeration, content, mismatch, revalidation, refusal, and terminal transaction states under fixed collection/work bounds. Empty, unavailable, refused, raced, and truncated outcomes SHALL remain distinguishable.

#### Scenario: Enumeration returns no entries after refusal
- **WHEN** repository admission or identity validation refuses enumeration
- **THEN** the ledger records the categorical refusal and cannot represent the outcome as an observed empty repository

### Requirement: Transaction integrity has adversarial proof

Tests SHALL cover every source-file role, route and handler mutation, HEAD/ref transition, same-size/same-mtime replacement, parent-directory exchange, cache interaction, duplicated inventory identity, and unsupported-platform behavior.

#### Scenario: Route digest guard is removed
- **WHEN** mutation allows route parsing from bytes that do not match inventory
- **THEN** the focused transaction-integrity suite fails
