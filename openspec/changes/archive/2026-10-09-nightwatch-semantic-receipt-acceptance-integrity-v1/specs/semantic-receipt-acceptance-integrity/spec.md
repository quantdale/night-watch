## ADDED Requirements

### Requirement: Semantic receipts have one exact authoritative parser

Every authoritative reader SHALL require a plain exact bounded record, validate nested source provenance and collections, and recompute the receipt identity from canonical fields. Direct, DTO, artifact, lifecycle, summary, and acceptance paths SHALL use the same parser strength.

#### Scenario: Receipt fields change while the ID is retained
- **WHEN** an otherwise valid receipt is modified without recomputing its identity
- **THEN** every authoritative reader refuses it

### Requirement: Receipt outcomes obey a total coherence matrix

Each outcome SHALL have exact permitted and required expectation, provenance, projection, invariant, finding, and coverage facts. Coverage state/counters and outcome SHALL agree bidirectionally.

#### Scenario: PASS carries violation coverage
- **WHEN** a PASS receipt reports `coverageState: VIOLATION` or a positive violating-item count
- **THEN** validation refuses it

#### Scenario: ANOMALY has no invariant violation
- **WHEN** an ANOMALY receipt has a positive finding count but zero violated invariants without a defined non-invariant anomaly class
- **THEN** validation refuses it

### Requirement: Contained evidence is producer-bound

`CONTAINED_DEV` SHALL be issued only by the gated contained observation producer and SHALL bind the exact run, context, request, source transaction, and observation generation. General receipt construction SHALL emit only `LOCAL_SYNTHETIC`.

#### Scenario: Caller selects contained class
- **WHEN** ordinary code passes `acceptanceClass: CONTAINED_DEV` to a public builder or hook
- **THEN** it cannot mint authoritative contained evidence

### Requirement: Acceptance evidence cannot be composed across receipts

Before summarization, every receipt and finding SHALL validate and every decisive member SHALL share the exact target, expectation, source repo/SHA/evidence digest, acceptance class, and producer generation required by the gate. Identity, decisiveness, and findings SHALL NOT be sourced from different incompatible members.

#### Scenario: First receipt supplies identity and second supplies PASS
- **WHEN** two target-matching receipts use different expectation/source generations and only the second is decisive
- **THEN** the set is incoherent and contained acceptance fails

### Requirement: Semantic findings have exact canonical identity

Every artifact, campaign, summary, dossier, and acceptance reader SHALL exact-validate bounded finding fields and nested provenance and SHALL recompute `findingId` from the canonical fingerprint and projection digests.

#### Scenario: Finding fields change while ID is retained
- **WHEN** expectation, provenance, class, relation, or projection digest changes without recomputing the finding identity
- **THEN** every authoritative reader refuses the finding

### Requirement: Dossier evidence is a canonical finding projection

Dossier construction SHALL validate every input finding before projection. Dossier parsing SHALL require exact bounded summaries and SHALL recompute count, unique categories, ordering, and source/expectation coherence from the finding set required by the consuming receipt generation.

#### Scenario: Dossier categories omit a finding category
- **WHEN** the summaries contain a category absent from the dossier category list
- **THEN** dossier validation refuses the record

### Requirement: Acceptance rejects incomplete ledgers

Overflow, invalid members, missing producer generations, finding/receipt disagreement, and mixed historical/current schemas SHALL produce explicit non-acceptance rather than a partial summary that can pass.

#### Scenario: Invalid receipt is outside the selected first position
- **WHEN** any receipt in the acceptance evidence set is invalid or producer-unbound
- **THEN** summarization refuses the set regardless of ordering

### Requirement: Historical readability does not grant current authority

Historical v1 and legacy producer-unbound v2 receipts MAY remain readable for owner-local history but SHALL NOT satisfy current contained-DEV acceptance.

#### Scenario: Read-compatible v1 receipt claims a pass
- **WHEN** a valid historical v1 PASS is presented to the current DEV acceptance gate
- **THEN** it is classified historical/non-authoritative and cannot satisfy acceptance

### Requirement: Receipt acceptance integrity has adversarial proof

Tests SHALL cover unknown/accessor/exotic fields, nested provenance mutations, identity resealing, every outcome/coverage pairing, class upgrades, mixed generations, ordering, overflow, and finding mismatch.

#### Scenario: Summary validation is bypassed
- **WHEN** mutation lets a typed but unparsed receipt enter acceptance summarization
- **THEN** the focused acceptance-integrity suite fails
