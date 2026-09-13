# deployment-fact-binding Specification

## Purpose

Nightwatch knows 1,851 operations and, for almost all of them, has no recorded answer to "where does this run". The absence is not marked as an absence: the field simply is not there, so nothing distinguishes an operation whose deployment was investigated and found unknowable from one nobody looked at.

## Requirements
### Requirement: every operation carries a binding record

Every operation SHALL carry a binding record.

#### Scenario: a new operation appears
- **WHEN** the source population gains an operation
- **THEN** it SHALL receive a deployment-binding record, and a missing record SHALL fail validation as a count mismatch rather than be absent silently

#### Scenario: an operation cannot carry the binding
- **WHEN** an operation's shape cannot express a route → endpoint chain
- **THEN** its state SHALL be `UNSUPPORTED` with a reason, never an empty field

### Requirement: the binding names which hop is missing

The binding SHALL name which hop is missing.

#### Scenario: an early hop is established and a later one is not
- **WHEN** route → host is established but host → service is not
- **THEN** the state SHALL be `PARTIAL`, and the record SHALL name the unestablished hop and its reason

### Requirement: DEPLOYMENT_FACT requires deployment evidence

`DEPLOYMENT_FACT` SHALL require deployment evidence.

#### Scenario: client configuration is offered as a deployment fact
- **WHEN** a route → host binding derives from committed client configuration
- **THEN** its category SHALL be `SOURCE_FACT` and SHALL NOT be `DEPLOYMENT_FACT`

#### Scenario: names or prefixes are offered as evidence
- **WHEN** a binding would derive from service-name similarity, route-prefix similarity, a guessed hostname, historical familiarity, or a document describing an expected architecture
- **THEN** validation SHALL fail

#### Scenario: build exclusion
- **WHEN** a service is excluded from the build on a branch naming an environment
- **THEN** a NEGATIVE `DEPLOYMENT_FACT` MAY be recorded for that environment

#### Scenario: build non-exclusion
- **WHEN** a service is not excluded
- **THEN** deployment SHALL remain UNKNOWN, because non-exclusion establishes eligibility rather than deployment

### Requirement: U-1 and U-2 are explicit unknowns

U-1 and U-2 SHALL be explicit unknowns.

#### Scenario: the deployment manifests are unavailable
- **WHEN** the `mochi` manifests cannot be read through existing authorized access
- **THEN** U-1 and U-2 SHALL be recorded as UNKNOWN carrying `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`, and SHALL NOT be inferred from any other source

#### Scenario: a named service is absent from source
- **WHEN** a service U-2 asks about is absent from the repository
- **THEN** that absence SHALL be recorded as a `SOURCE_FACT` constraint and SHALL NOT resolve U-2

### Requirement: evidence currentness

Evidence currentness SHALL be maintained.

#### Scenario: a deployment artifact changes
- **WHEN** the digest of an evidence artifact no longer matches the recorded one
- **THEN** the binding SHALL become `STALE` and SHALL NOT be silently rebound

### Requirement: a binding grants no authority

A binding SHALL grant no authority.

#### Scenario: a request-authority surface consults the binding
- **WHEN** any surface that decides whether a request may be issued imports the binding module
- **THEN** validation SHALL fail

### Requirement: joins never strengthen

A join SHALL never strengthen.

#### Scenario: an inference is joined to a deployment fact
- **WHEN** a binding joins inputs of differing categories
- **THEN** the result SHALL be no stronger than its weakest input

