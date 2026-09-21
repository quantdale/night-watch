## ADDED Requirements

### Requirement: Source proof is syntax-aware

Every mechanically provable contract SHALL come from a bounded parsed/tokenized construct. Comments, strings, malformed syntax, and text outside the selected declaration SHALL NOT create proof.

#### Scenario: Schema text appears in a comment
- **WHEN** a TypeScript comment or string contains a complete required/enum pattern
- **THEN** no candidate is mechanically proven from that text

### Requirement: Proof binds the exact symbol and output flow

Behavioral contracts SHALL bind the selected symbol, recognized operation, source field, and returned/serialized destination. Isolated calls or guessed destination paths SHALL be rejected.

#### Scenario: Reduce result is unused
- **WHEN** a matching reduce expression never flows to the response's `total` field
- **THEN** no aggregation contract is admitted

### Requirement: Static schemas fail closed on incoherence

OpenAPI and generated schemas SHALL reject malformed required arrays, duplicates, required names absent from properties, unsupported types, and ambiguous declaration selection.

#### Scenario: Required field has no property
- **WHEN** an OpenAPI schema requires a name that is not declared in properties
- **THEN** the analyzer rejects the schema

### Requirement: Analyzer completeness is explicit

Exceeding any source, token, declaration, or output bound SHALL produce a non-admissible incomplete result. The analyzer SHALL NOT silently slice a result prefix and report it as complete.

#### Scenario: More than the output cap is discovered
- **WHEN** a source artifact yields more observations than the fixed cap
- **THEN** admission refuses the artifact with an explicit overflow reason

### Requirement: Proof-version identity is exact

Parser, grammar, flow rule, and bound changes SHALL alter analyzer/derivation/cache identity. Evidence from an older proof generation SHALL not be silently rebound.

#### Scenario: Parser generation changes
- **WHEN** cached evidence was created under a different parser or grammar version
- **THEN** it is stale and requires fresh derivation

### Requirement: Analyzer soundness has adversarial proof

Tests SHALL cover comments, strings, templates, regex literals, multiple structs/functions, wrong symbols, aliases, unrelated operations, malformed OpenAPI, parser ambiguity, and every overflow boundary.

#### Scenario: Raw regex proof is restored
- **WHEN** mutation admits comment/string decoys
- **THEN** the focused analyzer-soundness suite fails
