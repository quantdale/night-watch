# Replay context provenance integrity proposal

## Purpose

Convert NW-AUD-025 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No implementation or real replay.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Bind admission to minted context generations and make complete current-schema evidence mandatory for a match.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: admission, replay parser/comparator, manual/campaign producers, tests, and adjacent proposals inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-replay-context-provenance-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Run IDs and role strings are labels, not context proof.
- 2026-09-21 — Simultaneous absence of a mandatory channel is incomplete evidence, not equality.

## Discoveries

- Three wrong-kind observations with distinct labels can currently reach L2.
- A partial pair can match because missing strong fields are conditionally skipped.
- Campaign/manual producers do not carry an unforgeable context generation.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero replay activity.
