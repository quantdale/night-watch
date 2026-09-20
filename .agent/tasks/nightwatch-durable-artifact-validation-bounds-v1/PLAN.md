# Durable artifact validation bounds proposal

## Purpose

Convert NW-AUD-031 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or artifact ingestion.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Preflight bounded plain-data graphs, register per-kind maxima, normalize errors, and expose batch completeness.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: facade, DTO registry, leaf validators, and tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-durable-artifact-validation-bounds-v1 --strict`.

## Decision Log

- 2026-09-21 — Resource bounds are part of validation correctness.
- 2026-09-21 — Leaf exception text is not a safe public reason channel.

## Discoveries

- The DTO registry already has a safe-error normalizer, but the facade does not apply it to all leaf paths.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero artifact access.
