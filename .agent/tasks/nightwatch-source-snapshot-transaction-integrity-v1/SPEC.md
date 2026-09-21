# Source snapshot transaction integrity proposal

## Task purpose

Create and strict-validate the remediation for NW-AUD-036 without implementation.

## Established starting state

- Source inventory does not close its HEAD observation interval.
- The call-scoped view returns digest-mismatched bytes and route parsing does not revalidate them.
- Phase 24 snapshot-match truth is asserted rather than derived.
- Path ancestry checks and later pathname operations are not one held identity.

## Required deliverables

Proposal, design, capability spec, checklist, and completed planning continuity.

## Non-goals

No source implementation, sibling reads, authority expansion, or DEV semantic execution.

## Safety constraints

Planning and read-only Nightwatch source evidence only; future tests remain synthetic and contained.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
