## ADDED Requirements

### Requirement: Finding status projection is total

The Control Center finding summary SHALL project `READY`, `INCOMPLETE`, `UNAVAILABLE`, and `UNKNOWN` from dossier/readiness facts. A boolean `status === 'READY'` test SHALL NOT be the mapping.

#### Scenario: Failed reproduction dossier
- **WHEN** a dossier is not ready because reproduction failed or is unresolved
- **THEN** the summary is not INCOMPLETE solely because status is not READY

### Requirement: READY is not a raw label copy

READY SHALL be projected only when the owning dossier cone's readiness verdict is READY. A protocol `status: READY` string alone SHALL NOT suffice once protocol-readiness integrity is in force.

#### Scenario: False protocol READY
- **WHEN** a protocol dossier carries status READY after failed fresh replay
- **THEN** the Control Center summary does not present FACT READY

### Requirement: Elision is not incompleteness

Privacy-elided or unreadable dossiers SHALL be UNAVAILABLE or UNKNOWN, not dropped without accounting or labelled INCOMPLETE.

#### Scenario: Privacy-unsafe dossier
- **WHEN** `safeDossier` currently returns null
- **THEN** the page accounts for the row as UNAVAILABLE/UNKNOWN rather than silently omitting it from totals without a state

### Requirement: Projection has adversarial proof

Tests SHALL cover false READY, failed/unresolved, unread, privacy-elided, and truncated pages.

#### Scenario: Boolean mapping is restored
- **WHEN** mutation restores `status === 'READY' ? 'READY' : 'INCOMPLETE'`
- **THEN** the focused projection suite fails
