# Phase-5 relay invocation authority proposal

## Purpose

Convert NW-AUD-028 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No implementation or relay execution.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Bind every relay effect to an opaque exact caller/operation capability, consume bounded authority atomically, and preserve append-only invocation truth.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: relay, generator/profile, L6/native/manual callers, observations, tests, and adjacent proposals inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-phase5-relay-invocation-authority-v1 --strict`.

## Decision Log

- 2026-09-21 — Operation identity proves shape/semantics, not caller authority.
- 2026-09-21 — Budget reservation precedes credential and upstream effects.
- 2026-09-21 — Repeated invocations remain distinct ledger entries.

## Discoveries

- L6 has its own bounded parent-relay calls, but the Phase-5 loopback listener itself remains publicly invocable within the host namespace.
- Response-body elision limits data disclosure but does not prevent unauthorized authenticated read effects or load.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and zero relay/target activity.
