# Schema preservation integrity proposal

## Purpose

Convert NW-AUD-013 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no data-operation authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No owner-record read/write beyond static source inspection; no implementation.

## Safety Constraints

LOCAL / READ-ONLY source evidence; planning writes only.

## Architecture / Approach

Account for every export candidate, distinguish complete/partial/refused,
publish through identity-confined durable primitives, and prove migration
source/destination distinction plus post-write original retention.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: CLI/export/migration/tests/prior contracts inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/data operations not in scope.

## Validation Strategy

`openspec validate nightwatch-schema-preservation-integrity-v1 --strict`.

## Decision Log

- 2026-09-20 — Partial preservation never authorizes migration or ORPHAN.
- 2026-09-20 — Original retention is post-write evidence, not a constant.

## Discoveries

- CLI pre-slicing makes the builder's current truncation flag unreachable.
- Different path strings do not prove different filesystem objects.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no data operation run.
