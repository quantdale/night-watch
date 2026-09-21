# Investigation resume budget-arithmetic integrity proposal

## Task purpose

Create and strict-validate the remediation for NW-AUD-045 without implementation.

## Established starting state

- Fresh investigations correctly receive a remainder policy and zero usage.
- Pause persists prefix-only campaign usage and an in-flight investigation checkpoint with absolute usage.
- Resume subtracts in-flight usage from the remainder and restores the same usage into AgentRuntime.

## Required deliverables

Proposal, design, capability spec, checklist, and completed planning continuity.

## Non-goals

No implementation, ceiling change, real campaign, or provider-identity work.

## Safety constraints

Planning and read-only Nightwatch source evidence only.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
