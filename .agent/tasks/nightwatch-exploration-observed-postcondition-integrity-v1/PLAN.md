# Exploration observed postcondition integrity proposal

## Purpose

Convert NW-AUD-026 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No implementation or real exploration.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Replace expected-value injection with bounded source-backed before/after observations and observation-derived transitions.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: catalog, real runtime, engine, exact replay, tests, and adjacent proposals inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-exploration-observed-postcondition-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Expected values are predicates only and cannot be runtime observations.
- 2026-09-21 — An action without a safe source-backed postcondition remains unavailable.

## Discoveries

- Current real-runtime structural contract verification is tautological.
- Network settlement cannot prove local UI state and can disagree with it.
- False state can cascade into coverage, novelty, replay, and later precondition eligibility.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero campaign activity.
