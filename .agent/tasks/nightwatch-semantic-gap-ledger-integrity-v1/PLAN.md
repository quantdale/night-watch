# Semantic gap-ledger integrity proposal

## Purpose

Convert NW-AUD-042 into an apply-ready planning change.

## Starting State

Parent M4 static evidence; no campaign or ledger execution performed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or external/runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Make the current gap census lossless and require typed evidence for every closure transition.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: graph, normalization, ledger, quality/plans, and focused tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-semantic-gap-ledger-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — A disappeared gap requires a proven transition, not automatic obsolescence.
- 2026-09-21 — Current census and historical transition history are separate populations.

## Discoveries

- Rebuild iterates only baseline records, so a new graph gap can be absent from the emitted ledger.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
