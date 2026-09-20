# Phase 6 owner-scope quarantine integrity proposal

## Purpose

Convert NW-AUD-032 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; permanent owner freeze applies.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation, data query, or environment contact.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Enforce owner policy at each effect seam and replace structural authority with exact runtime capabilities.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: all Phase 6 source and callers inspected; current reachability classified compatibility/test-only.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-phase6-owner-scope-quarantine-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Injected invokers never replace the owner gate.
- 2026-09-21 — Synthetic capability is distinct and non-promotable.

## Discoveries

- No non-test production invoker is currently wired, reducing reachability but not repairing the retained authority API.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero datastore activity.
