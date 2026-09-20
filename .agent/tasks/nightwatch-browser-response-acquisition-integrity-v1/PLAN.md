# Browser response acquisition integrity proposal

## Purpose

Convert NW-AUD-035 into an apply-ready planning change.

## Starting State

Parent audit static evidence at the frozen starting SHA; browser authority remains contained.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation, browser launch, target contact, or runtime experiment.

## Safety Constraints

LOCAL / READ-ONLY inspection only.

## Architecture / Approach

Replace wait-only/full-buffer semantics with bounded cancellable acquisition owned by exact context generation.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: body caller, timeout, size check, lifecycle owner, and downstream consumer inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-browser-response-acquisition-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Whole-buffer postchecks are not acquisition limits.
- 2026-09-21 — Timed-out work must be aborted and joined before settlement.

## Discoveries

- Existing incomplete classification is downstream of the unsafe allocation and therefore does not provide containment.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero browser/target activity.
