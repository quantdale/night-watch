# Change-intelligence source-generation integrity proposal

## Purpose

Convert NW-AUD-043 into an apply-ready planning change.

## Starting State

Parent M4 static evidence; no sibling repository or campaign accessed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or external/runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Exact-validate ChangeSets and bind dependency maps to the complete actual source interval.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: collector, combiner, map, selector, real/manual/shadow callers, and tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-change-intelligence-source-generation-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Configured pin equality is not an observation of the selection range.
- 2026-09-21 — Unproven map-to-range continuity triggers bounded all-canary fallback.

## Discoveries

- The real campaign builds a tracking-SHA-to-HEAD range while default selection never compares either SHA to the map generation.

## Deferred Work

All implementation checklist items; unreachable baseline advancement remains non-authoritative.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
