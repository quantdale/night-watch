## ADDED Requirements

### Requirement: Current gap census is lossless

Every current graph gap SHALL have exactly one current ledger record. New gaps SHALL be added, duplicate/colliding gaps SHALL fail closed, and historical records SHALL NOT replace the current census.

#### Scenario: Rebuild introduces a new gap
- **WHEN** the current graph contains a gap absent from the baseline
- **THEN** the rebuilt ledger includes it as a current record

### Requirement: Closure transitions require verified evidence

`CLOSED`, `MERGED_REDUNDANT`, and `OBSOLETE_AFTER_GRAPH_REBUILD` SHALL require a typed validated receipt proving the relevant transition. Caller-selected status and self-hashed labels SHALL NOT confer closure.

#### Scenario: Caller overrides a gap to closed
- **WHEN** no producer receipt proves the required capability or graph transition
- **THEN** the gap remains open/ineligible and cannot be counted closed

### Requirement: Rebuild identity is collision-safe

Gap matching SHALL use a stable unique identity that preserves occurrence and graph/producer generation. Lossy contract/class/reason keys and last-writer-wins maps SHALL be rejected.

#### Scenario: Two current gaps share contract class and reason
- **WHEN** their distinct occurrences would collide under the old composite key
- **THEN** both remain distinct or rebuild fails closed

### Requirement: Ledger counts conserve one population

Total, actionable, closed, irreducible, remaining, status, class, and reason counts SHALL be recomputed from the same exact current-record population and SHALL satisfy declared conservation equations.

#### Scenario: Graph length disagrees with ledger records
- **WHEN** a summary count cannot be derived from the emitted current records
- **THEN** ledger construction fails rather than publishing inconsistent totals

### Requirement: Surface cardinality is globally unique

Differential eligibility SHALL count the union of approved observation surfaces across all bindings for one contract. Repeated references to one surface SHALL count once.

#### Scenario: Two projections both name API
- **WHEN** a contract has two bindings but only the API surface
- **THEN** it retains `SINGLE_SURFACE` and is not differential-eligible

### Requirement: Gap-ledger integrity has adversarial proof

Tests SHALL cover additions, removals, collisions, reorderings, forged status/evidence, mixed generations, duplicate surfaces, and every count invariant.

#### Scenario: Baseline-only rebuild loop is restored
- **WHEN** mutation omits newly added current gaps
- **THEN** the focused ledger-integrity suite fails
