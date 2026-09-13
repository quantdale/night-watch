# system-map-v2-transport Specification

## Purpose

Every System Map V2 transport answer SHALL grant no execution authority and no mutation authority, exposing the model to operators without widening the safety kernel.

## Requirements
### Requirement: the transport grants no authority
Every V2 transport answer SHALL grant no execution authority and no mutation authority.

#### Scenario: any level or query is fetched
- **WHEN** any V2 level or query answer is produced
- **THEN** it SHALL carry `executionAuthority: NONE` and `mutationAuthority: NONE`

#### Scenario: a mutating verb is attempted
- **WHEN** any verb other than GET or HEAD is sent to a V2 route
- **THEN** the request SHALL be rejected

### Requirement: unknown addresses are rejected, not guessed
An unknown address SHALL be rejected and SHALL never be guessed or matched to a nearest address.

#### Scenario: an unknown level segment
- **WHEN** a level outside `l1`..`l4` is requested
- **THEN** the route SHALL parse to `unknown`

#### Scenario: an unknown query segment
- **WHEN** a query segment outside the eight known queries is requested
- **THEN** the route SHALL parse to `unknown` and SHALL NOT match a nearest segment

#### Scenario: a traversal attempt
- **WHEN** a path contains `..`
- **THEN** it SHALL be rejected before any lookup

#### Scenario: a v1 path
- **WHEN** `/api/v1/source/graph` is requested
- **THEN** it SHALL still route to the v1 source graph, unaffected by V2 parsing

### Requirement: focus discipline
The transport SHALL enforce focus discipline at every level.

#### Scenario: a focus at the company level
- **WHEN** L1 is requested with a focus
- **THEN** the result SHALL be null

#### Scenario: a missing focus below the company level
- **WHEN** L2, L3 or L4 is requested without a focus
- **THEN** the result SHALL be null

### Requirement: bounds survive the wire with their unknowns intact
A transported bound SHALL preserve its unknowns as unknown.

#### Scenario: the population total is unknown
- **WHEN** the upstream operation population total is null and the projection truncates
- **THEN** the transported bound SHALL carry `total: null`, `dropped: null` and `remainingUnknown: true`

#### Scenario: an unknown total is displayed
- **WHEN** a bound with a null total or a null dropped count is rendered
- **THEN** the UI SHALL display "unknown" and SHALL NOT display `0`

### Requirement: absence of measurement is not a clean result
An unmeasured result SHALL be presented as not measured and SHALL never be presented as a clean result.

#### Scenario: an unmeasured query returns nothing
- **WHEN** a query answer carries `measurement: UNMEASURED` and zero nodes
- **THEN** the UI SHALL state that the result was not measured, and SHALL NOT present the emptiness as a clean result

### Requirement: disclosure is progressive at the transport
Disclosure at the transport SHALL be progressive, one requested level at a time.

#### Scenario: the operator views one level
- **WHEN** the UI displays a disclosure level
- **THEN** it SHALL request that level alone, and SHALL NOT fetch a whole-company payload to filter client-side

