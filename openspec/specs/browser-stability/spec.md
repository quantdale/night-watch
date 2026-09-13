# browser-stability Specification

## Purpose

The System Map browser workflow SHALL keep keyboard navigation honest: each navigation step acts only after its target member is observably rendered, and the browser suite proves the gates against the live view.

## Requirements
### Requirement: 6d: L2 arrows require L2 members

After the query-clearing Escapes, the test MUST observe an L2 member
node button before pressing ArrowDown. The `Product: ripple` breadcrumb
crumb is trail-derived and commits before the refetched members; arrows
pressed in that window move no selection.

#### Scenario: ArrowDown waits for an L2 member node button
- **WHEN** the query-clearing Escapes have been fired
- **THEN** the test MUST observe an L2 member node button before pressing ArrowDown

### Requirement: 6e: L4 press requires L4-op-0 members

After drilling into the operation, the test MUST observe L4-op-0-specific
UI — the `Operation: GET /v1/op-0` breadcrumb crumb AND the consumer
member button — before pressing ArrowRight. The `map-authority` footer is
level-identical and cannot gate navigation; a press processed against the
pre-drill L3 member list selects `op:op-1`, which falls outside the L4
view and empties the detail panel permanently for that run.

#### Scenario: ArrowRight waits for L4-op-0-specific UI
- **WHEN** the operation has been drilled into
- **THEN** the test MUST observe the `Operation: GET /v1/op-0` breadcrumb crumb AND the consumer member button before pressing ArrowRight

### Requirement: 6e-query: step-7 click requires the UI_CONTROL answer

After firing the UI-control query, the test MUST observe the
answer-specific node bound (`limit 1000`) before clicking
`Mutation-capable routes`. The `map-authority` footer is
query-identical and cannot gate the answer commit; the click otherwise
races the answer render.

#### Scenario: the step-7 click waits for the UI_CONTROL answer
- **WHEN** the UI-control query has been fired
- **THEN** the test MUST observe the answer-specific node bound (`limit 1000`) before clicking `Mutation-capable routes`

