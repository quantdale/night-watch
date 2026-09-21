## ADDED Requirements

### Requirement: Real expectation authority comes from a canonical producer

An authoritative real-source expectation SHALL be produced only from a fixed approved recipe and a successfully closed exact source transaction. A caller-assembled expectation, recipe, SHA, provenance, version label, or digest SHALL NOT independently confer authority.

#### Scenario: Caller supplies a valid-looking proof label
- **WHEN** an expectation carries a recognized derivation version and a well-shaped evidence digest but no canonical derivation record
- **THEN** real-source admission refuses it

### Requirement: The complete expectation is bound to extraction evidence

The derivation record SHALL bind the canonical recipe, source transaction, normalized extraction, and every semantic expectation field. Resolution SHALL rebuild the canonical expectation and require exact equality or an exact canonical digest match.

#### Scenario: Genuine digest accompanies changed invariants
- **WHEN** a genuine extraction digest is copied onto an expectation whose invariant definitions differ from the canonical recipe output
- **THEN** resolution refuses it as non-authoritative

### Requirement: Recipe and target authority is closed

Authoritative derivation SHALL resolve recipes by unique identity from the approved registry, reject duplicate target mappings, and require exact repo/target/schema/recipe coherence. Arbitrary structurally valid recipes SHALL remain synthetic-only.

#### Scenario: Caller changes the recipe blueprint
- **WHEN** a caller supplies a recipe with an approved target but altered expectation ID or field paths
- **THEN** it cannot produce a real-authority derivation record

### Requirement: Collection admission is derivation-bound

Collection-wide expectations SHALL be rebuilt only from a verified canonical historical derivation and the fixed target-to-collection mapping. The transform SHALL bind its complete output and SHALL NOT trust caller-provided historical invariants or free structural derived records.

#### Scenario: Structural historical record carries extra semantics
- **WHEN** a caller constructs a derived record with a genuine digest and a noncanonical valid invariant
- **THEN** collection admission refuses rather than promotes that invariant

### Requirement: Synthetic derivation is non-promotable

Synthetic fixtures and annotation adapters SHALL use an explicit non-promotable interface and SHALL NOT mint real-source derivation records or satisfy contained-DEV preflight.

#### Scenario: Synthetic expectation is relabeled with current source
- **WHEN** a synthetic expectation receives a real repo, SHA, derivation version, and genuine digest
- **THEN** it remains synthetic and cannot resolve as authoritative

### Requirement: Expectation authority has adversarial proof

Tests SHALL preserve genuine source evidence while independently mutating expectation ID, target, provenance, projection limits, invariants, recipe identity, collection transform, ordering, and duplicate mappings.

#### Scenario: Full-expectation comparison is removed
- **WHEN** mutation leaves only source-digest comparison in the resolver
- **THEN** the coherent-forgery suite fails
