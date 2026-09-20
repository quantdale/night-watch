# Run evidence bundle transaction integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-024 without creating runtime evidence outside planning fixtures.

## Established starting state

- A caller run ID selects a recursively created/reused directory; manifest truncates while event logs append.
- Manifest parse failure resets identity to an empty object.
- Multi-file writes and in-memory summary authority can diverge after partial failure.
- Direct writes lack bundle commit/recovery truth, and several observer callbacks swallow recorder failures.

## Required deliverables

Proposal, design, capability spec, implementation checklist, and completed planning continuity.

## Non-goals

No implementation, campaign execution, browser/API target, production store, or external publication.

## Safety constraints

Planning and read-only current-source evidence only.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
