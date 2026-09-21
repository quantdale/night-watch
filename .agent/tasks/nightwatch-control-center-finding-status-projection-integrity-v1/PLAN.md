# Control Center finding-status projection integrity proposal

## Purpose

Convert NW-AUD-048 into an apply-ready planning change.

## Starting State

Parent M6 static evidence; no Control Center server started.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or runtime activity.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Project the full status vocabulary; consume readiness rather than copying status strings.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE

### M1 — OpenSpec artifacts
- Status: COMPLETE

### M2 — Planning validation
- Status: COMPLETE

## Validation Strategy

`openspec validate nightwatch-control-center-finding-status-projection-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — Boolean READY is not a status mapping.
- 2026-09-21 — Protocol readiness stays NW-AUD-029; this change consumes it.

## Discoveries

- Privacy-elided rows currently vanish instead of UNAVAILABLE.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
