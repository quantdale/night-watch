## ADDED Requirements

### Requirement: Context independence is attested, not labeled

Every observation eligible for replay admission SHALL carry a validated context-generation attestation minted by the browser/context authority and bound to the exact run bundle, contract/source, environment/target, auth, browser/runtime, and proxy generations. `runId` and `contextKind` text SHALL NOT establish independence.

#### Scenario: Three run IDs reuse one context
- **WHEN** three observations have distinct run IDs but the same context generation
- **THEN** they count as one context and cannot reach L1 or L2

#### Scenario: Caller forges a context label
- **WHEN** an observation changes `contextKind` without a matching attestation
- **THEN** strict validation rejects it before admission

### Requirement: Admission roles and cardinality are ordered

The system SHALL require one baseline FIRST observation, one distinct proven `FRESH_CONTEXT_REPLAY` for L1, and one further distinct proven `BOUNDED_REPETITION` for L2. Every member SHALL match the frozen anomaly, contract, source, environment, auth, browser/runtime, and proxy bindings.

#### Scenario: All observations claim FIRST
- **WHEN** three independent contexts are all labeled `FIRST_OBSERVATION`
- **THEN** the baseline may be recorded but no replay level is granted

#### Scenario: Role sequence is valid
- **WHEN** FIRST, fresh replay, and bounded repetition use three distinct valid generations under identical bindings and exact evidence matches
- **THEN** admission may advance deterministically to L2

### Requirement: Current replay matching requires complete evidence

Each current replay version SHALL declare a closed mandatory comparison profile. Both sides SHALL provide valid capture/settlement, semantic, oracle, resource, safety, containment, privacy, context, contract/source, and bounded-variance evidence. Missing, unknown, overflowed, incompatible, or malformed required channels SHALL be a capture/schema defect and SHALL NOT be `MATCH` or PASS.

#### Scenario: Both records omit semantic requests
- **WHEN** a current comparison receives two otherwise equal records missing the semantic request ledger
- **THEN** it returns a non-promotable evidence-incomplete result rather than treating absence as equality

#### Scenario: Capture status is unknown
- **WHEN** either side lacks complete capture and settled observation proof
- **THEN** replay is non-match and admission cannot advance

### Requirement: Historical evidence cannot acquire current authority

Historical/legacy records SHALL remain readable only under their exact historical schema and SHALL be explicitly non-promotable when current mandatory proof is absent. Translation SHALL not invent context attestations or omitted evidence.

#### Scenario: Legacy passed record is loaded
- **WHEN** a historical record contains `passed: true` but lacks current channels
- **THEN** it may be displayed as historical evidence but cannot satisfy current replay or admission

### Requirement: Producers and consumers preserve exact binding

Manual harnesses, campaign orchestration, artifact validators, and promotion consumers SHALL use the validated attestation and comparison result without reconstructing roles from booleans or trusting caller labels. Unknown or mismatched bindings SHALL fail closed.

#### Scenario: Campaign maps a reproduced boolean to context kind
- **WHEN** a producer attempts to infer context role from a general reproduction flag
- **THEN** validation refuses the observation without the exact minted role/generation proof

### Requirement: Negative and mutation proof is non-vacuous

Tests SHALL drop each mandatory field, duplicate/relabel roles, reuse generations, vary every binding, mix versions, reorder observations, inject ledger overflow/unknown settlement, and mutate consumers to ignore attestations. Each case SHALL prevent promotion.

#### Scenario: Context-kind check is removed
- **WHEN** a mutation ignores ordered role validation
- **THEN** the wrong-kind corpus fails the focused admission suite
