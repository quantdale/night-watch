# Canonical promotion transaction serialization proposal

## Purpose

Convert NW-AUD-011 into an apply-ready plan without promotion authority.

## Starting State

Parent audit at the frozen starting SHA; implementation not authorized.

## Scope

OpenSpec and completed planning continuity only.

## Non-Goals

No canonical/private/Git mutation, adoption, implementation, or CI.

## Safety Constraints

LOCAL / READ-ONLY evidence; planning writes only.

## Architecture / Approach

Serialize by repository/checkpoint/target rather than approval; journal every
stage; revalidate under authority; require file/directory durability; reconcile
by observation only; test distinct approvals and crash boundaries.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: apply/storage/renderer/tests/authority records inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation not in scope.

## Validation Strategy

`openspec validate nightwatch-canonical-promotion-transaction-serialization-v1 --strict`.

## Decision Log

- 2026-09-20 — Global target transaction precedes approval consumption.
- 2026-09-20 — Interruption recovery never spends a second source write.
- 2026-09-20 — Directory durability is required, not best effort.

## Discoveries

- Current tests reject repeated use of one approval but do not race distinct approvals.
- A consumed marker has no durable per-operation source-write outcome chain.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no authority granted.
