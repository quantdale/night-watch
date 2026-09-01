# Requirements — Coverage ledgers and read-only proof

Planning-only requirement delta. Nothing below is authorized for
implementation.

## ADDED Requirements

### Requirement: Read-only status is a mechanically proven two-witness property
An operation SHALL be `READ_ONLY_PROVEN` only when at least two independent
`SOURCE_FACT` witnesses of different kinds agree. Witness kinds are
`W-DECLARED_VERB` (protobuf `google.api.http` `get` binding with no body),
`W-DECLARED_ROUTE` (declared HTTP method in a route table),
`W-EFFECT_CLOSURE` (bounded, fully resolved call closure containing no
identifier in the versioned write vocabulary and no write-authorization check),
`W-EFFECT_RPC` (equivalent for a gRPC handler) and `W-SPEC` (an admitted
product-specification requirement asserting the read-only property). A single
witness SHALL yield `READ_ONLY_SINGLE_WITNESS`, which is DEV-executable only.
Membership in a hand-authored operation catalog SHALL NOT be a witness.

#### Scenario: A method declaration alone is not a proof
- **WHEN** only `W-DECLARED_VERB` or only `W-DECLARED_ROUTE` holds
- **THEN** the classification SHALL be `READ_ONLY_SINGLE_WITNESS`

#### Scenario: Any unresolved callee defeats the effect closure
- **WHEN** a handler's bounded call closure contains a dynamic dispatch, an unresolved callee, an unclassified identifier, or exceeds the depth bound
- **THEN** the effect-closure witness SHALL fail and the classification SHALL NOT be `READ_ONLY_PROVEN`

#### Scenario: A write-vocabulary hit is terminal
- **WHEN** a handler's closure calls any identifier in the write vocabulary
- **THEN** the operation SHALL be `MUTATION_CAPABLE` and SHALL never be re-classified without a fresh derivation at a new source SHA

#### Scenario: Runtime evidence corroborates but never establishes
- **WHEN** runtime observation is consistent with a read-only classification
- **THEN** the classification MAY advance to `READ_ONLY_CORROBORATED`
- **AND** runtime observation alone SHALL never produce `READ_ONLY_PROVEN`

### Requirement: The write vocabulary is data-only, versioned and complete-or-ambiguous
The write vocabulary MUST be a versioned, digest-bound, owner-reviewed data
list. Any callee identifier in an analysed repository that the vocabulary
classifies neither as read nor as write SHALL make the closure `AMBIGUOUS`.
Vocabulary classification coverage MUST be measured and reported.

#### Scenario: Removing a write name does not create a proof
- **WHEN** a known write identifier is removed from the vocabulary
- **THEN** affected closures SHALL become `AMBIGUOUS`, never `READ_ONLY_PROVEN`

### Requirement: Coverage is reported as two ledgers with five buckets per dimension
The system MUST emit a System Coverage Ledger and a Production Coverage Ledger.
Every dimension MUST report `proven`, `unproven`, `unsupported`, `truncated`
and `unknown`. Coverage MUST be reported per repository and per language. A
single global percentage SHALL NOT be emitted. An unmeasured dimension SHALL be
`UNMEASURED`, never `0 %`.

#### Scenario: Truncation invalidates completeness
- **WHEN** any dimension reports `truncated > 0`
- **THEN** no completeness claim SHALL be made for that dimension
- **AND** any promotion gate depending on it SHALL fail

#### Scenario: Aggregates cannot hide an empty repository
- **WHEN** a repository in the approved universe produces zero operations
- **THEN** the ledger SHALL show that repository's zero explicitly rather than only an aggregate

### Requirement: Census figures have exactly one writer
Durable documentation MUST NOT restate census figures that the current ledger
does not produce. The ledger SHALL be the only source of those figures.

#### Scenario: A stale figure fails the gate
- **WHEN** a durable document contains a census figure that differs from the current ledger
- **THEN** the quality gate SHALL fail with a categorical mismatch reason

### Requirement: Target selection is prioritized by expected information gain
Campaign target selection MUST score admissible surfaces by novelty, contract
depth, change recency, blast radius, cost and duplicate risk, and MUST NOT
maximize request volume. Change intelligence MUST be an input to the score.

#### Scenario: A broad shallow sweep loses to a deep new-contract pass
- **WHEN** two plans have equal budget, one covering many already-observed surfaces and one covering fewer surfaces with newly proven deep contracts
- **THEN** the deep plan SHALL score higher

#### Scenario: A duplicate fingerprint is de-prioritized
- **WHEN** a surface's prior observations already produced a clustered fingerprint
- **THEN** its duplicate risk SHALL reduce its score
