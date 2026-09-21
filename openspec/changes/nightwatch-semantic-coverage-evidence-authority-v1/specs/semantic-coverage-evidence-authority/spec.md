## ADDED Requirements

### Requirement: Coverage inputs have one exact authority boundary

Candidate inventories, contracts, bindings, mutation measurements, lifecycle receipts, graphs, and quality reports SHALL be exact-validated and identity-recomputed before authoritative use. Unknown, duplicate, orphaned, stale, or incoherent members SHALL fail closed.

#### Scenario: Caller edits an admitted candidate
- **WHEN** a candidate's proof or shape changes while its retained digest is unchanged
- **THEN** coverage admission refuses the inventory

### Requirement: Booleans cannot grant lifecycle authority

`mechanicallyProven`, `supported`, `eligible`, `reproduces`, `minimized`, `explainable`, and similar booleans SHALL be derived summaries, not authority inputs. Each positive lifecycle edge SHALL cite a validated producer receipt.

#### Scenario: Binding claims replay support
- **WHEN** a structural binding sets `reproduces: true` without a bound replay receipt
- **THEN** graph and campaign coverage retain a replay gap

### Requirement: Replay and minimization are independently executed

Synthetic replay SHALL re-run the bounded evaluator against retained observations. Minimization SHALL probe candidate reductions by replaying and comparing canonical semantic finding and contract identity.

#### Scenario: Required ordinals are present but evaluator no longer reproduces
- **WHEN** a candidate sequence contains all declared ordinals but replay does not produce the same finding
- **THEN** minimization is not certified

### Requirement: Missing lifecycle evidence never self-certifies

Omitted or invalid lifecycle evidence SHALL yield unknown/false replay, minimization, stability, and confidence facts. Detection alone SHALL NOT imply later lifecycle stages.

#### Scenario: Measurement omits lifecycle rows
- **WHEN** a synthetic mutant is detected without replay/minimization evidence
- **THEN** it is counted as detected only, not replayed, minimized, or high-confidence

### Requirement: Coverage generations are non-composable

Candidate source evidence, contract definition, observation, replay, minimization, graph, campaign, and quality records SHALL share an exact validated generation. Facts from different generations SHALL NOT be combined into full coverage.

#### Scenario: Replay and minimization use different contract generations
- **WHEN** individually valid receipts refer to different contract digests
- **THEN** the aggregate remains incomplete

### Requirement: Coverage authority has adversarial proof

Tests SHALL cover field resealing, omitted evidence, duplicate IDs, last-writer ordering, stale source, mixed generations, fake replay, fake minimization, mutable cache returns, and every coverage promotion edge.

#### Scenario: Caller boolean promotion is restored
- **WHEN** mutation allows an unverified boolean to produce FULLY_COVERED
- **THEN** the focused authority suite fails
