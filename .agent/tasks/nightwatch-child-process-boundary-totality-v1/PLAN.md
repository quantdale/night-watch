# Child process boundary totality proposal

## Purpose

Convert NW-AUD-014 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No launcher implementation, subprocess campaign, DEV/authenticated call, or network.

## Safety Constraints

LOCAL / READ-ONLY source evidence; planning writes only.

## Architecture / Approach

Syntax-discover invocation authority, classify every call into a closed
profile, enforce explicit minimal environments/exact executables/resource
bounds, and prove representative processes plus mutations.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: invocation census, hardening rule, violating callers, and prior specs inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/execution not in scope.

## Validation Strategy

`openspec validate nightwatch-child-process-boundary-totality-v1 --strict`.

## Decision Log

- 2026-09-20 — Classify invocation nodes, not a manual file list.
- 2026-09-20 — Offline profiles prohibit package acquisition and ambient credentials.

## Discoveries

- The global hardening pass rejects shell-capable APIs but not missing env/time/output controls.
- Some highest-risk bypasses sit outside the literal launcher list.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no authority-bearing process run.
