# placement-coverage Specification

## Purpose

The Control Center contract-coverage guard SHALL assert that every declared contract field appears inside a component that can receive its contract, or that its absence is a reasoned, staleness-checked exemption; and every field the UI fetches SHALL reach the view that owns it, or be declared unrendered with a reason an operator would accept.

## Requirements
### Requirement: Control Center placement coverage

The Control Center contract-coverage guard SHALL assert that every declared
contract field appears inside a component that can receive its contract, or
that its absence is a reasoned, staleness-checked exemption; and every field
the UI fetches SHALL reach the view that owns it, or be declared unrendered
with a reason an operator would accept.

#### Scenario: a field in the wrong place fails the guard

- GIVEN a contract field whose name occurs only in prose of a component that
  does not carry the contract
- WHEN placement coverage is checked
- THEN the field fails, because no carrier of its contract contains it
- AND the same field passing a file-level search does not satisfy the guard

#### Scenario: carriage follows the data

- GIVEN a paged list contract consumed through
  `usePagedCollection<TheContract, …>`
- WHEN the guard resolves carriers
- THEN the shared paged collection counts as a carrier for that contract
- AND a containment field such as `OverviewSnapshot.safety` carries
  `SafetySnapshot` into the components that read it

#### Scenario: an exemption is honest only while it is true

- GIVEN an exempt field
- WHEN the field becomes rendered in any carrier of a contract that declares it
- THEN the guard fails and the exemption must be removed
- AND an exempt entry naming no declared field also fails

#### Scenario: a server-truncated page says so

- GIVEN a paged snapshot whose `page.truncated` is true
- WHEN the list renders
- THEN the continuation control states that the server truncated the page
- AND the statement does not depend on inferring it from `nextCursor`

#### Scenario: an edge without both endpoints is counted, not dropped

- GIVEN a source-graph edge whose `fromNodeId` or `toNodeId` is outside the
  projection
- WHEN the source graph renders
- THEN the edge is counted as undrawn
- AND the footer separates drawn from received edges
- AND the absence is attributed to the projection, not to the system

#### Scenario: the fail-safe renders its declared fallback

- GIVEN the `PlaceholderView` fail-safe for a view id without a render branch
- WHEN it renders
- THEN it names the view and states that no snapshot is connected

#### Scenario: declared limits are not replaced by client defaults

- GIVEN the declared `meta.limits` for the Control Center
- WHEN the graph-limits card renders
- THEN it quotes the declared `maxGraphNodes` and `maxGraphEdges`
- AND no client constant is presented as the server's maximum

