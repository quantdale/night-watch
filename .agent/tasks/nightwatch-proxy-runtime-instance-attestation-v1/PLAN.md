# Proxy runtime instance attestation proposal

## Purpose

Convert NW-AUD-016 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No proxy/runtime implementation, browser launch, or external network.

## Safety Constraints

LOCAL / READ-ONLY source evidence; planning writes only.

## Architecture / Approach

Bind lease, listener, process start, environment, static policies, event generation, state publication, active health challenge, consumer handle, and revocation into one exact runtime instance.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: runtime state, health, server startup, lease, browser gate/liveness, tests, and prior resolved-egress identity work inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/runtime execution not in scope.

## Validation Strategy

`openspec validate nightwatch-proxy-runtime-instance-attestation-v1 --strict`.

## Decision Log

- 2026-09-20 — Static version fields and status-only health are not live-instance proof.
- 2026-09-20 — Bind browser admission and event observation to one attested handle.

## Discoveries

- A syntactically valid state file plus unrelated 204 listener satisfies current health.
- State/event writers use direct path publication without a private instance generation.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no external/authenticated runtime action.
