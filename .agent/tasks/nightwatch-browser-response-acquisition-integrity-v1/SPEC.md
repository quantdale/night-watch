# Browser response acquisition integrity proposal

## Task purpose

Create and strict-validate the remediation for NW-AUD-035 without implementation.

## Established starting state

- Response bodies are fully buffered before the current size check.
- Timeout stops waiting but does not cancel or join the losing body read.

## Required deliverables

Proposal, design, capability spec, checklist, and completed planning continuity.

## Non-goals

No browser implementation, target contact, raw body retention, or authority expansion.

## Safety constraints

Planning and read-only Nightwatch source evidence only; future tests remain contained and synthetic.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
