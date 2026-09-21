# Semantic partial-observation soundness proposal

## Purpose

Convert NW-AUD-039 into an apply-ready planning change.

## Starting State

Parent M4 static evidence; no semantic execution performed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or external/runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Replace binary partial comparison with total completeness semantics and propagate it through every consumer.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: projections, invariant evaluators, runner, coverage relations, and focused tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-semantic-partial-observation-soundness-v1 --strict`.

## Decision Log

- 2026-09-21 — Unknown tails never prove whole-population equality or absence.
- 2026-09-21 — Visible monotonic violations remain distinguishable from incomplete success.

## Discoveries

- A collection of items whose field check is always NOT_APPLICABLE can currently become FULLY_EVALUATED_PASS.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
