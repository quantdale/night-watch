# Production persistence lifecycle integrity proposal

## Purpose

Convert NW-AUD-027 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No implementation or environment contact.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Bind cleanup to exact profile capabilities, publish findings immutably, and make audit completeness a prerequisite of CLEAN.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: profile, store, audit, tests, C-10 ownership, and adjacent proposals inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-production-persistence-lifecycle-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — A filename prefix is never recursive-delete authority.
- 2026-09-21 — Missing, skipped, unreadable, changed, or over-budget inventory is INCOMPLETE, not clean.
- 2026-09-21 — Findings are historical immutable records, not last-writer-wins snapshots.

## Discoveries

- The C-10 payload firewall is strong but does not own lifecycle/deletion/completeness semantics.
- Current tests prove ordinary cleanup and planted violation detection, not hostile path identity or census completeness.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero real-environment activity.
