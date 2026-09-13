# p1-observation-scope Specification

## Purpose

The P1 observer SHALL admit an observation session only through the versioned named chain `nightwatch.p1-observation-scope.v1`, evaluating every gate in order over explicitly injected facts, stopping at the first denial with later gates `NOT_EVALUATED`, and emitting only gate-owned categorical denial codes.

## Requirements
### Requirement: observation-scope admission

The P1 observer SHALL admit an observation session only through the versioned
named chain `nightwatch.p1-observation-scope.v1`, evaluating every gate in
order over explicitly injected facts, stopping at the first denial with later
gates `NOT_EVALUATED`, and emitting only gate-owned categorical denial codes.

#### Scenario: a gate denies admission

- **WHEN** a gate in `nightwatch.p1-observation-scope.v1` denies during in-order evaluation
- **THEN** evaluation SHALL stop at the first denial with later gates `NOT_EVALUATED`, and only gate-owned categorical denial codes SHALL be emitted

### Requirement: operator-supplied subject

The observer SHALL NOT create authenticated production state. Admission SHALL
require an operator-supplied already-existing subject descriptor with
unambiguous provenance; a missing, ambiguous, or out-of-scope subject SHALL
deny admission before any observation exists.

#### Scenario: the subject is missing, ambiguous, or out of scope

- **WHEN** the subject descriptor is missing, ambiguous, or out of scope
- **THEN** admission SHALL deny before any observation exists, and the observer SHALL NOT create authenticated production state

### Requirement: attributable-traffic accounting

Every observed request SHALL be classified `OPERATOR_PREEXISTING`,
`APPLICATION_AUTONOMOUS`, `NIGHTWATCH_ATTRIBUTABLE`, or `UNKNOWN` from
mechanical evidence. A session SHALL reach `PASSIVE_OBSERVATION_COMPLETE`
only with at least one qualifying observation, zero
`NIGHTWATCH_ATTRIBUTABLE`, and zero `UNKNOWN`. Zero samples SHALL NOT pass.

#### Scenario: observed requests are classified

- **WHEN** an observed request is classified from mechanical evidence
- **THEN** it SHALL be `OPERATOR_PREEXISTING`, `APPLICATION_AUTONOMOUS`, `NIGHTWATCH_ATTRIBUTABLE`, or `UNKNOWN`, and a session SHALL reach `PASSIVE_OBSERVATION_COMPLETE` only with at least one qualifying observation, zero `NIGHTWATCH_ATTRIBUTABLE`, and zero `UNKNOWN`, while zero samples SHALL NOT pass

### Requirement: passive capability cone

P1 observer source SHALL NOT import active production execution, replay
execution, DEV/NEXT campaign execution, navigation, fetch/XHR, click/type/
submit actuation, authenticated-state creation, or network/process
capability. Violation SHALL fail hardening.

#### Scenario: the P1 observer cone gains forbidden capability

- **WHEN** P1 observer source imports active production execution, replay execution, DEV/NEXT campaign execution, navigation, fetch/XHR, click/type/submit actuation, authenticated-state creation, or network/process capability
- **THEN** hardening SHALL fail

### Requirement: bounded, private, killable observation

Observation SHALL run inside an explicit bounded window with a monotonic
deadline, project through a production-cone privacy policy before any
evidence persists, write only to the private production evidence root, and
terminate promptly on kill-switch engagement or window expiry. Interrupted
state SHALL NOT resume on stale authority.

#### Scenario: the window expires or the kill switch engages

- **WHEN** the bounded window expires or the kill switch engages
- **THEN** observation SHALL terminate promptly, and interrupted state SHALL NOT resume on stale authority

