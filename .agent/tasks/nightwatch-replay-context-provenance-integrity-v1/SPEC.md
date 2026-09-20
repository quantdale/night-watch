# Replay context provenance integrity proposal

## Task purpose

Create and strict-validate an implementation-ready remediation for NW-AUD-025 without executing a replay.

## Established starting state

- Admission counts distinct run IDs and ignores `contextKind` and actual context generation.
- The manual Phase 2C producer has a tautological context-kind branch.
- Replay compares several strong channels only when both operands define them.
- Current tests cover intended role order, not relabel/reuse/missing-evidence negatives.

## Required deliverables

Proposal, design, capability spec, implementation checklist, and completed planning continuity.

## Non-goals

No implementation, replay execution, browser/API target, or promotion.

## Safety constraints

Planning and read-only current-source evidence only.

## Declared Deletions

None.

## Acceptance criteria

Four OpenSpec artifact classes strict-valid; implementation tasks out of scope.
