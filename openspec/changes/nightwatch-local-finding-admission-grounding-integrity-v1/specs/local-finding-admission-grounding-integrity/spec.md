## ADDED Requirements

### Requirement: Candidate membership is exact when state is present

When runtime state is supplied, admission SHALL exact-validate `candidateIds` and SHALL refuse unless the candidate is a member.

#### Scenario: State omits candidateIds
- **WHEN** `state` is an object without a string-array `candidateIds` and a history proposal exists
- **THEN** admission refuses `UNKNOWN_CANDIDATE` rather than continuing on history alone

### Requirement: Provenance refs are observed

Admission SHALL NOT invent provenance identifiers. Empty observed provenance from qualifying receipts SHALL refuse.

#### Scenario: Qualifying receipts have no evidence or provenance refs
- **WHEN** reproductions qualify but contribute no evidenceRef/sourceEvidenceRef/provenanceRefs
- **THEN** admission refuses instead of emitting `reproduction:<id>`

### Requirement: Ungrounded presentation is labelled

Missing draft title or severity SHALL NOT be filled with an ordinary-looking default that appears grounded.

#### Scenario: Draft omits recommendedSeverity
- **WHEN** admission otherwise succeeds
- **THEN** severity is marked ungrounded or omitted from authority-shaped fields, not silently set to S3

### Requirement: Grounding has adversarial proof

Tests SHALL cover missing candidateIds, non-array candidateIds, history-only proposals with present state, empty provenance, and default title/severity.

#### Scenario: Provenance synthesis is restored
- **WHEN** mutation reintroduces `reproduction:${id}` fallback
- **THEN** the focused admission suite fails
