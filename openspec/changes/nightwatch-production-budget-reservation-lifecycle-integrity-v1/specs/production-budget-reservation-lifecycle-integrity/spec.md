## ADDED Requirements

### Requirement: Reservations have exact ledger-bound identity

The production budget ledger SHALL mint each reservation as an exact runtime capability bound to its ledger, request, service, route, grant, decision snapshot, and lifecycle state. Structural copies or user-constructed values SHALL NOT carry authority.

#### Scenario: Foreign reservation reaches settlement
- **WHEN** a reservation from another ledger instance is supplied
- **THEN** settlement refuses and neither ledger changes counters

### Requirement: Reservation lifecycle is closed and one-way

A reservation SHALL transition only `RESERVED -> CANCELLED_BEFORE_DISPATCH` or `RESERVED -> DISPATCHED -> SETTLED`. Every transition SHALL be accepted at most once.

#### Scenario: Dispatched reservation settles twice
- **WHEN** the same reservation is settled a second time
- **THEN** the second call refuses without changing concurrency, quota, failure, or breaker state

#### Scenario: Cancelled reservation is later settled
- **WHEN** a pre-dispatch cancellation token is supplied as an outcome
- **THEN** settlement refuses without mutation

### Requirement: Every pre-dispatch exit releases concurrency

Every gate denial, grant race, validation failure, and thrown exception after reservation but before dispatch SHALL transition the reservation to `CANCELLED_BEFORE_DISPATCH` and free its in-flight slot.

#### Scenario: Circuit breaker denies after budget admission
- **WHEN** budget reservation succeeds and the later breaker denies
- **THEN** the route can accept a subsequent eligible request up to its configured concurrency limit

### Requirement: Quota charging is explicit and conserved

Request quota charge/refund policy SHALL be represented independently of concurrency occupancy and SHALL be applied exactly once for every terminal lifecycle.

#### Scenario: Final kill switch denies
- **WHEN** a reserved request does not dispatch because the final kill switch is active
- **THEN** its receipt states the configured quota disposition while in-flight occupancy is zero

### Requirement: Final dispatch admission is coherent

The exact grant consumption, final kill-switch decision, reservation, and request identity SHALL be bound before the observer callback begins. A race or mismatch SHALL cancel rather than dispatch.

#### Scenario: Grant is consumed by a competing request
- **WHEN** final one-shot consumption fails after reservation
- **THEN** no observer callback runs and the reservation is cancelled safely

### Requirement: Lifecycle accounting has adversarial proof

Tests SHALL cover every transition, denial gate, exception edge, cross-ledger/copy/replay attempt, and mutations that omit cleanup or relax exact identity.

#### Scenario: A denial cleanup call is removed
- **WHEN** mutation removes one pre-dispatch cancellation edge
- **THEN** the counter-conservation suite fails
