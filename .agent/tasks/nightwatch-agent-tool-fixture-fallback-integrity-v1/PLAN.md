# Agent-tool fixture-fallback integrity proposal

## Purpose

Convert NW-AUD-046 into an apply-ready planning change.

## Starting State

Parent M5 static evidence; no atlas store accessed.

## Scope

OpenSpec artifacts and planning continuity only.

## Non-Goals

No implementation or owner-local atlas I/O.

## Safety Constraints

LOCAL / READ-ONLY Nightwatch inspection only.

## Architecture / Approach

Make Lane C fixture absence total ADAPTER_UNAVAILABLE.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: executeAgentTool adapters, agentTools tests, W7 session rule inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: all planning artifacts complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-agent-tool-fixture-fallback-integrity-v1 --strict`.

## Decision Log

- 2026-09-21 — W7 session is not the owner; Lane C defaults remain a distinct gap.
- 2026-09-21 — Source-only missing-fixture coverage is vacuous for atlas tools.

## Discoveries

- Hunt-mode and autonomy tests call executeAgentTool and can hit the defaults.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, and unimplemented.
