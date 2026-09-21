## ADDED Requirements

### Requirement: Semantic comparison is completeness-aware

Recursive semantic comparison SHALL distinguish exact equality, observed difference, and incomplete evidence. A truncated descendant SHALL prevent exact equality unless a rule proves a decisive monotonic result.

#### Scenario: Equal inspected prefixes have unseen tails
- **WHEN** two arrays have equal inspected items but either array is truncated
- **THEN** comparison returns incomplete rather than equal

### Requirement: Collection-item results are totally aggregated

Collection-item evaluation SHALL account for every inspected item's PASS, VIOLATED, NOT_APPLICABLE, and INVALID_INPUT result. `FULLY_EVALUATED_PASS` SHALL require a complete collection and PASS for every item.

#### Scenario: Every item lacks the required field
- **WHEN** a type contract evaluates to NOT_APPLICABLE for each item
- **THEN** the collection contract cannot return PASS

### Requirement: Partial collections cannot prove absence

Uniqueness, pagination disjointness, subset, and related whole-population properties SHALL NOT pass from a truncated prefix. Observed duplicate/overlap violations MAY remain decisive when monotonicity is explicit.

#### Scenario: Visible pagination windows are disjoint but truncated
- **WHEN** both inspected prefixes have no overlap and at least one collection is truncated
- **THEN** the result is incomplete rather than PASS

### Requirement: Relations and differentials preserve incomplete evidence

State, surface, relational, differential, and metamorphic equality consumers SHALL propagate incomplete comparison rather than convert it to PASS, HOLDS, equivalent, or a definitive change.

#### Scenario: Differential singleton is truncated
- **WHEN** alignment observes one retained item but the source projection reports additional unseen items
- **THEN** the differential cannot certify semantic equivalence

### Requirement: Receipts and quality never upgrade incomplete results

Incomplete semantic evidence SHALL remain explicit through runner outcomes, receipts, coverage graphs, lifecycle reports, and quality levels. It SHALL NOT contribute to pass or high-confidence counts.

#### Scenario: Partial result reaches the quality builder
- **WHEN** a lifecycle row depends on an incomplete comparison
- **THEN** the quality report records a coverage gap rather than full lifecycle

### Requirement: Partial-observation soundness has adversarial proof

Tests SHALL cover missing item paths, nested truncation, equal prefixes, collisions beyond the prefix, monotonic visible violations, set relations, and all alignment rules.

#### Scenario: Boolean equality is restored
- **WHEN** mutation converts an incomplete comparison to `true`
- **THEN** the focused soundness suite fails
