# Run evidence bundle transaction integrity proposal

## Purpose

Convert NW-AUD-024 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No evidence implementation or runtime campaign.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Replace mixed direct writes and process-memory truth with one exclusive, bounded, crash-consistent journal generation and derived views.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: recorder, observers, tests, readers, and adjacent persistence proposals inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-run-evidence-bundle-transaction-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Existing run generations are never reused or truncated.
- 2026-09-21 — The durable journal, not memory or a summary view, is terminal authority.

## Discoveries

- Same-ID construction can pair a new manifest with old appended events.
- Manifest corruption is silently erased.
- A mirror failure can persist an event that final summary memory does not contain.
- Observer exception swallowing can convert storage loss into apparent runtime success.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero campaign activity.
