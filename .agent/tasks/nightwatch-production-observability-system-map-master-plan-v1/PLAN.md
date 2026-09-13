# Nightwatch production observability system map (parked)

## Purpose

Park the active `nightwatch-production-observability-system-map-master-plan-v1`
change with an explicit BLOCKED continuity-v2 record so the change↔task
integrity check can enforce that no active change is task-less.

## Starting State

- The change is active in `openspec/changes/` with 10 open boxes.
- The `nightwatch-open-spec-truth-closure-v1` campaign has no authorization
  to execute observability work.

## Scope

None. This is a record, not a work plan.

## Non-Goals

All production-observability implementation.

## Safety Constraints

No implementation, no session, no box tick.

## Architecture / Approach

None; the record exists for continuity bookkeeping only.

## Milestones

- [ ] M0 — never started; requires a future owner-authorised campaign.

## Validation Strategy

`npm run agent:check` must accept this parked record as BLOCKED.

## Decision Log

- 2026-09-14 — Park rather than execute. Reason: outside this campaign's
  authorization; the integrity check requires a record, not a session.

## Discoveries

None.

## Deferred Work

The entire production-observability master plan.

## Completion Criteria

None; this task is BLOCKED and terminal as a park record.
