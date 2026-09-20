# Browser context guard transaction integrity proposal

## Purpose

Convert NW-AUD-023 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No runtime implementation or browser execution.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Use one staged startup/teardown transaction and one exact per-page guard-admission path.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: constructor, guard ordering, popup callback, teardown, tests, and adjacent proposals inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-browser-context-guard-transaction-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Context startup and teardown share one transaction coordinator.
- 2026-09-21 — Every page generation is withheld until its exact mandatory guard is ready.

## Discoveries

- Partial construction can leave browser resources and the proxy poll alive.
- Popup guard installation is fire-and-forget and its rejection is not escalated.
- URL pre-validation tests do not establish post-creation transactional cleanup.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero browser activity.
