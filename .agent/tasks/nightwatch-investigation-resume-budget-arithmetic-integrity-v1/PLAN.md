# Investigation resume budget-arithmetic integrity proposal

## Purpose

Convert NW-AUD-045 into an apply-ready planning change.

## Starting State

Parent M5 static evidence; no campaign executed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Count in-flight spend once; keep remainder derivation for zero-usage starts only.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: remainingPolicyFor, pause prefix, resume restore inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-investigation-resume-budget-arithmetic-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Fresh remainder plus restored usage is double subtraction.
- 2026-09-21 — consecutiveFailures is a streak, not a spend.

## Discoveries

- The pause comment documents re-applying in-flight spend to the remainder basis while runtime also restores it.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
