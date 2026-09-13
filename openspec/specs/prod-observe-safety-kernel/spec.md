# prod-observe-safety-kernel Specification

## Purpose

Every earlier production-observability campaign built a component. C-11 builds the thing that decides. Its whole value is that Nightwatch becomes **incapable** of issuing a production request unless every required machine authority grants it — and that the incapability is demonstrated rather than asserted.

## Requirements
### Requirement: Production remains non-loadable through ordinary environment selection

C-11 SHALL NOT make production a selectable environment.

#### Scenario: D-4 intact

- **WHEN** `SUPPORTED_ENVIRONMENTS` is inspected
- **THEN** it SHALL contain exactly `local`, `dev` and `next`
- **AND** `config/environments/production.json` SHALL remain unloadable by name validation
- **AND** the D-4 decision text SHALL be present and unweakened

### Requirement: `PROD_OBSERVE` is a distinct, consumable authorization class
`PROD_OBSERVE` SHALL be a distinct, consumable authorization class.

#### Scenario: Not aliased

- **WHEN** a `PROD_OBSERVE` grant is presented to any DEV, NEXT, replay,
  authenticated-browsing or generic real-run authority
- **THEN** that authority SHALL NOT accept it

#### Scenario: One-shot

- **WHEN** a consumed grant is presented again
- **THEN** admission SHALL deny with `ALREADY_CONSUMED`

#### Scenario: Expired or out-of-scope

- **WHEN** the grant is expired, or scoped to a different campaign
- **THEN** admission SHALL deny

### Requirement: The production decision path is separate from the DEV/NEXT one
The production decision path SHALL be separate from the DEV/NEXT decision path.

#### Scenario: `realRunGate` gains nothing

- **WHEN** `src/core/safety/realRunGate.ts` is inspected
- **THEN** it SHALL contain no production-permitting path and no mode parameter

#### Scenario: Import-graph separation

- **WHEN** the production cone imports the DEV campaign orchestrator, the DEV
  environment loader, the NEXT execution path or the generic real-run decision
  path — or the DEV/NEXT cone imports the production policy, launcher or
  authorization machinery
- **THEN** `hardening:check` SHALL fail

#### Scenario: Missing policy denies

- **WHEN** a shared module is used without an explicitly injected policy
- **THEN** it SHALL throw rather than apply a default

### Requirement: The production allowlist is independent of the deny table
The production allowlist SHALL be independent of the deny table.

#### Scenario: Deny table never inverted

- **WHEN** the production policy module imports `KNOWN_PRODUCTION_HOSTS`
- **THEN** `hardening:check` SHALL fail

#### Scenario: Admission requires explicit presence

- **WHEN** a host is absent from the external observation allowlist
- **THEN** `G_HOST_ADMISSION` SHALL deny, regardless of the deny table

### Requirement: Production observation configuration is external-only
Production observation configuration SHALL be external-only.

#### Scenario: Integrity requirements

- **WHEN** the configuration path is relative, inside the Nightwatch
  repository, inside the Alphaus workspace, a symlink, not a regular file, or
  not owner-only `0600`
- **THEN** `G_CONFIGURATION_INTEGRITY` SHALL deny

### Requirement: The admission chain is versioned, named and ordered
The admission chain SHALL be versioned, named and ordered.

#### Scenario: Identity, not count

- **WHEN** a qualification receipt omits, duplicates, reorders or adds a gate
- **THEN** validation SHALL fail closed on gate identity

#### Scenario: Every gate individually falsifiable

- **WHEN** exactly one gate's precondition is invalidated while all others hold
- **THEN** qualification SHALL deny with that gate's categorical reason

### Requirement: No request reaches production unless every gate allows it
No request SHALL reach production unless every gate allows it.

#### Scenario: Zero contact before dispatch

- **WHEN** denial occurs before dispatch
- **THEN** the mock server's received-request count SHALL be zero

#### Scenario: Kill switch after qualification

- **WHEN** qualification succeeds, the kill switch then engages, and dispatch is
  attempted
- **THEN** no request SHALL reach the mock server
- **AND** no cached ALLOW SHALL survive the revocation

### Requirement: Route authority is mechanically source-bound
Route authority SHALL be mechanically source-bound.

#### Scenario: Forged capability

- **WHEN** the route capability is a caller-supplied enum, an arbitrary digest,
  an arbitrary route list, a JSON-revived object or a test-only vocabulary
- **THEN** `G_ROUTE_AUTHORITY` SHALL deny

### Requirement: Concrete parameter values never leave the request builder
Concrete parameter values SHALL never leave the request builder.

#### Scenario: Sentinel containment

- **WHEN** a synthetic sentinel value is planted in a request parameter
- **THEN** it SHALL appear in no receipt, log, budget key, replay key,
  fingerprint, error, checkpoint or persisted record

### Requirement: Budgets are reserved before dispatch and never oversubscribed
Budgets SHALL be reserved before dispatch and never oversubscribed.

#### Scenario: Race safety

- **WHEN** concurrent workers contend for the last unit of budget
- **THEN** at most the budgeted number of reservations SHALL be granted

#### Scenario: Consumed on reservation

- **WHEN** a dispatched request fails
- **THEN** its reservation SHALL NOT be refunded

### Requirement: Breakers are terminal
Breakers SHALL be terminal.

#### Scenario: No later request

- **WHEN** any breaker has opened
- **THEN** every subsequent admission SHALL deny

### Requirement: Authenticated state is never mutated by a production response
Authenticated state SHALL never be mutated by a production response.

#### Scenario: `Set-Cookie`

- **WHEN** a production response carries `Set-Cookie`
- **THEN** no persistent authenticated state SHALL be written
- **AND** `hardening:check` SHALL fail if a production
  `context.storageState()` persistence path exists

### Requirement: Containment state is reported, never assumed
Containment state SHALL be reported, never assumed.

#### Scenario: CI carve-out stays explicit

- **WHEN** the host cannot provide a rootless containment envelope
- **THEN** containment SHALL be reported as
  `NOT_EXERCISED_BWRAP_UNAVAILABLE` and SHALL NOT be promoted to `PROVEN`

### Requirement: Every C-11 certification suite is executed by the authoritative gate
Every C-11 certification suite SHALL be executed by the authoritative gate.

#### Scenario: Unregistered suite

- **WHEN** an intended C-11 certification suite belongs to no required
  quality-gate group
- **THEN** validation SHALL fail

