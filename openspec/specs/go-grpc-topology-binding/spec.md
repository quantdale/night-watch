# go-grpc-topology-binding Specification

## Purpose

Nightwatch can now read 590 protobuf RPCs and it admits 2,300 Go files, and it cannot say which Go process serves which proto service. The System Map needs that edge, C-06 wants a Go effect witness, and C-15b cannot draw a service without it.

## Requirements
### Requirement: mechanically proven service binding
The system SHALL bind a proto service to a Go registration as `SOURCE_FACT`
only when the registration symbol and the resolved import path both agree with
the proto service and its `go_package`.

#### Scenario: a proven binding
- **WHEN** `services/billingd/main.go` calls `billing.RegisterBillingServer`
  and `billing` resolves to `github.com/alphauslabs/blueapi/billing`
- **THEN** the join state is `PROVEN`.

#### Scenario: symbol agrees but package does not
- **WHEN** a registration names `RegisterBillingServer` through a package that
  is not the proto's `go_package`
- **THEN** the join is not `PROVEN`.

### Requirement: test files never become topology facts
The system SHALL exclude `_test.go` files from topology facts.

#### Scenario: a registration in a test file
- **WHEN** `pkg/exportcostfilters/sync_test.go` registers a stub Cost server
- **THEN** no topology fact is emitted for it.

### Requirement: comments and strings never become topology facts
The system SHALL derive no registration from a comment or a string literal.

#### Scenario: a commented registration
- **WHEN** a registration call appears in a `//` or `/* */` comment
- **THEN** no topology fact is emitted.

### Requirement: ambiguity fails closed
The system SHALL emit an explicit non-proven state rather than selecting a best
candidate.

#### Scenario: an unresolvable package qualifier
- **WHEN** the qualifier cannot be resolved through the file's import block
- **THEN** the join state is `AMBIGUOUS`.

#### Scenario: a service with no proto in the approved universe
- **WHEN** `RegisterMetricsControlPlaneServer` is observed and no such proto
  service is readable
- **THEN** the join state is `UNSUPPORTED`, not `MISSING`.

### Requirement: completeness truth
The system SHALL keep positive facts separate from repository completeness, and
SHALL NOT derive a negative fact from absence while enumeration is TRUNCATED.

#### Scenario: an unobserved daemon
- **WHEN** a daemon's file was never enumerated
- **THEN** it is reported `TRUNCATED_ENUMERATION`, never `MISSING`.

### Requirement: no repository admission
The system SHALL admit no new repository, and `MAX_SIBLING_SOURCE_SCAN_FILES`
SHALL be unchanged.

#### Scenario: the universe is unchanged
- **WHEN** the approved repository set is inspected
- **THEN** it holds the same six repositories, and `blueinternal` and
  `wave-api` are absent.

