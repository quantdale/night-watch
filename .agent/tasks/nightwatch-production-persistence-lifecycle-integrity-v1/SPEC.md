# Production persistence lifecycle integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-027 without production contact or mutation of owner data.

## Established starting state

- Profile cleanup recursively deletes any absolute basename with the expected prefix; sweep trusts prefix and age.
- Finding publication can replace an existing file, race its capacity check, and reports success without directory durability.
- Persistence traversal skips missing/unreadable entries and silently truncates at 20,000 files while clean depends only on recorded violations.
- Real production execution remains separately owner-gated/frozen.

## Required deliverables

Proposal, design, capability spec, implementation checklist, and completed planning continuity.

## Non-goals

No implementation, production/DEV contact, owner-store mutation, or policy expansion.

## Safety constraints

Planning and read-only current-source evidence only; later proof uses disposable local roots.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
