# Proxy evidence-effect ordering proposal

## Purpose

Convert NW-AUD-022 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No runtime implementation or product traffic.

## Safety Constraints

LOCAL / READ-ONLY inspection; planning writes only.

## Architecture / Approach

Insert a durable per-request preparation barrier before every upstream effect and preserve post-effect uncertainty as visible `INCOMPLETE` evidence.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: proxy handlers, event writer, failure tests, durable claims, and instance-attestation ownership inspected.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; runtime implementation not in scope.

## Validation Strategy

openspec validate nightwatch-proxy-evidence-effect-ordering-v1 --strict.

## Decision Log

- 2026-09-20 — Durable request preparation is a prerequisite of resolver/socket/pipe effects.
- 2026-09-20 — A missing post-effect terminal record is `INCOMPLETE`, never inferred clean.

## Discoveries

- All three proxy transport handlers begin their current effect before awaiting evidence recording.
- The existing write-failure test's destination is independently denied, so it does not prove the claimed ordering.
- Runtime instance identity and per-request evidence ordering are complementary, non-duplicate guarantees.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no traffic.
