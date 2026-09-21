# Semantic receipt acceptance integrity proposal

## Purpose

Convert NW-AUD-038 into an apply-ready planning change.

## Starting State

Parent M4 static evidence; no receipt or DEV execution performed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation, artifact mutation, browser/DEV contact, or authority expansion.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Unify strict receipt parsing, producer-bind contained evidence, and refuse acceptance over mixed evidence generations.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: builder, validator, artifact/DTO reader, hook, summary, acceptance, lifecycle, and tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-semantic-receipt-acceptance-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Contained evidence class is producer authority, not an enum input.
- 2026-09-21 — Acceptance may not compose identity and decisiveness across incompatible receipts.

## Discoveries

- The artifact facade recomputes receipt identity, but lifecycle and summary paths rely on the weaker direct validator or no validation.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero DEV/browser activity.
