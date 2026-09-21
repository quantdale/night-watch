# Control Center finding-status projection integrity proposal

## Task purpose

Create and strict-validate the remediation for NW-AUD-048 without implementation.

## Established starting state

- Findings DTO has READY/INCOMPLETE/UNAVAILABLE/UNKNOWN.
- Adapter maps `status === 'READY' ? 'READY' : 'INCOMPLETE'`.
- Protocol false-READY is owned by NW-AUD-029; this change owns summary projection.

## Required deliverables

Proposal, design, capability spec, checklist, and completed planning continuity.

## Non-goals

No implementation, private findings I/O, or protocol-readiness rewrite.

## Safety constraints

Planning and read-only Nightwatch source evidence only.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
