# Production budget reservation lifecycle integrity proposal

## Purpose

Convert NW-AUD-033 into an apply-ready planning change.

## Starting State

Parent audit static evidence at the frozen starting SHA; production remains unauthorized.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation, observer run, production contact, or policy expansion.

## Safety Constraints

LOCAL / MOCK / READ-ONLY inspection only.

## Architecture / Approach

Use exact ledger capabilities and an explicit conserved lifecycle across reserve, cancel, dispatch, and settle.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: gate ordering, return paths, settlement, and reachability inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-production-budget-reservation-lifecycle-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Occupancy release and request quota are separate accounting decisions.
- 2026-09-21 — Settlement requires the exact dispatched capability.

## Discoveries

- Current production reachability is mock/local only; the defect is retained authority-path integrity.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero production activity.
