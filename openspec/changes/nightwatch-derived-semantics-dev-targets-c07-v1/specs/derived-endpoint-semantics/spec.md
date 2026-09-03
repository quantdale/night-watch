# Spec — derived endpoint semantics and generated DEV targets

## ADDED Requirements

### Requirement: semantics are derived, never asserted

#### Scenario: an operation has only method evidence
- **WHEN** an operation's read-only classification is method-only, with no effect proof
- **THEN** its derived classification SHALL be `UNKNOWN`, and SHALL NOT be `KNOWN_READ`

#### Scenario: a conditional mutation
- **WHEN** a write is present but currently gated by a flag
- **THEN** the operation SHALL be `MUTATION_CAPABLE`, because a disabled write is not an absent one

#### Scenario: route identity is unproven
- **WHEN** the route-to-handler join is not `PROVEN`
- **THEN** the classification SHALL be `AMBIGUOUS`, whatever the effect evidence says

#### Scenario: an unrecognised input classification
- **WHEN** the source layer reports a classification this derivation does not know
- **THEN** the result SHALL be `AMBIGUOUS` and SHALL NOT fall through to a usable value

#### Scenario: a rule is written by hand
- **WHEN** a semantic rule is added without derivation evidence
- **THEN** it SHALL NOT be admitted to the registry

### Requirement: generation is not execution

#### Scenario: a target is generated
- **WHEN** a DEV target is generated
- **THEN** it SHALL carry no request authority, and eligibility SHALL come only from the existing admission chain

#### Scenario: the admission chain excludes an operation
- **WHEN** the existing chain does not admit an operation
- **THEN** the target SHALL be rejected regardless of its derived classification

#### Scenario: no target is eligible
- **WHEN** the admission chain admits nothing
- **THEN** the eligible count SHALL be reported as zero with per-reason counts, and no threshold SHALL be relaxed to produce targets

### Requirement: the funnel attributes every rejection

#### Scenario: the funnel is inspected
- **WHEN** the funnel is read
- **THEN** the per-reason counts SHALL sum to the rejected count, and eligible plus rejected SHALL equal considered

### Requirement: prioritisation cannot promote

#### Scenario: an inadmissible target would score highly
- **WHEN** an inadmissible target would receive a maximal expected-information-gain score
- **THEN** it SHALL NOT appear in any ranking
