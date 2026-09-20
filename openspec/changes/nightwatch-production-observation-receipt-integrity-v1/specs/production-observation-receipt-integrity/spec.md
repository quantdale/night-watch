## ADDED Requirements

### Requirement: Current receipts use exact bounded schemas

Qualification and P1 receipt parsers SHALL require plain records, exact keys, closed enums, exact primitive types, finite bounds, canonical ordering, and no accessor-backed or exotic values.

#### Scenario: Receipt carries an unknown key
- **WHEN** an otherwise valid current receipt includes an extra property
- **THEN** current validation refuses with a stable categorical code

### Requirement: Chain and configuration identities are recomputed

Validation SHALL recompute the exact current production-chain definition digest and every configuration/content identity from canonical fields. It SHALL NOT accept a supplied digest based only on its format.

#### Scenario: Chain digest is well-shaped but stale
- **WHEN** a receipt uses a syntactically valid digest for a different gate definition
- **THEN** current validation refuses

#### Scenario: P1 expected implementation changes
- **WHEN** `expectedImplementationSha` changes while a prior `configIdentity` is retained
- **THEN** validation detects the mismatch

### Requirement: Gate evidence obeys a total ordered matrix

Each gate result SHALL use only its gate-specific denial codes. The first denied gate SHALL determine terminal denial, and every later gate SHALL be `NOT_EVALUATED`; a fully passing chain SHALL contain no denial code.

#### Scenario: Budget code is attached to environment gate
- **WHEN** an environment-gate result carries a globally known budget denial code
- **THEN** validation refuses

#### Scenario: A gate after denial claims PASS
- **WHEN** a later gate is evaluated after the first denial
- **THEN** validation refuses

### Requirement: Receipt authority is producer-bound

A current authoritative receipt SHALL be bound to the exact registered qualification or rehearsal execution, its normalized input snapshot, and its terminal result. Recomputing a public content digest SHALL NOT confer that authority.

#### Scenario: Caller alters coherent fields and reseals
- **WHEN** a caller creates a mutually coherent but never-executed receipt and computes its digest
- **THEN** it remains a non-authoritative draft and cannot satisfy qualification evidence

### Requirement: P1 identity covers every authority-bearing input

The P1 configuration identity SHALL include expected implementation SHA, a privacy-safe destination identity, and every field that can change execution, persistence, source comparison, request counting, or final status.

#### Scenario: Evidence destination changes
- **WHEN** the destination changes while all other configuration remains equal
- **THEN** configuration identity changes without exposing the destination text

### Requirement: Terminal facts are coherent

Qualification/P1 status, authorization lifecycle, stage, environment, source/checkpoint evidence, request counts, persistence outcome, and final result SHALL follow a closed coherence matrix derived from actual producer evidence.

#### Scenario: Receipt reports success without persisted evidence
- **WHEN** the configured terminal success requires persistence but persistence is absent or failed
- **THEN** validation refuses or classifies the run non-successful

### Requirement: Receipt authority has adversarial proof

Tests SHALL cover malformed types, unknown keys, stale definitions, per-gate denial mismatches, order mutations, coherent resealing, producer forgery, omitted configuration inputs, and contradictory terminal facts.

#### Scenario: Producer check is removed
- **WHEN** mutation allows a content digest alone to confer authority
- **THEN** the focused evidence-authority suite fails
