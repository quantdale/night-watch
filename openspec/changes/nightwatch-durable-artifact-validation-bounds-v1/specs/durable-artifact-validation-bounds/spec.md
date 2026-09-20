## ADDED Requirements

### Requirement: Validation work is bounded before deep traversal

The artifact facade SHALL enforce finite byte, node, depth, key, string, array, and aggregate-work limits before invoking a leaf validator.

#### Scenario: Minimization record contains a million evaluations
- **WHEN** an oversized record is presented
- **THEN** validation refuses with a stable resource-bound code without iterating the full collection

#### Scenario: Payload is cyclic or accessor-backed
- **WHEN** the input is not a finite plain-data graph
- **THEN** preflight refuses without invoking getters or recursing indefinitely

### Requirement: Every artifact kind has aligned producer and parser maxima

A single registry SHALL declare each artifact kind's semantic collection/count bounds, and tests SHALL prove current producers cannot emit a record their parser rejects.

#### Scenario: Producer maximum changes
- **WHEN** a producer bound changes without the registry/parser contract
- **THEN** compatibility validation fails

### Requirement: Validation errors are categorical and privacy-safe

Every facade failure SHALL use a closed stable code plus bounded screened detail. Raw leaf messages, paths, stacks, object keys, or values SHALL NOT escape.

#### Scenario: Leaf validator throws a private path
- **WHEN** a validator throws an arbitrary host message
- **THEN** the facade returns a generic categorical failure without the message

### Requirement: Batch validation reports completeness

Batch validators SHALL return inspected and omitted counts plus a closed completeness state. Budget exhaustion SHALL yield INCOMPLETE, never valid/clean.

#### Scenario: Batch exceeds its item budget
- **WHEN** more artifacts are supplied than may be inspected
- **THEN** omitted items are counted and the batch cannot certify complete success

### Requirement: Bounds have adversarial proof

Tests SHALL cover each exact boundary, one-over cases, nested arrays/objects, long strings, cycles, accessors, exotic prototypes, malicious errors, and mutations removing every guard.

#### Scenario: Depth check is removed
- **WHEN** a mutation disables nesting admission
- **THEN** the adversarial validation suite fails
