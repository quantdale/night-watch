# Authentication capability bundle transaction integrity proposal

## Purpose

Convert NW-AUD-015 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No writer/reader implementation, auth capture, credential access, or external network.

## Safety Constraints

LOCAL / READ-ONLY source evidence; planning writes only.

## Architecture / Approach

Publish immutable state+record generations behind one durable current pointer, centralize every writer, preserve/recover the prior generation, and bind preflight to final consumption.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: direct capture, DEV refresh, lifecycle preflight, storage publication, tests, and existing F-21 ownership inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/auth execution not in scope.

## Validation Strategy

`openspec validate nightwatch-auth-capability-bundle-transaction-integrity-v1 --strict`.

## Decision Log

- 2026-09-20 — Treat state plus lifecycle record as an immutable generation, because two sequential renames cannot be atomic.
- 2026-09-20 — Require total writer census and final consumer revalidation.

## Discoveries

- DEV refresh has no lifecycle-record write.
- Direct capture can replace the previous valid state before sidecar failure.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no authentication/network action.
