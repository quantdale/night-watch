# Source snapshot transaction integrity proposal

## Purpose

Convert NW-AUD-036 into an apply-ready planning change.

## Starting State

Parent audit static evidence at the frozen starting SHA; no sibling repository was contacted.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation, sibling-source scan, filesystem race experiment, or runtime contact.

## Safety Constraints

LOCAL / READ-ONLY inspection of Nightwatch source only.

## Architecture / Approach

Replace per-call best-effort source checks with an admission-bound, race-resistant, closed transaction whose evidence governs analyzers, cache, and candidate projection.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: inventory, call-scoped reads, route parsing, boundary traversal, cache, adapter, callers, and focused tests inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-source-snapshot-transaction-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Mixed source generations cannot support current source authority.
- 2026-09-21 — Digest mismatch returns no analyzable bytes.
- 2026-09-21 — Real and synthetic boundary authority must be explicit.

## Discoveries

- The existing handler-mutation regression does not exercise the unguarded route parser.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero sibling/DEV activity.
