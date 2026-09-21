# Semantic coverage evidence authority proposal

## Purpose

Convert NW-AUD-041 into an apply-ready planning change.

## Starting State

Parent M4 static evidence; no campaign or lifecycle execution performed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or external/runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Replace caller-asserted lifecycle facts with exact producer-bound receipts and independent replay/minimization.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: discovery, contracts, graph, campaign, mutation, lifecycle, quality, cache, and tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-semantic-coverage-evidence-authority-v1 --strict`.

## Decision Log

- 2026-09-21 — A serialized boolean or digest is not lifecycle execution evidence.
- 2026-09-21 — Detection, replay, minimization, and confidence remain distinct stages.

## Discoveries

- Mutation measurement defaults missing lifecycle evidence to successful replay, minimization, and high confidence.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
