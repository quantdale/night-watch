# expected-information-gain Specification

## Purpose
TBD - created by archiving change nightwatch-eig-prioritization-c16-v1. Update Purpose after archive.
## Requirements
### Requirement: a ranking grants no authority

A ranking SHALL grant no authority.

#### Scenario: a target ranks first
- **WHEN** a target receives the highest expected-information-gain score
- **THEN** it SHALL gain no admission, execution, replay, credential or environment authority, and the projection SHALL state that it grants none

#### Scenario: a request-authority surface consults the ranking
- **WHEN** any surface that decides whether a request may be issued imports the ranking module
- **THEN** validation SHALL fail

### Requirement: an unknown factor is safe

An unknown factor SHALL be safe.

#### Scenario: a factor value is unknown
- **WHEN** a factor cannot be established
- **THEN** it SHALL take an explicit `UNKNOWN` level strictly between that factor's minimum and maximum, and SHALL NOT take zero or the maximum

#### Scenario: a numerator factor would be zero
- **WHEN** a level in a numerator factor is zero
- **THEN** validation SHALL fail, because a zero eliminates the target entirely

### Requirement: the ranking is deterministic and total

The ranking SHALL be deterministic and total.

#### Scenario: the same inputs are ranked twice
- **WHEN** the same targets are ranked in a different input order
- **THEN** the resulting ranking SHALL be identical, including the order of tied entries

#### Scenario: two targets score equally
- **WHEN** two targets have equal scores
- **THEN** they SHALL be ordered by a stable key so the ranking is a total order

#### Scenario: ordering is computed
- **WHEN** two scores are compared
- **THEN** the comparison SHALL use exact integer arithmetic and SHALL NOT depend on floating-point division

### Requirement: recency comes from proven change evidence

Recency SHALL come from proven change evidence.

#### Scenario: no change intelligence exists for a target
- **WHEN** the source-snapshot diff says nothing about a target
- **THEN** `change_recency` SHALL be `UNKNOWN`, and elapsed wall-clock time SHALL NOT be consulted

### Requirement: the ranking is explainable and bounded

The ranking SHALL be explainable and bounded.

#### Scenario: an entry is inspected
- **WHEN** a ranked entry is read
- **THEN** it SHALL carry its resolved factor levels and its reason codes, and its score SHALL be recomputable from them

#### Scenario: more targets than the limit
- **WHEN** the considered set exceeds the limit
- **THEN** the result SHALL report the limit, the dropped count and its truncation, and an incomplete considered set SHALL report an unknown total rather than a number

### Requirement: one derived figure source

There SHALL be exactly one derived figure source.

#### Scenario: a document states a census figure the ledger does not carry
- **WHEN** a policed document tags a census figure whose value differs from the ledger
- **THEN** the check SHALL fail naming the document, line, measure, stated value and ledger value

#### Scenario: a document names an unknown measure
- **WHEN** a tagged figure names a measure the ledger does not define
- **THEN** the check SHALL fail rather than ignore it

#### Scenario: a superseded figure is retired
- **WHEN** a figure is marked with the explicit historical marker
- **THEN** it SHALL be exempt, so history is retired rather than deleted

#### Scenario: ordinary prose resembles a historical marker
- **WHEN** a line contains words like "was" or "previously" but no explicit marker
- **THEN** the exemption SHALL NOT apply

