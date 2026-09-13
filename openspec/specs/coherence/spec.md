# coherence Specification

## Purpose

The planning and explanation surfaces SHALL be coherent: every member id emitted by `plan --json` resolves in `explain <member-id> --json` with identical identity, priority components, and gates.

## Requirements
### Requirement: Plan-emitted ids must explain

Every member id emitted by `plan --json` MUST resolve in
`explain <member-id> --json` with the identical `requestedId`,
explanation `PRIORITY_COMPONENTS_AND_GATES`, and a non-null item.
The `campaign` phase20 plan is a separate namespace and stays out of
this contract by design.

#### Scenario: a plan-emitted member id resolves in explain
- **WHEN** `plan --json` emits a member id
- **THEN** `explain <member-id> --json` MUST resolve it with the identical `requestedId`, explanation `PRIORITY_COMPONENTS_AND_GATES`, and a non-null item

