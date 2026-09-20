# Private payload screening structural integrity proposal

## Purpose

Convert NW-AUD-019 into an apply-ready planning change.

## Starting State

Parent audit evidence at the frozen starting SHA; no execution authority.

## Scope

OpenSpec artifacts and completed planning continuity only.

## Non-Goals

No store/reader implementation or real private data.

## Safety Constraints

LOCAL / READ-ONLY and synthetic-string evidence; planning writes only.

## Architecture / Approach

Validate bounded structure against closed family DTOs before serialization; retain canonicalized text regexes only as defense in depth; independently revalidate at readers/writers.

## Milestones

### M0 — Evidence and deduplication
- Status: COMPLETE
- Acceptance: shared screen, stores/readers, tests, and production privacy scope inspected; synthetic regex probe reproduced.

### M1 — OpenSpec artifacts
- Status: COMPLETE
- Acceptance: proposal, design, capability spec, and tasks complete.

### M2 — Planning validation
- Status: COMPLETE
- Acceptance: strict-valid; implementation/private-data execution not in scope.

## Validation Strategy

openspec validate nightwatch-private-payload-screening-structural-integrity-v1 --strict.

## Decision Log

- 2026-09-20 — Serialized text regex is not structural admission.
- 2026-09-20 — Private durable APIs require family-specific safe DTOs.

## Discoveries

- Ordinary quoted token/password/customer object fields all pass the canonical screen.
- Current tests prove sentinel rejection, not labeled structural rejection.

## Deferred Work

All implementation checklist items.

## Completion Criteria

Planning complete, strict-valid, unimplemented, and no real private data.
