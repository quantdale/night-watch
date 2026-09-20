# Phase-5 relay invocation authority proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-028 without starting a relay or contacting any target.

## Established starting state

- Inbound authority is only URL/header equality for a public catalog operation ID.
- Any local process knowing the port/ID can trigger eligible reads and credential acquisition while the relay is live.
- No relay-level per-operation/total/concurrency invocation budget exists.
- Observation storage overwrites repeated calls by operation ID.
- Existing tests cover request shape/semantics, not caller authority, replay, races, or budgets.

## Required deliverables

Proposal, design, capability spec, implementation checklist, and completed planning continuity.

## Non-goals

No implementation, relay/process execution, credential access, DEV/production contact, or catalog expansion.

## Safety constraints

Planning and read-only current-source evidence only.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
