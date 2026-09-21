# Agent-tool fixture-fallback integrity proposal

## Task purpose

Create and strict-validate the remediation for NW-AUD-046 without implementation.

## Established starting state

- Source/map/evidence/oracle adapters refuse missing fixtures.
- `QUERY_BUG_ATLAS` and `QUERY_SYSTEM_ATLAS` default to synthetic corpora/overlays.
- The missing-fixture test covers only `INSPECT_SOURCE_SURFACE`.
- W7 session already refuses synthetic fallbacks.

## Required deliverables

Proposal, design, capability spec, checklist, and completed planning continuity.

## Non-goals

No implementation, atlas I/O, W7 rewrite, or DEV tools.

## Safety constraints

Planning and read-only Nightwatch source evidence only.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
