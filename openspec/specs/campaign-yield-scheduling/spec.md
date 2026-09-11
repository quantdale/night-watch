# campaign-yield-scheduling Specification

## Purpose
TBD - created by archiving change nightwatch-reliability-yield-and-state-protocol-v1. Update Purpose after archive.
## Requirements
### Requirement: Campaign prioritization uses explainable mechanical inputs

The campaign planner SHALL compute a versioned deterministic score only from
bounded source/proof/currentness, semantic-contract, relation, change,
history, replay, cost, redundancy, and diversity metadata. Hard safety,
owner, freshness, and eligibility gates SHALL run before scoring.

#### Scenario: Ineligible work cannot win on score
- **WHEN** a candidate is stale, unsafe, owner-blocked, or not mechanically eligible
- **THEN** it is excluded before score comparison regardless of its numeric inputs

#### Scenario: Score explains its selection
- **WHEN** an eligible candidate is selected
- **THEN** its bounded score components and reason codes identify the mechanical factors that contributed

### Requirement: Selection is deterministic and diversity-aware

Campaign generation SHALL use stable tie-breakers, bounded per-dimension
diversity controls, and deterministic redundancy handling across repository,
route family, entity type, semantic invariant, journey type, interface, and
source-change cluster dimensions.

#### Scenario: Same inputs produce same plan
- **WHEN** the planner runs three times with the same eligible inventory and budget
- **THEN** the selected IDs, order, score reasons, and plan digest are identical

#### Scenario: Equivalent duplicate candidates do not consume separate slots
- **WHEN** two candidates have the same semantic surface and normalized journey dimensions
- **THEN** the planner applies its redundancy policy and does not disguise them as independent diversity

#### Scenario: Valid dimensions are not starved
- **WHEN** multiple eligible dimensions fit the bounded budget
- **THEN** selection includes the highest-value available representative for each required diversity dimension before filling redundant slots

### Requirement: Yield attribution measures useful work without weakening proof

The campaign SHALL report coverage, executed work, semantic/protocol detections,
replay confidence, minimization status, false-positive controls, and stable
cluster outcomes separately; additional test volume alone SHALL NOT be
reported as increased bug yield.

#### Scenario: More candidates without detections is not a yield increase
- **WHEN** a plan executes more candidates but produces no additional stable detections or coverage quality
- **THEN** the yield report records increased volume only and does not claim improved useful yield

#### Scenario: Existing proof coverage is scheduled more effectively
- **WHEN** a higher-density eligible surface is selected over a redundant low-density surface
- **THEN** the report attributes the change to mechanical selection and preserves the same proof authority

### Requirement: Finding clusters are stable and conservative

Repeated observations of one anomaly SHALL converge on one deterministic
cluster identity based on stable sanitized behavior, oracle, semantic, and
source identity. Campaign/context/timing variation SHALL remain occurrence
metadata, while meaningful semantic changes SHALL remain separable.

#### Scenario: Same anomaly across campaigns deduplicates
- **WHEN** the same sanitized anomaly is observed in multiple campaigns
- **THEN** one cluster identity is retained and occurrence count increases predictably

#### Scenario: Irrelevant timing/payload variation does not split
- **WHEN** only approved irrelevant timing or payload-shape metadata varies
- **THEN** the cluster identity remains unchanged

#### Scenario: Different semantic contract does not merge
- **WHEN** the same endpoint shape fails a different semantic contract or meaningful oracle
- **THEN** the finding is assigned a distinct cluster identity

### Requirement: False-positive controls remain explicit

Every new scheduling, replay, clustering, or semantic integration path SHALL
retain benign controls for ordering, optional/nullable fields, empty results,
polling, redirects, pagination, and equivalent representations, and SHALL
report their quality-floor results separately from detections.

#### Scenario: Benign controls remain clean
- **WHEN** all bounded benign controls execute under the new planner and clusterer
- **THEN** they produce zero false-positive findings and do not alter safety counters

