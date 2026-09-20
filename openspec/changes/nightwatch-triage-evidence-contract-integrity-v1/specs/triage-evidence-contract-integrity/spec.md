## ADDED Requirements

### Requirement: Replay admission proves evidence representability

A replay plan SHALL pass validation only when every occurrence identity and eventual result-envelope field is within the shared bounded domain.

#### Scenario: Occurrence ordinal exceeds the identity bound
- **WHEN** a v2 plan contains an ordinal greater than 999,999
- **THEN** validation refuses before any executor callback

#### Scenario: Validated plan executes
- **WHEN** execution begins from a validated current plan
- **THEN** envelope construction cannot fail because of plan shape or identity range

### Requirement: Minimality evidence parsing is canonical and exact

The current minimality-evidence parser SHALL enforce exact keys, plain records, closed enums, actual booleans, bounded arrays/counts, occurrence-aware survivor identity, and digest recomposition.

#### Scenario: Digest is arbitrary but well-shaped
- **WHEN** a payload supplies a non-empty or pattern-valid digest that does not match its canonical survivor identities
- **THEN** parsing refuses with a stable categorical code

#### Scenario: Truthy non-boolean attempts a proven marker
- **WHEN** `reductionAttempted` is a string or number
- **THEN** parsing refuses rather than interpreting truthiness

### Requirement: Semantic replay receipts obey a total coherence matrix

Each current outcome SHALL have required and forbidden relationships across occurrence binding, source currentness, safety, determinism, observed identities, counts, and rejection reason.

#### Scenario: Source-stale outcome claims current source
- **WHEN** a receipt says `SOURCE_STALE` with `sourceCurrentness: CURRENT`
- **THEN** validation refuses

#### Scenario: Exact reproduction carries a rejection reason
- **WHEN** a `REPRODUCED_EXACT` receipt also carries a rejection reason
- **THEN** validation refuses

### Requirement: Historical evidence cannot acquire current authority

Historical parsers SHALL identify accepted legacy evidence explicitly, and downstream promotion SHALL require the current strict schema.

#### Scenario: Legacy receipt omits occurrence proof
- **WHEN** a readable historical record lacks current required binding fields
- **THEN** it remains historical/non-promotable and cannot be relabeled as current

### Requirement: Cross-layer mutations are detected

Tests SHALL exercise all boundary values and mutations that remove an ordinal bound, exact-key check, type check, digest recomposition, coherence edge, or current-schema promotion requirement.

#### Scenario: Plan bound and envelope bound drift
- **WHEN** a mutation changes only one layer's bound
- **THEN** the cross-layer compatibility suite fails
