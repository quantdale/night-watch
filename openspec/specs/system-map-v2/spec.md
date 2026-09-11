# system-map-v2 Specification

## Purpose
TBD - created by archiving change nightwatch-system-map-v2-c15b-v1. Update Purpose after archive.
## Requirements
### Requirement: one fact category per element
Every node and edge SHALL carry exactly one fact category and SHALL NOT be
rendered as a generic state when the category is distinguishable.

#### Scenario: an inference is not a fact
- **WHEN** a C-04 consumer edge is classed `INFERENCE`
- **THEN** the graph element carries `INFERENCE`, not `SOURCE_FACT`.

### Requirement: joins never strengthen
A joined element SHALL carry the weaker of its inputs' categories.

#### Scenario: a proven consumer edge meets a weaker backend fact
- **WHEN** the backend fact is weaker than the consumer edge
- **THEN** the joined element carries the backend's weaker category.

### Requirement: exact projection bounds
Every projection that can drop data SHALL report limit, total, projected,
dropped, truncated and remainingUnknown.

#### Scenario: a projection drops nodes
- **WHEN** more nodes exist than the limit permits
- **THEN** `dropped` is the exact count and `truncated` is true.

#### Scenario: the total is unknowable
- **WHEN** the upstream population is itself truncated
- **THEN** `total` is null and `remainingUnknown` is true.

### Requirement: deterministic layout identity
The layout identity SHALL bind the graph digest, engine identity and version,
options and projection version, and SHALL exclude timing.

#### Scenario: the same graph twice
- **WHEN** one projection is laid out twice
- **THEN** the layout bytes and digest are identical.

#### Scenario: an option changes
- **WHEN** a layout option changes
- **THEN** the digest changes.

### Requirement: empty is not unmeasured
A query with zero results SHALL be distinguishable from an unmeasured one.

#### Scenario: production paths before C-12
- **WHEN** observed production paths are requested
- **THEN** the result is empty AND marked as measured-zero or unmeasured
  explicitly, and never implies that production was observed.

### Requirement: the Control Center remains observational
The Control Center SHALL remain GET/HEAD only with `executionAuthority: NONE`.

#### Scenario: a non-GET request
- **WHEN** any non-GET/HEAD method reaches a Control Center route
- **THEN** the response is 405.

